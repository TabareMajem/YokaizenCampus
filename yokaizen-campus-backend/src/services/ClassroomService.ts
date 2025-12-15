import { prisma } from '../utils/prisma';
import { getRedisClient } from '../utils/redis';

// Use getter to ensure client is initialized
const redis = {
  get smembers() { return getRedisClient().smembers.bind(getRedisClient()); },
  get hgetall() { return getRedisClient().hgetall.bind(getRedisClient()); },
  get hset() { return getRedisClient().hset.bind(getRedisClient()); },
  get expire() { return getRedisClient().expire.bind(getRedisClient()); },
  get sadd() { return getRedisClient().sadd.bind(getRedisClient()); },
  get srem() { return getRedisClient().srem.bind(getRedisClient()); },
  get del() { return getRedisClient().del.bind(getRedisClient()); }
};
import { generateAccessCode, generateAnonymousId } from '../utils/helpers';
import { AppError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { PhilosophyMode, GraphStatus, UserRole } from '@prisma/client';

// Types
interface CreateClassroomInput {
  teacherId: string;
  name: string;
  philosophyMode?: PhilosophyMode;
  anonymizeStudents?: boolean;
}

interface JoinClassroomInput {
  studentId: string;
  accessCode: string;
}

interface StudentStatus {
  status: GraphStatus;
  sentiment: number;
  nodeCount: number;
  lastActive: Date;
  raisedHand?: boolean;
  anonymousId?: string;
}

interface ClassroomLiveData {
  classroomId: string;
  studentCount: number;
  activeCount: number;
  students: Array<{
    id: string;
    displayName: string;
    status: GraphStatus;
    sentiment: number;
    nodeCount: number;
    raisedHand: boolean;
    lastActive: Date;
  }>;
  aggregates: {
    flowCount: number;
    stuckCount: number;
    idleCount: number;
    averageSentiment: number;
    averageNodeCount: number;
  };
}

interface GrantCreditsResult {
  students: string[];
  totalCredits: number;
}

export class ClassroomService {
  private readonly CLASSROOM_STATE_PREFIX = 'classroom:state:';
  private readonly STUDENT_STATUS_PREFIX = 'student:status:';
  private readonly RAISED_HANDS_PREFIX = 'classroom:hands:';
  private readonly STATE_TTL = 3600; // 1 hour

  /**
   * Create a new classroom
   */
  async createClassroom(input: CreateClassroomInput) {
    const { teacherId, name, philosophyMode = PhilosophyMode.JAPAN, anonymizeStudents = false } = input;

    // Verify teacher exists and has correct role
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { id: true, role: true, schoolId: true }
    });

    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    if (teacher.role !== UserRole.TEACHER && teacher.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only teachers can create classrooms');
    }

    // Generate unique access code
    let accessCode: string;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      accessCode = generateAccessCode();
      const existing = await prisma.classroom.findUnique({
        where: { accessCode }
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new AppError('Failed to generate unique access code', 500);
    }

    const classroom = await prisma.classroom.create({
      data: {
        teacherId,
        name,
        accessCode: accessCode!,
        currentPhilosophy: philosophyMode,
        isActive: true,
        anonymizeStudents,
        schoolId: teacher.schoolId
      },
      include: {
        teacher: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    // Initialize classroom state in Redis
    await this.initializeClassroomState(classroom.id);

    return classroom;
  }

  /**
   * Join a classroom as a student
   */
  async joinClassroom(input: JoinClassroomInput) {
    const { studentId, accessCode } = input;

    // Find classroom by access code
    const classroom = await prisma.classroom.findUnique({
      where: { accessCode: accessCode.toUpperCase() },
      include: {
        teacher: {
          select: { id: true, fullName: true }
        }
      }
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found. Check your access code.');
    }

    if (!classroom.isActive) {
      throw new ForbiddenError('This classroom is no longer active');
    }

    // Verify student exists
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true, fullName: true }
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    // Check if already joined
    const existingEnrollment = await prisma.classroomStudent.findUnique({
      where: {
        classroomId_studentId: {
          classroomId: classroom.id,
          studentId
        }
      }
    });

    if (existingEnrollment) {
      // Return existing enrollment
      return {
        classroom,
        enrollment: existingEnrollment,
        alreadyJoined: true
      };
    }

    // Generate anonymous ID if classroom is anonymized
    const anonymousId = classroom.anonymizeStudents ? generateAnonymousId() : null;

    // Create enrollment
    const enrollment = await prisma.classroomStudent.create({
      data: {
        classroomId: classroom.id,
        studentId,
        anonymousId
      }
    });

    // Initialize student status in Redis
    await this.initializeStudentStatus(classroom.id, studentId);

    // Create initial graph session for this classroom
    await prisma.graphSession.create({
      data: {
        userId: studentId,
        classroomId: classroom.id,
        nodes: [],
        connections: [],
        status: GraphStatus.IDLE,
        sentimentScore: 50
      }
    });

    return {
      classroom,
      enrollment,
      alreadyJoined: false
    };
  }

  /**
   * Get classroom by ID
   */
  async getClassroom(classroomId: string, requesterId: string) {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        teacher: {
          select: { id: true, fullName: true, email: true }
        },
        students: {
          include: {
            student: {
              select: { id: true, fullName: true, level: true, xp: true }
            }
          }
        },
        school: {
          select: { id: true, name: true }
        }
      }
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    // Check access
    const isTeacher = classroom.teacherId === requesterId;
    const isStudent = classroom.students.some(s => s.studentId === requesterId);
    const isAdmin = await this.isUserAdmin(requesterId);

    if (!isTeacher && !isStudent && !isAdmin) {
      throw new ForbiddenError('You do not have access to this classroom');
    }

    // If anonymized and requester is not teacher, mask names
    if (classroom.anonymizeStudents && !isTeacher && !isAdmin) {
      classroom.students = classroom.students.map(enrollment => ({
        ...enrollment,
        student: {
          ...enrollment.student,
          fullName: enrollment.anonymousId || 'Anonymous'
        }
      }));
    }

    return classroom;
  }

  /**
   * Get live classroom data for teacher dashboard
   */
  async getClassroomLiveData(classroomId: string, teacherId: string): Promise<ClassroomLiveData> {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        students: {
          include: {
            student: {
              select: { id: true, fullName: true }
            }
          }
        }
      }
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    if (classroom.teacherId !== teacherId) {
      const isAdmin = await this.isUserAdmin(teacherId);
      if (!isAdmin) {
        throw new ForbiddenError('Only the classroom teacher can view live data');
      }
    }

    // Get all student statuses from Redis
    const studentStatuses: Array<{
      id: string;
      displayName: string;
      status: GraphStatus;
      sentiment: number;
      nodeCount: number;
      raisedHand: boolean;
      lastActive: Date;
    }> = [];

    // Get raised hands set
    const raisedHands = await redis.smembers(`${this.RAISED_HANDS_PREFIX}${classroomId}`);
    const raisedHandsSet = new Set(raisedHands);

    for (const enrollment of classroom.students) {
      const statusKey = `${this.STUDENT_STATUS_PREFIX}${classroomId}:${enrollment.studentId}`;
      const statusData = await redis.hgetall(statusKey);

      const displayName = classroom.anonymizeStudents
        ? enrollment.anonymousId || 'Anonymous'
        : enrollment.student.fullName;

      if (Object.keys(statusData).length > 0) {
        studentStatuses.push({
          id: enrollment.studentId,
          displayName,
          status: (statusData.status as GraphStatus) || GraphStatus.IDLE,
          sentiment: parseInt(statusData.sentiment) || 50,
          nodeCount: parseInt(statusData.nodeCount) || 0,
          raisedHand: raisedHandsSet.has(enrollment.studentId),
          lastActive: statusData.lastActive ? new Date(statusData.lastActive) : new Date()
        });
      } else {
        // Default status for inactive students
        studentStatuses.push({
          id: enrollment.studentId,
          displayName,
          status: GraphStatus.IDLE,
          sentiment: 50,
          nodeCount: 0,
          raisedHand: false,
          lastActive: new Date(enrollment.joinedAt)
        });
      }
    }

    // Calculate aggregates
    const now = Date.now();
    const activeThreshold = 5 * 60 * 1000; // 5 minutes
    const activeStudents = studentStatuses.filter(
      s => now - s.lastActive.getTime() < activeThreshold
    );

    const aggregates = {
      flowCount: studentStatuses.filter(s => s.status === GraphStatus.FLOW).length,
      stuckCount: studentStatuses.filter(s => s.status === GraphStatus.STUCK).length,
      idleCount: studentStatuses.filter(s => s.status === GraphStatus.IDLE).length,
      averageSentiment: studentStatuses.length > 0
        ? Math.round(studentStatuses.reduce((sum, s) => sum + s.sentiment, 0) / studentStatuses.length)
        : 50,
      averageNodeCount: studentStatuses.length > 0
        ? Math.round(studentStatuses.reduce((sum, s) => sum + s.nodeCount, 0) / studentStatuses.length)
        : 0
    };

    return {
      classroomId,
      studentCount: classroom.students.length,
      activeCount: activeStudents.length,
      students: studentStatuses,
      aggregates
    };
  }

  /**
   * Update student status (called from WebSocket)
   */
  async updateStudentStatus(
    classroomId: string,
    studentId: string,
    status: Partial<StudentStatus>
  ) {
    const statusKey = `${this.STUDENT_STATUS_PREFIX}${classroomId}:${studentId}`;

    const updates: Record<string, string> = {
      lastActive: new Date().toISOString()
    };

    if (status.status) updates.status = status.status;
    if (status.sentiment !== undefined) updates.sentiment = status.sentiment.toString();
    if (status.nodeCount !== undefined) updates.nodeCount = status.nodeCount.toString();

    await redis.hset(statusKey, updates);
    await redis.expire(statusKey, this.STATE_TTL);

    // Update graph session in database periodically (debounced by caller)
    if (status.status) {
      await prisma.graphSession.updateMany({
        where: {
          userId: studentId,
          classroomId
        },
        data: {
          status: status.status as GraphStatus,
          sentimentScore: status.sentiment,
          updatedAt: new Date()
        }
      });
    }
  }

  /**
   * Raise hand for help
   */
  async raiseHand(classroomId: string, studentId: string) {
    const handsKey = `${this.RAISED_HANDS_PREFIX}${classroomId}`;
    await redis.sadd(handsKey, studentId);
    await redis.expire(handsKey, this.STATE_TTL);
    return true;
  }

  /**
   * Lower hand (resolved)
   */
  async lowerHand(classroomId: string, studentId: string) {
    const handsKey = `${this.RAISED_HANDS_PREFIX}${classroomId}`;
    await redis.srem(handsKey, studentId);
    return true;
  }

  /**
   * Get students with raised hands
   */
  async getRaisedHands(classroomId: string): Promise<string[]> {
    const handsKey = `${this.RAISED_HANDS_PREFIX}${classroomId}`;
    return redis.smembers(handsKey);
  }

  /**
   * Update classroom settings
   */
  async updateClassroom(
    classroomId: string,
    teacherId: string,
    updates: {
      name?: string;
      currentPhilosophy?: PhilosophyMode;
      isActive?: boolean;
      anonymizeStudents?: boolean;
    }
  ) {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId }
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    if (classroom.teacherId !== teacherId) {
      const isAdmin = await this.isUserAdmin(teacherId);
      if (!isAdmin) {
        throw new ForbiddenError('Only the classroom teacher can update settings');
      }
    }

    return prisma.classroom.update({
      where: { id: classroomId },
      data: updates
    });
  }

  /**
   * Regenerate access code
   */
  async regenerateAccessCode(classroomId: string, teacherId: string) {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId }
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    if (classroom.teacherId !== teacherId) {
      throw new ForbiddenError('Only the classroom teacher can regenerate the access code');
    }

    let newCode: string;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      newCode = generateAccessCode();
      const existing = await prisma.classroom.findUnique({
        where: { accessCode: newCode }
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new AppError('Failed to generate unique access code', 500);
    }

    return prisma.classroom.update({
      where: { id: classroomId },
      data: { accessCode: newCode! }
    });
  }

  /**
   * Remove student from classroom
   */
  async removeStudent(classroomId: string, studentId: string, teacherId: string) {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId }
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    if (classroom.teacherId !== teacherId) {
      const isAdmin = await this.isUserAdmin(teacherId);
      if (!isAdmin) {
        throw new ForbiddenError('Only the classroom teacher can remove students');
      }
    }

    await prisma.classroomStudent.delete({
      where: {
        classroomId_studentId: {
          classroomId,
          studentId
        }
      }
    });

    // Clean up Redis state
    await redis.del(`${this.STUDENT_STATUS_PREFIX}${classroomId}:${studentId}`);
    await redis.srem(`${this.RAISED_HANDS_PREFIX}${classroomId}`, studentId);

    return { success: true };
  }

  /**
   * Leave classroom (student action)
   */
  async leaveClassroom(classroomId: string, studentId: string) {
    const enrollment = await prisma.classroomStudent.findUnique({
      where: {
        classroomId_studentId: {
          classroomId,
          studentId
        }
      }
    });

    if (!enrollment) {
      throw new NotFoundError('You are not enrolled in this classroom');
    }

    await prisma.classroomStudent.delete({
      where: {
        classroomId_studentId: {
          classroomId,
          studentId
        }
      }
    });

    // Clean up Redis state
    await redis.del(`${this.STUDENT_STATUS_PREFIX}${classroomId}:${studentId}`);
    await redis.srem(`${this.RAISED_HANDS_PREFIX}${classroomId}`, studentId);

    return { success: true };
  }

  /**
   * Get classrooms for a teacher
   */
  async getTeacherClassrooms(teacherId: string) {
    return prisma.classroom.findMany({
      where: { teacherId },
      include: {
        _count: {
          select: { students: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get classrooms for a student
   */
  async getStudentClassrooms(studentId: string) {
    const enrollments = await prisma.classroomStudent.findMany({
      where: { studentId },
      include: {
        classroom: {
          include: {
            teacher: {
              select: { id: true, fullName: true }
            },
            _count: {
              select: { students: true }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    return enrollments.map(e => ({
      ...e.classroom,
      joinedAt: e.joinedAt,
      anonymousId: e.anonymousId
    }));
  }

  /**
   * Grant credits to students
   */
  async grantCredits(classroomId: string, teacherId: string, amount: number, studentIds?: string[]): Promise<GrantCreditsResult> {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: { students: { select: { studentId: true } } }
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    if (classroom.teacherId !== teacherId) {
      const isAdmin = await this.isUserAdmin(teacherId);
      if (!isAdmin) {
        throw new ForbiddenError('Only the classroom teacher can grant credits');
      }
    }

    let targetStudentIds: string[] = [];

    if (studentIds && studentIds.length > 0) {
      // successful verification only targets students in this classroom
      const enrolledIds = new Set(classroom.students.map((s: { studentId: string }) => s.studentId));
      targetStudentIds = studentIds.filter(id => enrolledIds.has(id));
    } else {
      // Target all students
      targetStudentIds = classroom.students.map((s: { studentId: string }) => s.studentId);
    }

    if (targetStudentIds.length === 0) {
      return { students: [], totalCredits: 0 };
    }

    // Update credits
    await prisma.user.updateMany({
      where: { id: { in: targetStudentIds } },
      data: { credits: { increment: amount } }
    });

    // Log for each student (optional, maybe bulk log later if performance issue)
    // For now, simple logging
    // await prisma.auditLog.createMany(...) // createMany is available in modern Prisma

    return {
      students: targetStudentIds,
      totalCredits: targetStudentIds.length * amount
    };
  }

  /**
   * Archive a classroom
   */
  async archiveClassroom(classroomId: string, teacherId: string) {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId }
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    if (classroom.teacherId !== teacherId) {
      const isAdmin = await this.isUserAdmin(teacherId);
      if (!isAdmin) {
        throw new ForbiddenError('Only the classroom teacher can archive');
      }
    }

    // Clear Redis state
    const stateKey = `${this.CLASSROOM_STATE_PREFIX}${classroomId}`;
    await redis.del(stateKey);

    return prisma.classroom.update({
      where: { id: classroomId },
      data: { isActive: false }
    });
  }

  // Private helper methods

  private async initializeClassroomState(classroomId: string) {
    const stateKey = `${this.CLASSROOM_STATE_PREFIX}${classroomId}`;
    await redis.hset(stateKey, {
      createdAt: new Date().toISOString(),
      studentCount: '0'
    });
    await redis.expire(stateKey, this.STATE_TTL);
  }

  private async initializeStudentStatus(classroomId: string, studentId: string) {
    const statusKey = `${this.STUDENT_STATUS_PREFIX}${classroomId}:${studentId}`;
    await redis.hset(statusKey, {
      status: GraphStatus.IDLE,
      sentiment: '50',
      nodeCount: '0',
      lastActive: new Date().toISOString()
    });
    await redis.expire(statusKey, this.STATE_TTL);
  }

  private async isUserAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    return user?.role === UserRole.ADMIN;
  }
}

export const classroomService = new ClassroomService();

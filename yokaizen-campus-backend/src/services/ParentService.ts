import { prisma } from '../utils/prisma';
import { NotFoundError, ForbiddenError, AppError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

interface WeeklyReport {
  studentId: string;
  studentName: string;
  weekStart: Date;
  weekEnd: Date;
  summary: {
    totalXP: number;
    levelsGained: number;
    currentLevel: number;
    graphsCreated: number;
    nodesExecuted: number;
    hallucinationsDetected: number;
    chaosEventsSurvived: number;
  };
  skillProgress: {
    orchestration: { current: number; change: number };
    resilience: { current: number; change: number };
    creativity: { current: number; change: number };
    logic: { current: number; change: number };
    ethics: { current: number; change: number };
  };
  achievements: Array<{
    name: string;
    description: string;
    unlockedAt: Date;
  }>;
  recentActivity: Array<{
    date: Date;
    type: string;
    description: string;
  }>;
  classroomParticipation: Array<{
    classroomName: string;
    teacherName: string;
    status: string;
    lastActive: Date;
  }>;
}

interface ChildOverview {
  id: string;
  fullName: string;
  level: number;
  xp: number;
  credits: number;
  currentStreak: number;
  lastActive: Date;
  recentAchievements: string[];
}

export class ParentService {
  /**
   * Link parent to child
   */
  async linkChild(parentId: string, childEmail: string) {
    // Verify parent role
    const parent = await prisma.user.findUnique({
      where: { id: parentId },
      select: { id: true, role: true }
    });

    if (!parent || parent.role !== UserRole.PARENT) {
      throw new ForbiddenError('Only parent accounts can link children');
    }

    // Find child by email
    const child = await prisma.user.findUnique({
      where: { email: childEmail },
      select: { id: true, role: true, fullName: true }
    });

    if (!child) {
      throw new NotFoundError('No student found with that email');
    }

    if (child.role !== UserRole.STUDENT) {
      throw new AppError('Can only link to student accounts', 400);
    }

    // Check if already linked
    const existing = await prisma.parentChild.findFirst({
      where: {
        parentId,
        childId: child.id
      }
    });

    if (existing) {
      throw new AppError('This student is already linked to your account', 400);
    }

    // Create link (pending verification)
    const link = await prisma.parentChild.create({
      data: {
        parentId,
        childId: child.id,
        isVerified: false
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: parentId,
        actionType: 'PARENT_LINK_REQUEST',
        details: `Requested to link with student: ${child.fullName}`,
        meta: { childId: child.id }
      }
    });

    return {
      linkId: link.id,
      childName: child.fullName,
      status: 'pending'
    };
  }

  /**
   * Approve parent link (student action)
   */
  async approveParentLink(studentId: string, parentId: string) {
    const link = await prisma.parentChild.findFirst({
      where: {
        parentId,
        childId: studentId
      }
    });

    if (!link) {
      throw new NotFoundError('No pending link request found');
    }

    if (link.isVerified) {
      throw new AppError('Link is already approved', 400);
    }

    await prisma.parentChild.update({
      where: { id: link.id },
      data: { isVerified: true, verifiedAt: new Date() }
    });

    await prisma.auditLog.create({
      data: {
        userId: studentId,
        actionType: 'PARENT_LINK_APPROVED',
        details: 'Approved parent link',
        meta: { parentId }
      }
    });

    return { success: true };
  }

  /**
   * Reject/Remove parent link
   */
  async removeParentLink(userId: string, linkId: string) {
    const link = await prisma.parentChild.findUnique({
      where: { id: linkId }
    });

    if (!link) {
      throw new NotFoundError('Link not found');
    }

    // Either parent or child can remove
    if (link.parentId !== userId && link.childId !== userId) {
      throw new ForbiddenError('Cannot remove this link');
    }

    await prisma.parentChild.delete({
      where: { id: linkId }
    });

    return { success: true };
  }

  /**
   * Get all linked children for a parent
   */
  async getLinkedChildren(parentId: string): Promise<ChildOverview[]> {
    const links = await prisma.parentChild.findMany({
      where: {
        parentId,
        isVerified: true
      },
      include: {
        child: {
          select: {
            id: true,
            fullName: true,
            level: true,
            xp: true,
            credits: true,
            careerPath: {
              select: {
                stats: true
              }
            }
          }
        }
      }
    });

    const children: ChildOverview[] = [];

    for (const link of links) {
      // Get recent activity
      const lastActivity = await prisma.auditLog.findFirst({
        where: { userId: link.child.id },
        orderBy: { timestamp: 'desc' }
      });

      // Get recent achievements (from audit log)
      const recentAchievements = await prisma.auditLog.findMany({
        where: {
          userId: link.child.id,
          actionType: 'ACHIEVEMENT_UNLOCKED'
        },
        orderBy: { timestamp: 'desc' },
        take: 3
      });

      // Calculate streak (days with activity in a row)
      const streak = await this.calculateStreak(link.child.id);

      children.push({
        id: link.child.id,
        fullName: link.child.fullName,
        level: link.child.level,
        xp: link.child.xp,
        credits: link.child.credits,
        currentStreak: streak,
        lastActive: lastActivity?.timestamp || link.createdAt,
        recentAchievements: recentAchievements.map(a => (a.meta as any)?.achievement || 'Achievement')
      });
    }

    return children;
  }

  /**
   * Get pending link requests for a student
   */
  async getPendingLinkRequests(studentId: string) {
    const links = await prisma.parentChild.findMany({
      where: {
        childId: studentId,
        isVerified: false
      },
      include: {
        parent: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    return links.map(l => ({
      linkId: l.id,
      parentId: l.parent.id,
      parentName: l.parent.fullName,
      parentEmail: l.parent.email,
      requestedAt: l.createdAt
    }));
  }

  /**
   * Get weekly report for a child
   */
  async getWeeklyReport(parentId: string, studentId: string): Promise<WeeklyReport> {
    // Verify relationship
    await this.verifyParentAccess(parentId, studentId);

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        careerPath: true
      }
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    // Calculate week bounds
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Get activity logs for the week
    const weeklyLogs = await prisma.auditLog.findMany({
      where: {
        userId: studentId,
        timestamp: {
          gte: weekStart,
          lt: weekEnd
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    // Calculate summary
    const graphLogs = weeklyLogs.filter(l => l.actionType === 'GRAPH_EXECUTE');
    const auditLogs = weeklyLogs.filter(l => l.actionType === 'NODE_AUDIT');
    const chaosLogs = weeklyLogs.filter(l => l.actionType === 'CHAOS_SURVIVED');
    const xpLogs = weeklyLogs.filter(l => l.actionType === 'XP_GAINED');
    const levelLogs = weeklyLogs.filter(l => l.actionType === 'LEVEL_UP');

    const totalXP = xpLogs.reduce((sum, log) => {
      const meta = log.meta as any;
      return sum + (meta?.amount || 0);
    }, 0);

    const hallucinationsDetected = auditLogs.filter(l => {
      const meta = l.meta as any;
      return meta?.isHallucination === true;
    }).length;

    // Get previous week stats for comparison
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    const prevWeekPath = await this.getSkillsAtDate(studentId, weekStart);
    const currentStats = student.careerPath?.stats as any || {};

    const skillProgress = {
      orchestration: {
        current: currentStats.orchestration || 0,
        change: (currentStats.orchestration || 0) - (prevWeekPath?.orchestration || 0)
      },
      resilience: {
        current: currentStats.resilience || 0,
        change: (currentStats.resilience || 0) - (prevWeekPath?.resilience || 0)
      },
      creativity: {
        current: currentStats.creativity || 0,
        change: (currentStats.creativity || 0) - (prevWeekPath?.creativity || 0)
      },
      logic: {
        current: currentStats.logic || 0,
        change: (currentStats.logic || 0) - (prevWeekPath?.logic || 0)
      },
      ethics: {
        current: currentStats.ethics || 0,
        change: (currentStats.ethics || 0) - (prevWeekPath?.ethics || 0)
      }
    };

    // Get achievements unlocked this week
    const achievementLogs = weeklyLogs.filter(l => l.actionType === 'ACHIEVEMENT_UNLOCKED');
    const achievements = achievementLogs.map(l => {
      const meta = l.meta as any;
      return {
        name: meta?.achievement || 'Unknown',
        description: meta?.description || '',
        unlockedAt: l.timestamp
      };
    });

    // Get recent activity summary
    const recentActivity = weeklyLogs.slice(0, 20).map(log => ({
      date: log.timestamp,
      type: log.actionType,
      description: this.formatActivityDescription(log)
    }));

    // Get classroom participation
    const enrollments = await prisma.classroomStudent.findMany({
      where: { studentId },
      include: {
        classroom: {
          include: {
            teacher: {
              select: { fullName: true }
            }
          }
        }
      }
    });

    const classroomParticipation = enrollments.map(e => ({
      classroomName: e.classroom.name,
      teacherName: e.classroom.teacher.fullName,
      status: e.classroom.isActive ? 'Active' : 'Inactive',
      lastActive: e.joinedAt // Would need better tracking for actual last active
    }));

    return {
      studentId,
      studentName: student.fullName,
      weekStart,
      weekEnd,
      summary: {
        totalXP,
        levelsGained: levelLogs.length,
        currentLevel: student.level,
        graphsCreated: graphLogs.length,
        nodesExecuted: graphLogs.reduce((sum, l) => sum + ((l.meta as any)?.nodeCount || 0), 0),
        hallucinationsDetected,
        chaosEventsSurvived: chaosLogs.length
      },
      skillProgress,
      achievements,
      recentActivity,
      classroomParticipation
    };
  }

  /**
   * Get activity summary for date range
   */
  async getActivitySummary(parentId: string, studentId: string, days: number = 30) {
    await this.verifyParentAccess(parentId, studentId);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await prisma.auditLog.findMany({
      where: {
        userId: studentId,
        timestamp: { gte: startDate }
      },
      orderBy: { timestamp: 'desc' }
    });

    // Group by day
    const byDay = new Map<string, number>();
    logs.forEach(log => {
      const day = log.timestamp.toISOString().split('T')[0];
      byDay.set(day, (byDay.get(day) || 0) + 1);
    });

    // Group by action type
    const byType = new Map<string, number>();
    logs.forEach(log => {
      byType.set(log.actionType, (byType.get(log.actionType) || 0) + 1);
    });

    return {
      totalActivities: logs.length,
      activeDays: byDay.size,
      averagePerDay: Math.round(logs.length / days),
      activityByDay: Object.fromEntries(byDay),
      activityByType: Object.fromEntries(byType)
    };
  }

  /**
   * Get career path progress
   */
  async getCareerProgress(parentId: string, studentId: string) {
    await this.verifyParentAccess(parentId, studentId);

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { careerPath: true }
    });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    const allNodes = [
      'SCOUT', 'ARCHITECT', 'CRITIC', 'ETHICIST', 'SYNTHESIZER',
      'ORACLE', 'COMMANDER', 'DEBUGGER', 'CREATIVE', 'ANALYST'
    ];

    const unlockedNodes = student.careerPath?.unlockedNodes || [];
    const stats = student.careerPath?.stats as any || {};

    return {
      level: student.level,
      xp: student.xp,
      totalNodes: allNodes.length,
      unlockedNodes: unlockedNodes.length,
      nodes: allNodes.map(node => ({
        id: node,
        unlocked: unlockedNodes.includes(node),
        name: this.getNodeName(node),
        description: this.getNodeDescription(node)
      })),
      skills: {
        orchestration: stats.orchestration || 0,
        resilience: stats.resilience || 0,
        creativity: stats.creativity || 0,
        logic: stats.logic || 0,
        ethics: stats.ethics || 0
      }
    };
  }

  // Private helper methods

  private async verifyParentAccess(parentId: string, studentId: string) {
    const link = await prisma.parentChild.findFirst({
      where: {
        parentId,
        childId: studentId,
        isVerified: true
      }
    });

    if (!link) {
      throw new ForbiddenError('You do not have access to this student\'s data');
    }
  }

  private async calculateStreak(studentId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let checkDate = new Date(today);

    while (true) {
      const nextDay = new Date(checkDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const activity = await prisma.auditLog.findFirst({
        where: {
          userId: studentId,
          timestamp: {
            gte: checkDate,
            lt: nextDay
          }
        }
      });

      if (activity) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }

      // Limit check to 365 days
      if (streak > 365) break;
    }

    return streak;
  }

  private async getSkillsAtDate(studentId: string, date: Date): Promise<any> {
    // Get the latest skill update before the given date
    const log = await prisma.auditLog.findFirst({
      where: {
        userId: studentId,
        actionType: { in: ['SKILL_UPDATE', 'XP_GAINED'] },
        timestamp: { lt: date }
      },
      orderBy: { timestamp: 'desc' }
    });

    if (log?.meta) {
      return (log.meta as any).stats || {};
    }

    return {};
  }

  private formatActivityDescription(log: any): string {
    const meta = log.meta as any;

    switch (log.actionType) {
      case 'GRAPH_EXECUTE':
        return `Executed a graph with ${meta?.nodeCount || 0} nodes`;
      case 'NODE_AUDIT':
        return meta?.isHallucination
          ? 'Detected and fixed a hallucination'
          : 'Verified node output';
      case 'LEVEL_UP':
        return `Reached level ${meta?.newLevel || '?'}`;
      case 'ACHIEVEMENT_UNLOCKED':
        return `Unlocked achievement: ${meta?.achievement || 'Unknown'}`;
      case 'XP_GAINED':
        return `Earned ${meta?.amount || 0} XP`;
      case 'CHAOS_SURVIVED':
        return `Survived chaos event: ${meta?.eventType || 'Unknown'}`;
      default:
        return log.details || log.actionType;
    }
  }

  private getNodeName(nodeId: string): string {
    const names: Record<string, string> = {
      SCOUT: 'The Scout',
      ARCHITECT: 'The Architect',
      CRITIC: 'The Critic',
      ETHICIST: 'The Ethicist',
      SYNTHESIZER: 'The Synthesizer',
      ORACLE: 'The Oracle',
      COMMANDER: 'The Commander',
      DEBUGGER: 'The Debugger',
      CREATIVE: 'The Creative',
      ANALYST: 'The Analyst'
    };
    return names[nodeId] || nodeId;
  }

  private getNodeDescription(nodeId: string): string {
    const descriptions: Record<string, string> = {
      SCOUT: 'Fast data gatherer, low cost',
      ARCHITECT: 'Structures complex information',
      CRITIC: 'Evaluates and challenges outputs',
      ETHICIST: 'Ensures ethical considerations',
      SYNTHESIZER: 'Combines multiple sources',
      ORACLE: 'Provides deep insights (Hidden)',
      COMMANDER: 'Orchestrates complex workflows',
      DEBUGGER: 'Fixes errors and inconsistencies',
      CREATIVE: 'Generates creative solutions',
      ANALYST: 'Performs detailed analysis'
    };
    return descriptions[nodeId] || 'Specialized AI agent';
  }

  // --- STUBS FOR PARENT CONTROLLER SYNC ---
  async requestLink(...args: any[]) { return this.linkChild(args[0], args[1]); }
  async verifyLink(...args: any[]) { return this.approveParentLink(args[0], args[1]); }
  async unlinkChild(...args: any[]) { return this.removeParentLink(args[0], args[1]); }
  async getChildReport(...args: any[]) { return this.getWeeklyReport(args[0], args[1]); }
  async getChildProgress(...args: any[]) { return this.getCareerProgress(args[0], args[1]); }
  async getChildActivity(...args: any[]) { return this.getActivitySummary(args[0], args[1]); }
  async getChildAchievements(...args: any[]) { return []; }
  async getChildCreditHistory(...args: any[]) { return []; }
  async sponsorCredits(...args: any[]) { return { success: true }; }
  async getNotificationPreferences(...args: any[]) { return {}; }
  async updateNotificationPreferences(...args: any[]) { return args[1]; }
  async getPendingLinks(...args: any[]) { return this.getPendingLinkRequests(args[0]); }
  async rejectLink(...args: any[]) { return this.removeParentLink(args[0], args[1]); }
  async getDashboard(...args: any[]) { return { children: await this.getLinkedChildren(args[0]) }; }
}

export const parentService = new ParentService();

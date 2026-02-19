import { Request, Response } from 'express';
import { z } from 'zod';
import { classroomService } from '../services/ClassroomService';
import { getSocketGateway } from '../sockets/gateway';
import { asyncHandler, ValidationError, ForbiddenError } from '../middleware/errorHandler';

// Validation schemas
const createClassroomSchema = z.object({
  name: z.string().min(2, 'Classroom name must be at least 2 characters'),
  philosophyMode: z.enum(['FINLAND', 'KOREA', 'JAPAN']).optional(),
  maxStudents: z.number().int().min(1).max(100).optional(),
  anonymizeStudents: z.boolean().optional()
});

const joinClassroomSchema = z.object({
  accessCode: z.string().length(6, 'Access code must be 6 characters')
});

const updateClassroomSchema = z.object({
  name: z.string().min(2).optional(),
  currentPhilosophy: z.enum(['FINLAND', 'KOREA', 'JAPAN']).optional(),
  maxStudents: z.number().int().min(1).max(100).optional(),
  anonymizeStudents: z.boolean().optional(),
  isActive: z.boolean().optional()
});

const grantCreditsSchema = z.object({
  amount: z.number().int().min(1).max(1000),
  studentIds: z.array(z.string().uuid()).optional()
});

const broadcastSchema = z.object({
  message: z.string().min(1).max(500),
  type: z.enum(['INFO', 'WARNING', 'HINT', 'CELEBRATION']).optional().default('INFO')
});

const chaosEventSchema = z.object({
  eventType: z.enum(['SOLAR_FLARE', 'LOGIC_ROT', 'DDOS', 'MEMORY_LEAK', 'QUANTUM_NOISE']),
  duration: z.number().int().min(10).max(300).optional().default(60),
  intensity: z.number().min(0.1).max(1.0).optional().default(0.5)
});

export class ClassroomController {
  /**
   * POST /classroom
   * Create a new classroom (Teacher only)
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only teachers can create classrooms');
    }

    const validation = createClassroomSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const classroom = await classroomService.createClassroom({
      teacherId: req.user!.id,
      ...validation.data
    });

    res.status(201).json({
      success: true,
      message: 'Classroom created',
      data: classroom
    });
  });

  /**
   * POST /classroom/join
   * Join a classroom with access code (Student only)
   */
  join = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'STUDENT') {
      throw new ForbiddenError('Only students can join classrooms');
    }

    const validation = joinClassroomSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const membership = await classroomService.joinClassroom({
      studentId: req.user!.id,
      accessCode: validation.data.accessCode.toUpperCase()
    });

    res.json({
      success: true,
      message: 'Joined classroom successfully',
      data: membership
    });
  });

  /**
   * POST /classroom/:id/leave
   * Leave a classroom (Student only)
   */
  leave = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'STUDENT') {
      throw new ForbiddenError('Only students can leave classrooms');
    }

    await classroomService.leaveClassroom(req.user!.id, req.params.id);

    res.json({
      success: true,
      message: 'Left classroom successfully'
    });
  });

  /**
   * GET /classroom/:id
   * Get classroom details
   */
  getOne = asyncHandler(async (req: Request, res: Response) => {
    const classroom = await classroomService.getClassroom(
      req.params.id,
      req.user!.id
    );

    res.json({
      success: true,
      data: classroom
    });
  });

  /**
   * GET /classroom
   * Get all classrooms for the current user
   */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    let classrooms;

    if (req.user!.role === 'TEACHER' || req.user!.role === 'ADMIN') {
      classrooms = await classroomService.getTeacherClassrooms(req.user!.id);
    } else {
      classrooms = await classroomService.getStudentClassrooms(req.user!.id);
    }

    res.json({
      success: true,
      data: classrooms
    });
  });

  /**
   * PATCH /classroom/:id
   * Update classroom settings (Teacher only)
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const validation = updateClassroomSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const classroom = await classroomService.updateClassroom(
      req.params.id,
      req.user!.id,
      validation.data
    );

    res.json({
      success: true,
      message: 'Classroom updated',
      data: classroom
    });
  });

  /**
   * DELETE /classroom/:id
   * Delete classroom (Teacher only)
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    await classroomService.deleteClassroom(req.params.id, req.user!.id);

    res.json({
      success: true,
      message: 'Classroom deleted'
    });
  });

  /**
   * GET /classroom/:id/live
   * Get live classroom state (polling fallback for WebSocket)
   */
  getLiveState = asyncHandler(async (req: Request, res: Response) => {
    const state = await classroomService.getLiveState(req.params.id);

    res.json({
      success: true,
      data: state
    });
  });

  /**
   * GET /classroom/:id/hands
   * Get raised hands
   */
  getRaisedHands = asyncHandler(async (req: Request, res: Response) => {
    const hands = await classroomService.getRaisedHands(req.params.id);

    res.json({
      success: true,
      data: hands
    });
  });

  /**
   * POST /classroom/:id/hand
   * Raise hand
   */
  raiseHand = asyncHandler(async (req: Request, res: Response) => {
    const { message } = req.body;

    await classroomService.raiseHand(
      req.user!.id,
      req.params.id,
      message
    );

    // Notify teachers via Socket
    getSocketGateway().io.to(`class:${req.params.id}`).emit('hand_raised', {
      studentId: req.user!.id,
      message: message || 'Needs help',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Hand raised'
    });
  });

  /**
   * DELETE /classroom/:id/hand
   * Lower hand
   */
  lowerHand = asyncHandler(async (req: Request, res: Response) => {
    await classroomService.lowerHand(req.user!.id, req.params.id);

    // Notify classroom via Socket
    getSocketGateway().io.to(`class:${req.params.id}`).emit('hand_lowered', {
      studentId: req.user!.id,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Hand lowered'
    });
  });

  /**
   * POST /classroom/:id/credits
   * Grant credits to students (Teacher only)
   */
  grantCredits = asyncHandler(async (req: Request, res: Response) => {
    const validation = grantCreditsSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const result = await classroomService.grantCredits(
      req.params.id,
      req.user!.id,
      validation.data.amount,
      validation.data.studentIds
    );

    // Notify students via Socket
    result.students.forEach(studentId => {
      getSocketGateway().io.to(`user:${studentId}`).emit('grant_credits', {
        amount: validation.data.amount,
        from: req.user!.id,
        timestamp: new Date().toISOString()
      });
    });

    res.json({
      success: true,
      message: `Granted ${result.granted} credits to ${result.students.length} students`,
      data: result
    });
  });

  /**
   * POST /classroom/:id/broadcast
   * Send a broadcast message to all students (Teacher only)
   */
  broadcast = asyncHandler(async (req: Request, res: Response) => {
    const validation = broadcastSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    // This will be handled by the socket gateway
    // Store the broadcast in DB for history
    const { prisma } = await import('../utils/prisma');

    const broadcast = await prisma.broadcast.create({
      data: {
        classroomId: req.params.id,
        teacherId: req.user!.id,
        message: validation.data.message,
        type: validation.data.type
      }
    });

    // Emit to all students via Socket
    getSocketGateway().io.to(`class:${req.params.id}`).emit('teacher_broadcast', {
      message: validation.data.message,
      type: validation.data.type,
      teacherId: req.user!.id,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Broadcast sent',
      data: broadcast
    });
  });

  /**
   * POST /classroom/:id/chaos
   * Trigger a chaos event (Teacher only)
   */
  triggerChaos = asyncHandler(async (req: Request, res: Response) => {
    const validation = chaosEventSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const { prisma } = await import('../utils/prisma');

    const chaosEvent = await prisma.chaosEvent.create({
      data: {
        classroomId: req.params.id,
        triggeredBy: req.user!.id,
        eventType: validation.data.eventType,
        duration: validation.data.duration,
        intensity: validation.data.intensity
      }
    });

    // Emit Chaos Event via Socket
    getSocketGateway().io.to(`class:${req.params.id}`).emit('chaos_event', {
      id: chaosEvent.id,
      eventType: validation.data.eventType,
      duration: validation.data.duration,
      intensity: validation.data.intensity,
      timestamp: new Date().toISOString()
    });

    // Schedule End
    setTimeout(() => {
      getSocketGateway().io.to(`class:${req.params.id}`).emit('chaos_event_end', {
        id: chaosEvent.id,
        eventType: validation.data.eventType
      });
    }, validation.data.duration * 1000);

    res.json({
      success: true,
      message: 'Chaos event triggered',
      data: chaosEvent
    });
  });

  /**
   * POST /classroom/:id/philosophy
   * Change classroom philosophy mode (Teacher only)
   */
  changePhilosophy = asyncHandler(async (req: Request, res: Response) => {
    const { philosophy } = req.body;

    if (!['FINLAND', 'KOREA', 'JAPAN'].includes(philosophy)) {
      throw new ValidationError('Invalid philosophy mode');
    }

    const classroom = await classroomService.updateClassroom(
      req.params.id,
      req.user!.id,
      { currentPhilosophy: philosophy }
    );

    // Broadcast Philosophy Change via Socket
    getSocketGateway().io.to(`class:${req.params.id}`).emit('philosophy_change', {
      philosophy: philosophy,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Philosophy changed to ${philosophy}`,
      data: classroom
    });
  });
}

export const classroomController = new ClassroomController();

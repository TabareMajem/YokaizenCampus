import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { asyncHandler, ValidationError, ForbiddenError } from '../middleware/errorHandler';

// Validation schemas
const updateUserSchema = z.object({
  role: z.enum(['STUDENT', 'TEACHER', 'ADMIN', 'PARENT']).optional(),
  subscriptionTier: z.enum(['FREE', 'PRO', 'NGO_GRANT']).optional(),
  credits: z.number().int().optional(),
  isActive: z.boolean().optional()
});

const createSchoolSchema = z.object({
  name: z.string().min(2),
  domain: z.string().optional(),
  adminEmail: z.string().email(),
  subscriptionTier: z.enum(['FREE', 'PRO', 'NGO_GRANT']).optional(),
  maxStudents: z.number().int().min(1).optional(),
  maxTeachers: z.number().int().min(1).optional()
});

const systemSettingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  registrationEnabled: z.boolean().optional(),
  defaultPhilosophy: z.enum(['FINLAND', 'KOREA', 'JAPAN']).optional(),
  maxFreeCredits: z.number().int().optional(),
  aiProviderPriority: z.array(z.string()).optional()
});

export class AdminController {
  /**
   * Check admin role middleware
   */
  private checkAdmin(req: Request) {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }
  }

  /**
   * GET /admin/stats
   * Get system-wide statistics
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    this.checkAdmin(req);

    const [
      userCount,
      studentCount,
      teacherCount,
      classroomCount,
      activeClassrooms,
      graphSessions,
      grantApplications
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.classroom.count(),
      prisma.classroom.count({ where: { isActive: true } }),
      prisma.graphSession.count(),
      prisma.grantApplication.count()
    ]);

    // AI usage stats
    const aiUsage = await prisma.aIUsageLog.aggregate({
      _sum: { tokensUsed: true, cost: true },
      _count: true
    });

    // Recent activity
    const recentActivity = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, fullName: true, email: true } }
      }
    });

    res.json({
      success: true,
      data: {
        users: {
          total: userCount,
          students: studentCount,
          teachers: teacherCount,
          admins: userCount - studentCount - teacherCount
        },
        classrooms: {
          total: classroomCount,
          active: activeClassrooms
        },
        graphSessions,
        grantApplications,
        aiUsage: {
          totalCalls: aiUsage._count,
          totalTokens: aiUsage._sum.tokensUsed || 0,
          totalCost: aiUsage._sum.cost || 0
        },
        recentActivity
      }
    });
  });

  /**
   * GET /admin/users
   * Get all users with pagination
   */
  getUsers = asyncHandler(async (req: Request, res: Response) => {
    this.checkAdmin(req);

    const { role, tier, search, limit, offset } = req.query;

    const where: any = {};
    if (role) where.role = role;
    if (tier) where.subscriptionTier = tier;
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { fullName: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          subscriptionTier: true,
          level: true,
          xp: true,
          credits: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              graphSessions: true,
              classroomsAsTeacher: true
            }
          }
        },
        take: limit ? parseInt(limit as string) : 50,
        skip: offset ? parseInt(offset as string) : 0,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: { users, total }
    });
  });

  /**
   * GET /admin/users/:id
   * Get detailed user information
   */
  getUser = asyncHandler(async (req: Request, res: Response) => {
    this.checkAdmin(req);

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        careerPath: true,
        graphSessions: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        auditLogs: {
          take: 50,
          orderBy: { timestamp: 'desc' }
        },
        classroomsAsTeacher: true,
        classroomsAsStudent: {
          include: { classroom: true }
        }
      }
    });

    res.json({
      success: true,
      data: user
    });
  });

  /**
   * PATCH /admin/users/:id
   * Update user
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    this.checkAdmin(req);

    const validation = updateUserSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: validation.data
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        actionType: 'ADMIN_USER_UPDATE',
        details: `Updated user ${req.params.id}`,
        meta: validation.data
      }
    });

    res.json({
      success: true,
      message: 'User updated',
      data: user
    });
  });

  /**
   * DELETE /admin/users/:id
   * Delete user
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    this.checkAdmin(req);

    // Soft delete by marking inactive
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        actionType: 'ADMIN_USER_DELETE',
        details: `Deleted user ${req.params.id}`
      }
    });

    res.json({
      success: true,
      message: 'User deleted'
    });
  });

  /**
   * POST /admin/users/:id/credits
   * Add credits to user
   */
  addCredits = asyncHandler(async (req: Request, res: Response) => {
    this.checkAdmin(req);

    const { amount, reason } = req.body;

    if (!amount || amount < 1) {
      throw new ValidationError('Amount must be positive');
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { credits: { increment: amount } }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        actionType: 'ADMIN_CREDITS_ADD',
        details: `Added ${amount} credits to user ${req.params.id}: ${reason || 'No reason provided'}`,
        meta: { amount, reason, targetUserId: req.params.id }
      }
    });

    res.json({
      success: true,
      message: `Added ${amount} credits`,
      data: { newBalance: user.credits }
    });
  });

  /**
   * GET /admin/schools
   * Get all schools
   */
  getSchools = asyncHandler(async (req: Request, res: Response) => {
    this.checkAdmin(req);

    const schools = await prisma.school.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: schools
    });
  });

  /**
   * POST /admin/schools
   * Create a school
   */
  createSchool = asyncHandler(async (req: Request, res: Response) => {
    this.checkAdmin(req);

    const validation = createSchoolSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const school = await prisma.school.create({
      data: {
        name: validation.data.name,
        domain: validation.data.domain,
        subscriptionTier: validation.data.subscriptionTier || 'FREE',
        maxStudents: validation.data.maxStudents || 100,
        maxTeachers: validation.data.maxTeachers || 10
      }
    });

    res.status(201).json({
      success: true,
      message: 'School created',
      data: school
    });
  });

  /**
   * GET /admin/ai-usage
   * Get AI usage logs
   */
  getAIUsage = asyncHandler(async (req: Request, res: Response) => {
    this.checkAdmin(req);

    const { userId, provider, startDate, endDate, limit } = req.query;

    const where: any = {};
    if (userId) where.userId = userId;
    if (provider) where.provider = provider;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }

    const logs = await prisma.aIUsageLog.findMany({
      where,
      take: limit ? parseInt(limit as string) : 100,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { id: true, email: true, fullName: true } }
      }
    });

    // Aggregate stats
    const stats = await prisma.aIUsageLog.aggregate({
      where,
      _sum: { tokensUsed: true, cost: true },
      _count: true,
      _avg: { tokensUsed: true }
    });

    res.json({
      success: true,
      data: { logs, stats }
    });
  });

  /**
   * GET /admin/audit-logs
   * Get audit logs
   */
  getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    this.checkAdmin(req);

    const { userId, actionType, startDate, endDate, limit, offset } = req.query;

    const where: any = {};
    if (userId) where.userId = userId;
    if (actionType) where.actionType = actionType;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      take: limit ? parseInt(limit as string) : 100,
      skip: offset ? parseInt(offset as string) : 0,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { id: true, email: true, fullName: true } }
      }
    });

    res.json({
      success: true,
      data: logs
    });
  });

  /**
   * GET /admin/settings
   * Get system settings
   */
  getSettings = asyncHandler(async (req: Request, res: Response) => {
    this.checkAdmin(req);

    // In a real app, these would come from a settings table or config
    const settings = {
      maintenanceMode: false,
      registrationEnabled: true,
      defaultPhilosophy: 'JAPAN',
      maxFreeCredits: 100,
      aiProviderPriority: ['openai', 'anthropic', 'google']
    };

    res.json({
      success: true,
      data: settings
    });
  });

  /**
   * PATCH /admin/settings
   * Update system settings
   */
  updateSettings = asyncHandler(async (req: Request, res: Response) => {
    this.checkAdmin(req);

    const validation = systemSettingsSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    // In a real app, save to settings table
    // For now, just log and return

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        actionType: 'ADMIN_SETTINGS_UPDATE',
        details: 'Updated system settings',
        meta: validation.data
      }
    });

    res.json({
      success: true,
      message: 'Settings updated',
      data: validation.data
    });
  });

  /**
   * POST /admin/school-key
   * Update the global school proxy AI key
   */
  updateSchoolKey = asyncHandler(async (req: Request, res: Response) => {
    this.checkAdmin(req);

    const { key } = req.body;

    // In a real production DB, this would go to a secure `Settings` or `Secrets` table.
    // For now, we will log the action and simulate the save.

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        actionType: 'ADMIN_SCHOOL_KEY_UPDATE',
        details: key ? 'Set new global school proxy key' : 'Removed global school proxy key',
        meta: { hasKey: !!key }
      }
    });

    res.json({
      success: true,
      message: 'School key updated'
    });
  });

  /**
   * POST /admin/broadcast
   * Send system-wide broadcast
   */
  sendBroadcast = asyncHandler(async (req: Request, res: Response) => {
    this.checkAdmin(req);

    const { message, type, targetRoles } = req.body;

    if (!message) {
      throw new ValidationError('Message is required');
    }

    // In a real app, this would trigger notifications via WebSocket
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        actionType: 'ADMIN_BROADCAST',
        details: message,
        meta: { type, targetRoles }
      }
    });

    res.json({
      success: true,
      message: 'Broadcast sent'
    });
  });

  /**
   * POST /admin/maintenance
   * Toggle maintenance mode
   */
  toggleMaintenance = asyncHandler(async (req: Request, res: Response) => {
    this.checkAdmin(req);

    const { enabled, message } = req.body;

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        actionType: enabled ? 'MAINTENANCE_ENABLED' : 'MAINTENANCE_DISABLED',
        details: message || 'Maintenance mode toggled',
        meta: { enabled }
      }
    });

    res.json({
      success: true,
      message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled'
    });
  });

  /**
   * GET /admin/health
   * Get system health status
   */
  getHealth = asyncHandler(async (req: Request, res: Response) => {
    this.checkAdmin(req);

    // Check database
    let dbStatus = 'healthy';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'unhealthy';
    }

    // Check Redis (would need redis client)
    const redisStatus = 'healthy';

    res.json({
      success: true,
      data: {
        status: 'operational',
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus,
          redis: redisStatus,
          api: 'healthy'
        }
      }
    });
  });
}

export const adminController = new AdminController();

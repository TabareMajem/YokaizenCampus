import { Request, Response } from 'express';
import { z } from 'zod';
import { parentService } from '../services/ParentService';
import { asyncHandler, ValidationError, ForbiddenError } from '../middleware/errorHandler';

// Validation schemas
const linkChildSchema = z.object({
  studentEmail: z.string().email('Valid student email is required'),
  relationshipType: z.enum(['PARENT', 'GUARDIAN', 'OTHER']).optional().default('PARENT')
});

const verifyLinkSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
});

const notificationPrefsSchema = z.object({
  weeklyReports: z.boolean().optional(),
  achievementAlerts: z.boolean().optional(),
  lowCreditAlerts: z.boolean().optional(),
  activitySummary: z.boolean().optional(),
  emailFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional()
});

export class ParentController {
  /**
   * POST /parent/link
   * Request to link with a student account
   */
  linkChild = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'PARENT') {
      throw new ForbiddenError('Only parents can link to student accounts');
    }

    const validation = linkChildSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const result = await parentService.requestLink(
      req.user!.userId,
      validation.data.studentEmail,
      validation.data.relationshipType
    );

    res.json({
      success: true,
      message: 'Link request sent to student',
      data: result
    });
  });

  /**
   * POST /parent/verify-link
   * Verify a parent-child link (called by student)
   */
  verifyLink = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'STUDENT') {
      throw new ForbiddenError('Only students can verify parent links');
    }

    const validation = verifyLinkSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const result = await parentService.verifyLink(
      req.user!.userId,
      validation.data.token
    );

    res.json({
      success: true,
      message: 'Parent link verified',
      data: result
    });
  });

  /**
   * GET /parent/children
   * Get linked children
   */
  getChildren = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'PARENT') {
      throw new ForbiddenError('Only parents can view linked children');
    }

    const children = await parentService.getLinkedChildren(req.user!.userId);

    res.json({
      success: true,
      data: children
    });
  });

  /**
   * DELETE /parent/children/:studentId
   * Unlink a child
   */
  unlinkChild = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'PARENT') {
      throw new ForbiddenError('Only parents can unlink children');
    }

    await parentService.unlinkChild(req.user!.userId, req.params.studentId);

    res.json({
      success: true,
      message: 'Child unlinked'
    });
  });

  /**
   * GET /parent/child/:studentId/report
   * Get weekly report for a child
   */
  getChildReport = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'PARENT') {
      throw new ForbiddenError('Only parents can view child reports');
    }

    const { period } = req.query;

    const report = await parentService.getChildReport(
      req.user!.userId,
      req.params.studentId,
      (period as 'week' | 'month' | 'all') || 'week'
    );

    res.json({
      success: true,
      data: report
    });
  });

  /**
   * GET /parent/child/:studentId/progress
   * Get child's progress and career path
   */
  getChildProgress = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'PARENT') {
      throw new ForbiddenError('Only parents can view child progress');
    }

    const progress = await parentService.getChildProgress(
      req.user!.userId,
      req.params.studentId
    );

    res.json({
      success: true,
      data: progress
    });
  });

  /**
   * GET /parent/child/:studentId/activity
   * Get child's recent activity
   */
  getChildActivity = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'PARENT') {
      throw new ForbiddenError('Only parents can view child activity');
    }

    const { limit, offset } = req.query;

    const activity = await parentService.getChildActivity(
      req.user!.userId,
      req.params.studentId,
      {
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      }
    );

    res.json({
      success: true,
      data: activity
    });
  });

  /**
   * GET /parent/child/:studentId/achievements
   * Get child's achievements
   */
  getChildAchievements = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'PARENT') {
      throw new ForbiddenError('Only parents can view child achievements');
    }

    const achievements = await parentService.getChildAchievements(
      req.user!.userId,
      req.params.studentId
    );

    res.json({
      success: true,
      data: achievements
    });
  });

  /**
   * GET /parent/child/:studentId/credits
   * Get child's credit history
   */
  getChildCredits = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'PARENT') {
      throw new ForbiddenError('Only parents can view child credits');
    }

    const credits = await parentService.getChildCreditHistory(
      req.user!.userId,
      req.params.studentId
    );

    res.json({
      success: true,
      data: credits
    });
  });

  /**
   * POST /parent/child/:studentId/sponsor
   * Sponsor credits for a child
   */
  sponsorChild = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'PARENT') {
      throw new ForbiddenError('Only parents can sponsor credits');
    }

    const { credits, message } = req.body;

    if (!credits || credits < 1 || credits > 5000) {
      throw new ValidationError('Credits must be between 1 and 5000');
    }

    const result = await parentService.sponsorCredits(
      req.user!.userId,
      req.params.studentId,
      credits,
      message
    );

    res.json({
      success: true,
      message: `Sponsored ${credits} credits`,
      data: result
    });
  });

  /**
   * GET /parent/notifications
   * Get notification preferences
   */
  getNotificationPrefs = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'PARENT') {
      throw new ForbiddenError('Only parents can view notification preferences');
    }

    const prefs = await parentService.getNotificationPreferences(req.user!.userId);

    res.json({
      success: true,
      data: prefs
    });
  });

  /**
   * PATCH /parent/notifications
   * Update notification preferences
   */
  updateNotificationPrefs = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'PARENT') {
      throw new ForbiddenError('Only parents can update notification preferences');
    }

    const validation = notificationPrefsSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const prefs = await parentService.updateNotificationPreferences(
      req.user!.userId,
      validation.data
    );

    res.json({
      success: true,
      message: 'Notification preferences updated',
      data: prefs
    });
  });

  /**
   * GET /parent/pending-links
   * Get pending link requests (for students to view)
   */
  getPendingLinks = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'STUDENT') {
      throw new ForbiddenError('Only students can view pending parent links');
    }

    const pending = await parentService.getPendingLinks(req.user!.userId);

    res.json({
      success: true,
      data: pending
    });
  });

  /**
   * POST /parent/reject-link
   * Reject a parent link request (for students)
   */
  rejectLink = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'STUDENT') {
      throw new ForbiddenError('Only students can reject parent links');
    }

    const { token } = req.body;

    if (!token) {
      throw new ValidationError('Token is required');
    }

    await parentService.rejectLink(req.user!.userId, token);

    res.json({
      success: true,
      message: 'Link request rejected'
    });
  });

  /**
   * GET /parent/dashboard
   * Get parent dashboard overview
   */
  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'PARENT') {
      throw new ForbiddenError('Only parents can view dashboard');
    }

    const dashboard = await parentService.getDashboard(req.user!.userId);

    res.json({
      success: true,
      data: dashboard
    });
  });
}

export const parentController = new ParentController();

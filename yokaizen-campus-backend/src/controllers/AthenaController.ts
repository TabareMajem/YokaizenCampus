import { Request, Response } from 'express';
import { z } from 'zod';
import { athenaService } from '../services/AthenaService';
import { asyncHandler, ValidationError, ForbiddenError } from '../middleware/errorHandler';

// Validation schemas
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export class AthenaController {
  /**
   * GET /athena/classroom/:id
   * Get real-time classroom insights
   */
  getClassroomInsights = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only teachers can access Athena insights');
    }

    const insights = await athenaService.getClassroomInsights(
      req.params.id,
      req.user!.id
    );

    res.json({
      success: true,
      data: insights
    });
  });

  /**
   * GET /athena/classroom/:id/heatmap
   * Get student status heatmap data
   */
  getHeatmap = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only teachers can access heatmap');
    }

    const heatmap = await athenaService.getStatusHeatmap(
      req.params.id,
      req.user!.id
    );

    res.json({
      success: true,
      data: heatmap
    });
  });

  /**
   * GET /athena/classroom/:id/velocity
   * Get class velocity over time
   */
  getVelocity = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only teachers can access velocity data');
    }

    const { period } = req.query;

    const velocity = await athenaService.getVelocityHistory(
      req.params.id,
      req.user!.id,
      (period as 'hour' | 'day' | 'week') || 'hour'
    );

    res.json({
      success: true,
      data: velocity
    });
  });

  /**
   * GET /athena/classroom/:id/alerts
   * Get active alerts for a classroom
   */
  getAlerts = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only teachers can view alerts');
    }

    const alerts = await athenaService.getActiveAlerts(
      req.params.id,
      req.user!.id
    );

    res.json({
      success: true,
      data: alerts
    });
  });

  /**
   * POST /athena/classroom/:id/alerts/:alertId/dismiss
   * Dismiss an alert
   */
  dismissAlert = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only teachers can dismiss alerts');
    }

    await athenaService.dismissAlert(
      req.params.id,
      req.params.alertId,
      req.user!.id
    );

    res.json({
      success: true,
      message: 'Alert dismissed'
    });
  });

  /**
   * GET /athena/classroom/:id/summary
   * Get AI-generated classroom summary
   */
  getSummary = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only teachers can access summaries');
    }

    const summary = await athenaService.generateSummary(
      req.params.id,
      req.user!.id
    );

    res.json({
      success: true,
      data: summary
    });
  });

  /**
   * GET /athena/classroom/:id/students
   * Get individual student analytics
   */
  getStudentAnalytics = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only teachers can access student analytics');
    }

    const analytics = await athenaService.getStudentAnalytics(
      req.params.id,
      req.user!.id
    );

    res.json({
      success: true,
      data: analytics
    });
  });

  /**
   * GET /athena/classroom/:id/student/:studentId
   * Get detailed analytics for a specific student
   */
  getStudentDetails = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only teachers can access student details');
    }

    const details = await athenaService.getStudentDetails(
      req.params.id,
      req.params.studentId,
      req.user!.id
    );

    res.json({
      success: true,
      data: details
    });
  });

  /**
   * GET /athena/classroom/:id/graphs
   * Get graph complexity analysis for the classroom
   */
  getGraphAnalysis = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only teachers can access graph analysis');
    }

    const analysis = await athenaService.analyzeClassroomGraphs(
      req.params.id,
      req.user!.id
    );

    res.json({
      success: true,
      data: analysis
    });
  });

  /**
   * GET /athena/classroom/:id/trends
   * Get classroom trends over time
   */
  getTrends = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only teachers can access trends');
    }

    const { startDate, endDate } = req.query;

    const trends = await athenaService.getClassroomTrends(
      req.params.id,
      req.user!.id,
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      }
    );

    res.json({
      success: true,
      data: trends
    });
  });

  /**
   * GET /athena/classroom/:id/suggestions
   * Get AI-powered teaching suggestions
   */
  getSuggestions = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only teachers can access suggestions');
    }

    const suggestions = await athenaService.getTeachingSuggestions(
      req.params.id,
      req.user!.id
    );

    res.json({
      success: true,
      data: suggestions
    });
  });

  /**
   * GET /athena/school
   * Get school-wide analytics (Admin only)
   */
  getSchoolAnalytics = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can access school analytics');
    }

    const { schoolId } = req.query;

    const analytics = await athenaService.getSchoolAnalytics(
      schoolId as string,
      req.user!.id
    );

    res.json({
      success: true,
      data: analytics
    });
  });

  /**
   * GET /athena/dashboard
   * Get teacher dashboard overview
   */
  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only teachers can access dashboard');
    }

    const dashboard = await athenaService.getTeacherDashboard(req.user!.id);

    res.json({
      success: true,
      data: dashboard
    });
  });

  /**
   * POST /athena/classroom/:id/intervention
   * Log a teaching intervention
   */
  logIntervention = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only teachers can log interventions');
    }

    const { type, description, studentIds, outcome } = req.body;

    if (!type || !description) {
      throw new ValidationError('Type and description are required');
    }

    const intervention = await athenaService.logIntervention(
      req.params.id,
      req.user!.id,
      { type, description, studentIds, outcome }
    );

    res.json({
      success: true,
      message: 'Intervention logged',
      data: intervention
    });
  });

  /**
   * GET /athena/classroom/:id/interventions
   * Get intervention history
   */
  getInterventions = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only teachers can view interventions');
    }

    const interventions = await athenaService.getInterventionHistory(
      req.params.id,
      req.user!.id
    );

    res.json({
      success: true,
      data: interventions
    });
  });

  /**
   * GET /athena/export/:classroomId
   * Export classroom analytics data
   */
  exportData = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only teachers can export data');
    }

    const { format } = req.query;

    const data = await athenaService.exportClassroomData(
      req.params.classroomId,
      req.user!.id,
      (format as 'json' | 'csv') || 'json'
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=classroom-${req.params.classroomId}-export.csv`);
      res.send(data);
    } else {
      res.json({
        success: true,
        data
      });
    }
  });
}

export const athenaController = new AthenaController();

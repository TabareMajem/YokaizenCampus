import { Router } from 'express';
import { athenaController } from '../controllers';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication and teacher role
router.use(authenticate);
router.use(requireRole('TEACHER', 'ADMIN'));

// Teacher dashboard
router.get('/dashboard', athenaController.getDashboard);

// Classroom-specific analytics
router.get('/classroom/:id', athenaController.getClassroomInsights);
router.get('/classroom/:id/heatmap', athenaController.getHeatmap);
router.get('/classroom/:id/velocity', athenaController.getVelocity);
router.get('/classroom/:id/summary', athenaController.getSummary);
router.get('/classroom/:id/trends', athenaController.getTrends);
router.get('/classroom/:id/suggestions', athenaController.getSuggestions);
router.get('/classroom/:id/graphs', athenaController.getGraphAnalysis);

// Alerts
router.get('/classroom/:id/alerts', athenaController.getAlerts);
router.post('/classroom/:id/alerts/:alertId/dismiss', athenaController.dismissAlert);

// Student analytics
router.get('/classroom/:id/students', athenaController.getStudentAnalytics);
router.get('/classroom/:id/student/:studentId', athenaController.getStudentDetails);

// Interventions
router.get('/classroom/:id/interventions', athenaController.getInterventions);
router.post('/classroom/:id/intervention', athenaController.logIntervention);

// Export
router.get('/export/:classroomId', athenaController.exportData);

// School-wide (admin only)
router.get('/school', requireRole('ADMIN'), athenaController.getSchoolAnalytics);

export default router;

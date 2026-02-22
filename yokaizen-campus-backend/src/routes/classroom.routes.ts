import { Router } from 'express';
import { classroomController } from '../controllers';
import { authenticate, requireRole, requireClassroomAccess } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Classroom CRUD
router.post('/', requireRole('TEACHER', 'ADMIN'), classroomController.create);
router.get('/', classroomController.getAll);
router.post('/join', requireRole('STUDENT'), classroomController.join);

// Specific classroom routes
router.get('/:id', requireClassroomAccess, classroomController.getOne);
router.patch('/:id', requireRole('TEACHER', 'ADMIN'), classroomController.update);
router.delete('/:id', requireRole('TEACHER', 'ADMIN'), classroomController.delete);

// Student actions
router.post('/:id/leave', requireRole('STUDENT'), classroomController.leave);
router.post('/:id/hand', requireClassroomAccess, classroomController.raiseHand);
router.delete('/:id/hand', requireClassroomAccess, classroomController.lowerHand);

// Teacher actions
router.get('/:id/live', rateLimiter.classroomEvent, requireRole('TEACHER', 'ADMIN'), classroomController.getLiveState);
router.get('/:id/hands', requireRole('TEACHER', 'ADMIN'), classroomController.getRaisedHands);
router.post('/:id/credits', requireRole('TEACHER', 'ADMIN'), classroomController.grantCredits);
router.post('/:id/broadcast', requireRole('TEACHER', 'ADMIN'), classroomController.broadcast);
router.post('/:id/chaos', requireRole('TEACHER', 'ADMIN'), classroomController.triggerChaos);
router.post('/:id/philosophy', requireRole('TEACHER', 'ADMIN'), classroomController.changePhilosophy);
router.post('/:id/grade/:studentId', requireRole('TEACHER', 'ADMIN'), classroomController.gradeStudent);

export default router;

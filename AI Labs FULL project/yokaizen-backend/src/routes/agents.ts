import { Router } from 'express';
import { agentController } from '@controllers/AgentController';
import { authenticate } from '@middleware/auth';
import { checkRole, checkTier } from '@middleware/roles';
import { UserRole, UserTier } from '@entities/User';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// List agents
router.get('/', agentController.listAgents);

// Create agent
router.post('/', agentController.createAgent);

// Get available skills
router.get('/skills', agentController.listSkills);

// Get specific agent
router.get('/:id', agentController.getAgent);

// Skills
router.get('/skills', agentController.listSkills);
router.post('/:id/skills', agentController.addSkill);
router.delete('/:id/skills/:skillId', agentController.removeSkill);

router.get('/:id/tasks', agentController.getAgentTasks); // Logs
router.get('/:id/schedules', agentController.getSchedules);
router.post('/:id/schedules', agentController.createSchedule);
router.delete('/:id/schedules/:scheduleId', agentController.deleteSchedule);

export default router;

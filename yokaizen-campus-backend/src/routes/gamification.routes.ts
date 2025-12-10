import { Router } from 'express';
import { gamificationController } from '../controllers';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Profile and progress
router.get('/profile', gamificationController.getProfile);
router.get('/career', gamificationController.getCareerPath);
router.get('/progress', gamificationController.getProgress);
router.get('/rank', gamificationController.getRank);
router.get('/stats', gamificationController.getStats);

// XP and levels
router.get('/xp-history', gamificationController.getXPHistory);
router.get('/streaks', gamificationController.getStreaks);

// Nodes
router.get('/nodes', gamificationController.getNodes);

// Achievements and badges
router.get('/achievements', gamificationController.getAchievements);
router.post('/achievements/claim', gamificationController.claimAchievement);
router.post('/check-achievements', gamificationController.checkAchievements);
router.get('/badges', gamificationController.getBadges);
router.post('/badges/:id/display', gamificationController.displayBadge);

// Titles
router.get('/titles', gamificationController.getTitles);
router.post('/titles/:id/equip', gamificationController.equipTitle);

// Leaderboards
router.get('/leaderboard', gamificationController.getLeaderboard);
router.get('/classroom/:id/leaderboard', gamificationController.getClassroomLeaderboard);

// Challenges
router.get('/challenges', gamificationController.getChallenges);
router.post('/challenges/:id/join', gamificationController.joinChallenge);

// Rewards
router.get('/rewards', gamificationController.getRewards);
router.post('/rewards/:id/redeem', gamificationController.redeemReward);

export default router;

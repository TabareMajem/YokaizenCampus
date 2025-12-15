import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './user';
import gameRoutes from './games';
import squadRoutes from './squads';
import aiRoutes from './ai';
import paymentRoutes from './payments';
import leaderboardRoutes from './leaderboard';
import adminRoutes from './admin';
import competitionRoutes from './competitions';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/games', gameRoutes);
router.use('/squads', squadRoutes);
router.use('/ai', aiRoutes);
router.use('/payments', paymentRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/admin', adminRoutes);
router.use('/competitions', competitionRoutes);

export default router;

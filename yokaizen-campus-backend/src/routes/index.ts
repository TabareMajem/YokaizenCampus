import { Router } from 'express';
import authRoutes from './auth.routes';
import classroomRoutes from './classroom.routes';
import graphRoutes from './graph.routes';
import aiRoutes from './ai.routes';
import paymentRoutes from './payment.routes';
import ngoRoutes from './ngo.routes';
import arRoutes from './ar.routes';
import parentRoutes from './parent.routes';
import athenaRoutes from './athena.routes';
import gamificationRoutes from './gamification.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/classroom', classroomRoutes);
router.use('/graph', graphRoutes);
router.use('/ai', aiRoutes);
router.use('/payment', paymentRoutes);
router.use('/ngo', ngoRoutes);
router.use('/ar', arRoutes);
router.use('/parent', parentRoutes);
router.use('/athena', athenaRoutes);
router.use('/gamification', gamificationRoutes);
router.use('/admin', adminRoutes);

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

export default router;

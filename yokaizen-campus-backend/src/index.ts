import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { initializeSocketGateway } from './sockets';
import { prisma } from './utils/prisma';
import { getRedisClient } from './utils/redis';

// Create Express app
const app: Express = express();
const httpServer = createServer(app);

// Initialize Socket.io
const socketGateway = initializeSocketGateway(httpServer);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression
app.use(compression());

// Request logging
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// Body parsing - with raw body for Stripe webhooks
app.use('/api/v1/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Store raw body for webhook verification
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.originalUrl === '/api/v1/payment/webhook') {
    (req as any).rawBody = req.body;
  }
  next();
});

// Health check (before routes for load balancer)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: socketGateway.getConnectionsCount()
  });
});

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  httpServer.close(async () => {
    console.log('HTTP server closed');

    // Close database connections
    await prisma.$disconnect();
    console.log('Database disconnected');

    // Close Redis connection
    await redis.quit();
    console.log('Redis disconnected');

    console.log('Graceful shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Test Redis connection
    const redis = getRedisClient();
    await redis.ping();
    console.log('✅ Redis connected');

    // Start HTTP server
    httpServer.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎓 Yokaizen Campus Backend                               ║
║                                                            ║
║   Server running on port ${String(config.port || 7789).padEnd(30)}║
║   Environment: ${String(config.nodeEnv || 'production').padEnd(36)}║
║   Mock AI Mode: ${(config.features?.mockAI ? 'enabled' : 'disabled').padEnd(35)}║
║                                                            ║
║   API:    http://localhost:${config.port}/api/v1              ║
║   Health: http://localhost:${config.port}/health              ║
║   Docs:   http://localhost:${config.port}/api/v1/docs         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { app, httpServer, socketGateway };

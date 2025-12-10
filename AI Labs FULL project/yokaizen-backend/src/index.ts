import 'reflect-metadata';
import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { config } from '@config/env';
import { AppDataSource } from '@config/database';
import { redis } from '@config/redis';
import { logger, httpLogger } from '@config/logger';

import routes from '@routes/index';
import { initializeSocketServer, startTickerUpdates } from '@socket/index';
import { scheduleRecurringJobs, closeWorkers } from '@jobs/index';

import {
  notFoundHandler,
  errorHandler,
  securityErrorLogger,
  timeoutHandler,
  databaseErrorHandler,
  stripeErrorHandler,
  multerErrorHandler,
} from '@middleware/errorHandler';
import { sanitizeInput } from '@middleware/validation';
import { ipRateLimit } from '@middleware/rateLimit';

const app: Express = express();
const httpServer = createServer(app);

// =========== Security Middleware ===========

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: config.app.corsOrigins.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// =========== Request Processing Middleware ===========

// Compression
app.use(compression());

// Request timeout
app.use(timeoutHandler(30000));

// Global IP rate limiting (before body parsing)
app.use(ipRateLimit(100, 60000)); // 100 requests per minute per IP

// Body parsing (skip for webhook routes that need raw body)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/api/v1/payments/webhook') {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// =========== Logging ===========

// HTTP request logging
const morganFormat = config.app.nodeEnv === 'production' 
  ? 'combined' 
  : 'dev';

app.use(morgan(morganFormat, {
  stream: {
    write: (message: string) => {
      httpLogger.info(message.trim());
    },
  },
  skip: (req: Request) => {
    // Skip health check logging in production
    return config.app.nodeEnv === 'production' && req.path === '/api/v1/health';
  },
}));

// =========== Routes ===========

// API routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Yokaizen AI Labs API',
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    documentation: '/api/v1/docs',
  });
});

// =========== Error Handling ===========

// 404 handler
app.use(notFoundHandler);

// Error handlers (order matters)
app.use(multerErrorHandler);
app.use(databaseErrorHandler);
app.use(stripeErrorHandler);
app.use(securityErrorLogger);
app.use(errorHandler);

// =========== Server Initialization ===========

async function startServer(): Promise<void> {
  try {
    // Initialize database connection
    logger.info('Connecting to database...');
    await AppDataSource.initialize();
    logger.info('Database connected successfully');

    // Test Redis connection
    logger.info('Testing Redis connection...');
    await redis.ping();
    logger.info('Redis connected successfully');

    // Initialize Socket.io
    const io = initializeSocketServer(httpServer);
    
    // Start ticker updates
    startTickerUpdates(io);

    // Schedule recurring jobs
    await scheduleRecurringJobs();

    // Start HTTP server
    httpServer.listen(config.app.port, () => {
      logger.info(`🚀 Server running on port ${config.app.port}`);
      logger.info(`📦 Environment: ${config.app.nodeEnv}`);
      logger.info(`🔗 API Base: http://localhost:${config.app.port}/api/v1`);
      logger.info(`🔌 WebSocket: ws://localhost:${config.app.port}`);
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// =========== Graceful Shutdown ===========

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    // Close job workers
    await closeWorkers();

    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('Database connection closed');
    }

    // Close Redis connection
    await redis.quit();
    logger.info('Redis connection closed');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection', { reason });
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();

export { app, httpServer };

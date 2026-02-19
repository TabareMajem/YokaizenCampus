import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from './env';
import path from 'path';
import fs from 'fs';

// Ensure log directory exists
const logDir = path.resolve(config.logging.dir);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.printf(({ level, message, timestamp, metadata }) => {
    const meta = Object.keys(metadata).length
      ? JSON.stringify(metadata, null, config.server.isDevelopment ? 2 : 0)
      : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${meta}`;
  })
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level}: ${message}`;
  })
);

// Transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
    level: config.server.isDevelopment ? 'debug' : 'info',
  }),
];

// Add file transports in production
if (config.server.isProduction) {
  // Error logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    })
  );

  // Combined logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: logFormat,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'yokaizen-backend' },
  transports,
  exitOnError: false,
});

// Stream for Morgan HTTP logging
export const httpLogStream = {
  write: (message: string): void => {
    logger.info(message.trim());
  },
};

// Specialized loggers
export const loggers = {
  // HTTP request logger
  http: (method: string, url: string, statusCode: number, duration: number): void => {
    logger.info(`${method} ${url} ${statusCode} ${duration}ms`);
  },

  // Database query logger
  db: (query: string, params: unknown[], duration: number): void => {
    if (config.server.isDevelopment) {
      logger.debug(`DB Query: ${query}`, { params, duration: `${duration}ms` });
    }
  },

  // AI service logger
  ai: (service: string, action: string, details?: object): void => {
    logger.info(`AI [${service}] ${action}`, details);
  },

  // Payment logger
  payment: (action: string, userId: string, details?: object): void => {
    logger.info(`Payment: ${action}`, { userId, ...details });
  },

  // Socket event logger
  socket: (event: string, userId: string, details?: object): void => {
    logger.debug(`Socket [${event}]`, { userId, ...details });
  },

  // Error logger with stack trace
  error: (error: Error, context?: object): void => {
    logger.error(error.message, {
      stack: error.stack,
      ...context,
    });
  },

  // Security event logger
  security: (event: string, details: object): void => {
    logger.warn(`Security: ${event}`, details);
  },

  // Performance logger
  perf: (operation: string, duration: number, details?: object): void => {
    if (duration > 1000) {
      logger.warn(`Slow operation: ${operation} took ${duration}ms`, details);
    } else {
      logger.debug(`Perf: ${operation} ${duration}ms`, details);
    }
  },
};

// ============================================
// BACKWARDS COMPATIBLE LOGGER ALIASES
// ============================================

export const aiLogger = {
  info: (message: string, details?: object) => loggers.ai('GenAI', message, details),
  error: (error: Error, context?: object) => loggers.error(error, context),
  warn: (message: string, details?: object) => logger.warn(message, details),
  debug: (message: string, details?: object) => logger.debug(message, details),
};

export const paymentLogger = {
  info: (action: string, userId: string, details?: object) => loggers.payment(action, userId, details),
  error: (error: Error, context?: object) => loggers.error(error, context),
  warn: (message: string, details?: object) => logger.warn(message, details),
};

export const socketLogger = {
  info: (message: string, details?: object) => logger.info(`Socket: ${message}`, details),
  error: (error: Error | string, context?: object) => {
    if (typeof error === 'string') {
      logger.error(`Socket: ${error}`, context);
    } else {
      loggers.error(error, context);
    }
  },
  warn: (message: string, details?: object) => logger.warn(`Socket: ${message}`, details),
  debug: (message: string, details?: object) => logger.debug(`Socket: ${message}`, details),
};

export const securityLogger = {
  info: (message: string, details?: object) => logger.info(`Security: ${message}`, details),
  warn: (message: string, details?: object) => logger.warn(`Security: ${message}`, details),
  error: (error: Error, context?: object) => loggers.error(error, context),
};

export const dbLogger = {
  debug: (message: string, context?: object) => logger.debug(`DB: ${message}`, context),
  error: (error: Error, context?: object) => loggers.error(error, context),
};

export const perfLogger = {
  info: (message: string, details?: object) => logger.info(`Perf: ${message}`, details),
  warn: (message: string, details?: object) => logger.warn(`Perf: ${message}`, details),
};

export const httpLogger = logger;
export default logger;

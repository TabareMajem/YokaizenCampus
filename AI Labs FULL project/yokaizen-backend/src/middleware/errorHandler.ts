import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError, formatZodErrors, formatErrorResponse } from '@utils/errors';
import { logger, securityLogger } from '@config/logger';
import { config } from '@config/env';

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = ApiError.notFound(`Route not found: ${req.method} ${req.path}`);
  next(error);
};

/**
 * Global error handler
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default to 500 internal error
  let statusCode = 500;
  let response: ReturnType<typeof formatErrorResponse>;

  if (err instanceof ApiError) {
    // Known operational errors
    statusCode = err.statusCode;
    response = formatErrorResponse(err);

    // Log based on severity
    if (statusCode >= 500) {
      logger.error('Server error', {
        error: err.message,
        code: err.code,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId: (req as any).user?.userId,
      });
    } else if (statusCode >= 400) {
      logger.warn('Client error', {
        error: err.message,
        code: err.code,
        path: req.path,
        method: req.method,
        userId: (req as any).user?.userId,
      });
    }
  } else if (err instanceof ZodError) {
    // Validation errors from Zod
    statusCode = 400;
    const validationErrors = formatZodErrors(err);
    response = {
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VAL_001',
        details: validationErrors,
      },
    };

    logger.warn('Validation error', {
      errors: validationErrors,
      path: req.path,
    });
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    // JSON parsing errors
    statusCode = 400;
    response = {
      success: false,
      error: {
        message: 'Invalid JSON in request body',
        code: 'VAL_002',
      },
    };
  } else if (err.name === 'PayloadTooLargeError') {
    statusCode = 413;
    response = {
      success: false,
      error: {
        message: 'Request payload too large',
        code: 'VAL_003',
      },
    };
  } else {
    // Unknown/programmer errors - log full details
    logger.error('Unhandled error', {
      error: err.message,
      name: err.name,
      stack: err.stack,
      path: req.path,
      method: req.method,
      userId: (req as any).user?.userId,
      body: config.app.nodeEnv === 'development' ? req.body : undefined,
    });

    response = {
      success: false,
      error: {
        message: config.app.nodeEnv === 'production' 
          ? 'An unexpected error occurred' 
          : err.message,
        code: 'INT_001',
        // Only include stack in development
        ...(config.app.nodeEnv === 'development' && { stack: err.stack }),
      },
    };
  }

  // Security: Don't leak error details for auth/security errors in production
  if (config.app.nodeEnv === 'production' && statusCode === 401) {
    response.error.message = 'Authentication failed';
    delete response.error.details;
  }

  res.status(statusCode).json(response);
};

/**
 * Handle uncaught async errors
 */
export const asyncErrorHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Log security-related errors
 */
export const securityErrorLogger = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof ApiError) {
    // Log potential security issues
    if (
      err.statusCode === 401 || 
      err.statusCode === 403 ||
      err.code?.startsWith('AUTH_') ||
      err.code?.startsWith('RATE_')
    ) {
      securityLogger.warn('Security event', {
        type: err.code,
        message: err.message,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method,
        userId: (req as any).user?.userId,
      });
    }
  }

  next(err);
};

/**
 * Timeout handler middleware
 */
export const timeoutHandler = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          path: req.path,
          method: req.method,
          timeout,
        });

        res.status(408).json({
          success: false,
          error: {
            message: 'Request timeout',
            code: 'INT_002',
          },
        });
      }
    }, timeout);

    res.on('finish', () => {
      clearTimeout(timeoutId);
    });

    res.on('close', () => {
      clearTimeout(timeoutId);
    });

    next();
  };
};

/**
 * Handle multer (file upload) errors
 */
export const multerErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    next(ApiError.validation('File too large'));
    return;
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    next(ApiError.validation('Too many files'));
    return;
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    next(ApiError.validation('Unexpected file field'));
    return;
  }

  next(err);
};

/**
 * Database error handler
 */
export const databaseErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // PostgreSQL error codes
  if (err.code === '23505') {
    // Unique violation
    next(ApiError.conflict('Resource already exists'));
    return;
  }

  if (err.code === '23503') {
    // Foreign key violation
    next(ApiError.badRequest('Referenced resource not found'));
    return;
  }

  if (err.code === '22P02') {
    // Invalid text representation (bad UUID, etc.)
    next(ApiError.badRequest('Invalid data format'));
    return;
  }

  if (err.code === 'ECONNREFUSED') {
    logger.error('Database connection refused', { error: err });
    next(ApiError.serviceUnavailable('Database temporarily unavailable'));
    return;
  }

  next(err);
};

/**
 * Stripe error handler
 */
export const stripeErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err.type === 'StripeCardError') {
    next(ApiError.badRequest(err.message));
    return;
  }

  if (err.type === 'StripeRateLimitError') {
    next(ApiError.rateLimitExceeded('Payment service rate limit exceeded'));
    return;
  }

  if (err.type === 'StripeInvalidRequestError') {
    next(ApiError.badRequest('Invalid payment request'));
    return;
  }

  if (err.type === 'StripeAPIError' || err.type === 'StripeConnectionError') {
    logger.error('Stripe service error', { error: err });
    next(ApiError.serviceUnavailable('Payment service temporarily unavailable'));
    return;
  }

  if (err.type === 'StripeAuthenticationError') {
    logger.error('Stripe authentication error', { error: err });
    next(ApiError.internal('Payment configuration error'));
    return;
  }

  next(err);
};

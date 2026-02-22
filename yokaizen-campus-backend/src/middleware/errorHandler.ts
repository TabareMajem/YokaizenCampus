// Yokaizen Campus - Error Handling Middleware
// Centralized error handling and validation

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError as ExpressValidationError } from 'express-validator';
import { ZodError } from 'zod';
import { config } from '../config/index.js';
import { APIResponse } from '../types/index.js';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  public errors: string[];

  constructor(errors: string[] | string) {
    super('Validation failed', 400);
    this.errors = Array.isArray(errors) ? errors : [errors];
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

export class InsufficientCreditsError extends AppError {
  public required: number;
  public available: number;

  constructor(required: number, available: number) {
    super(`Insufficient credits: requires ${required}, have ${available}`, 402);
    this.required = required;
    this.available = available;
  }
}

// Validation middleware (express-validator)
export function validate(
  req: Request,
  res: Response<APIResponse>,
  next: NextFunction
): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err: ExpressValidationError) => {
      if (err.type === 'field') {
        return `${err.path}: ${err.msg}`;
      }
      return err.msg;
    });

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: errorMessages.join(', '),
    });
    return;
  }

  next();
}

// Zod validation wrapper
export function validateZod<T>(schema: { parse: (data: unknown) => T }) {
  return (req: Request, res: Response<APIResponse>, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(
          (e) => `${e.path.join('.')}: ${e.message}`
        );

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: errorMessages.join(', '),
        });
        return;
      }

      next(error);
    }
  };
}

// Async handler wrapper
export function asyncHandler<T>(
  fn: (req: Request, res: Response<APIResponse<T>>, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response<APIResponse<T>>, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Global error handler
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<APIResponse>,
  _next: NextFunction
): void {
  // Log error
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: config.env === 'development' ? err.stack : undefined,
  });

  // Handle known error types
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err instanceof ValidationError && { message: err.errors.join(', ') }),
      ...(err instanceof InsufficientCreditsError && {
        message: `Required: ${err.required}, Available: ${err.available}`,
      }),
    });
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as unknown as { code: string; meta?: { target?: string[] } };

    switch (prismaError.code) {
      case 'P2002': // Unique constraint violation
        res.status(409).json({
          success: false,
          error: 'Resource already exists',
          message: `Duplicate value for: ${prismaError.meta?.target?.join(', ') || 'field'}`,
        });
        return;
      case 'P2025': // Record not found
        res.status(404).json({
          success: false,
          error: 'Resource not found',
        });
        return;
      case 'P2003': // Foreign key constraint
        res.status(400).json({
          success: false,
          error: 'Invalid reference',
          message: 'Referenced record does not exist',
        });
        return;
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token expired',
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errorMessages = err.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`
    );

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: errorMessages.join(', '),
    });
    return;
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: config.env === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error',
  });
}

// 404 handler
export function notFoundHandler(
  req: Request,
  res: Response<APIResponse>
): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
}

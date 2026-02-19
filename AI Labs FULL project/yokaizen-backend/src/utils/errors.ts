import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';
import { ErrorCodes, ErrorCode, ApiResponse } from '../types';
import { logger } from '../config/logger';

// Custom API Error class
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  // Getter for code compatibility
  get code(): string {
    return this.errorCode;
  }

  // Factory methods for common errors
  static validation(message: string, details?: unknown): ApiError {
    return new ApiError(message, StatusCodes.BAD_REQUEST, ErrorCodes.INVALID_INPUT, details);
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(message, StatusCodes.BAD_REQUEST, ErrorCodes.INVALID_INPUT, details);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(message, StatusCodes.UNAUTHORIZED, ErrorCodes.INVALID_TOKEN);
  }

  static forbidden(message = 'Access denied'): ApiError {
    return new ApiError(message, StatusCodes.FORBIDDEN, ErrorCodes.INSUFFICIENT_PERMISSIONS);
  }

  static notFound(resource = 'Resource'): ApiError {
    return new ApiError(`${resource} not found`, StatusCodes.NOT_FOUND, ErrorCodes.NOT_FOUND);
  }

  static conflict(message: string): ApiError {
    return new ApiError(message, StatusCodes.CONFLICT, ErrorCodes.CONFLICT);
  }

  static rateLimited(message = 'Too many requests'): ApiError {
    return new ApiError(message, StatusCodes.TOO_MANY_REQUESTS, ErrorCodes.RATE_LIMITED);
  }

  static insufficientCredits(required: number, available: number): ApiError {
    return new ApiError(
      `Insufficient credits. Required: ${required}, Available: ${available}`,
      StatusCodes.PAYMENT_REQUIRED,
      ErrorCodes.INSUFFICIENT_CREDITS,
      { required, available }
    );
  }

  static subscriptionRequired(feature: string): ApiError {
    return new ApiError(
      `Subscription required to access ${feature}`,
      StatusCodes.PAYMENT_REQUIRED,
      ErrorCodes.SUBSCRIPTION_REQUIRED,
      { feature }
    );
  }

  static gameSessionInvalid(): ApiError {
    return new ApiError(
      'Invalid or expired game session',
      StatusCodes.BAD_REQUEST,
      ErrorCodes.GAME_SESSION_INVALID
    );
  }

  static insufficientEnergy(required: number, available: number): ApiError {
    return new ApiError(
      `Insufficient energy. Required: ${required}, Available: ${available}`,
      StatusCodes.BAD_REQUEST,
      ErrorCodes.INSUFFICIENT_ENERGY,
      { required, available }
    );
  }

  static aiServiceError(message: string, details?: unknown): ApiError {
    return new ApiError(message, StatusCodes.SERVICE_UNAVAILABLE, ErrorCodes.AI_SERVICE_ERROR, details);
  }

  static squadFull(): ApiError {
    return new ApiError('Squad is full', StatusCodes.CONFLICT, ErrorCodes.SQUAD_FULL);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(message, StatusCodes.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_ERROR);
  }

  // Additional factory methods for backwards compatibility
  static rateLimitExceeded(message = 'Rate limit exceeded'): ApiError {
    return new ApiError(message, StatusCodes.TOO_MANY_REQUESTS, ErrorCodes.RATE_LIMITED);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable'): ApiError {
    return new ApiError(message, StatusCodes.SERVICE_UNAVAILABLE, ErrorCodes.AI_SERVICE_ERROR);
  }

  static notImplemented(message = 'Feature not implemented'): ApiError {
    return new ApiError(message, StatusCodes.NOT_IMPLEMENTED, ErrorCodes.INTERNAL_ERROR);
  }
}

// Send error response
export const sendErrorResponse = (
  res: Response,
  error: ApiError | Error | ZodError
): Response => {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const formattedErrors = error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }));

    const response: ApiResponse = {
      success: false,
      error: {
        code: ErrorCodes.INVALID_INPUT,
        message: 'Validation failed',
        details: formattedErrors,
      },
    };

    return res.status(StatusCodes.BAD_REQUEST).json(response);
  }

  // Handle custom API errors
  if (error instanceof ApiError) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: error.errorCode,
        message: error.message,
        details: error.details,
      },
    };

    return res.status(error.statusCode).json(response);
  }

  // Handle unknown errors
  logger.error('Unhandled error', { error: error.message, stack: error.stack });

  const response: ApiResponse = {
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    },
  };

  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(response);
};

// Send success response
export const sendSuccessResponse = <T>(
  res: Response,
  data: T,
  statusCode: number = StatusCodes.OK,
  meta?: ApiResponse['meta']
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta,
  };

  return res.status(statusCode).json(response);
};

// Async handler wrapper
export const asyncHandler = <T>(
  fn: (req: T, res: Response, next: (err?: Error) => void) => Promise<unknown>
) => {
  return (req: T, res: Response, next: (err?: Error) => void): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global error handler middleware
export const globalErrorHandler = (
  err: Error,
  _req: unknown,
  res: Response,
  next: (err?: Error) => void
): void => {
  // Don't handle if headers already sent
  if (res.headersSent) {
    return next(err);
  }

  sendErrorResponse(res, err);
};

// Export formatters for ease of use in controllers
export const successResponse = <T>(data: T, meta?: ApiResponse['meta']): ApiResponse<T> => ({
  success: true,
  data,
  meta,
});

export const errorResponse = (message: string, code: string = ErrorCodes.INTERNAL_ERROR, details?: unknown): ApiResponse => ({
  success: false,
  error: {
    message,
    code,
    details,
  },
});

// Format error response for API output
export const formatErrorResponse = (error: ApiError | Error): ApiResponse['error'] & { success: false } => {
  if (error instanceof ApiError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.errorCode,
        details: error.details,
      },
    } as any;
  }
  return {
    success: false,
    error: {
      message: error.message,
      code: ErrorCodes.INTERNAL_ERROR,
    },
  } as any;
};

// Format Zod validation errors
export const formatZodErrors = (error: ZodError): { path: string; message: string }[] => {
  return error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));
};

export default {
  ApiError,
  sendErrorResponse,
  sendSuccessResponse,
  successResponse,
  errorResponse,
  formatErrorResponse,
  formatZodErrors,
  asyncHandler,
  globalErrorHandler,
};

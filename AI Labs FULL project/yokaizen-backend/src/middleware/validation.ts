import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError, formatZodErrors } from '@utils/errors';
import { logger } from '@config/logger';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Validation middleware factory
 * Validates request data against Zod schemas
 */
export const validate = (schema: ZodSchema, part: RequestPart = 'body') => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = req[part];
      const parsed = await schema.parseAsync(data);
      
      // Replace with parsed (and transformed) data
      req[part] = parsed;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrors(error);
        next(ApiError.validation('Validation failed', formattedErrors));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate multiple parts of a request at once
 */
export const validateRequest = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const errors: Record<string, any[]> = {};

    try {
      // Validate each part
      if (schemas.body) {
        try {
          req.body = await schemas.body.parseAsync(req.body);
        } catch (e) {
          if (e instanceof ZodError) {
            errors.body = e.errors;
          }
        }
      }

      if (schemas.query) {
        try {
          req.query = await schemas.query.parseAsync(req.query);
        } catch (e) {
          if (e instanceof ZodError) {
            errors.query = e.errors;
          }
        }
      }

      if (schemas.params) {
        try {
          req.params = await schemas.params.parseAsync(req.params);
        } catch (e) {
          if (e instanceof ZodError) {
            errors.params = e.errors;
          }
        }
      }

      // If any errors, format and throw
      if (Object.keys(errors).length > 0) {
        const formattedErrors: Record<string, string> = {};
        
        for (const [part, partErrors] of Object.entries(errors)) {
          for (const err of partErrors) {
            const path = err.path.join('.');
            const key = part === 'body' ? path : `${part}.${path}`;
            formattedErrors[key] = err.message;
          }
        }

        next(ApiError.validation('Validation failed', formattedErrors));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Sanitize string inputs to prevent injection
 */
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove null bytes and control characters
      return obj
        .replace(/\0/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize keys too
        const sanitizedKey = sanitize(key);
        sanitized[sanitizedKey] = sanitize(value);
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }

  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  // Enforce limits
  req.query.page = String(Math.max(1, page));
  req.query.limit = String(Math.min(100, Math.max(1, limit)));

  next();
};

/**
 * Validate file uploads
 */
export const validateFile = (options: {
  maxSize?: number;       // bytes
  allowedTypes?: string[];
  required?: boolean;
}) => {
  const { 
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
    required = false 
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const file = req.file;

    if (!file) {
      if (required) {
        next(ApiError.validation('File is required'));
        return;
      }
      next();
      return;
    }

    // Check size
    if (file.size > maxSize) {
      next(ApiError.validation(
        `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`
      ));
      return;
    }

    // Check type
    if (!allowedTypes.includes(file.mimetype)) {
      next(ApiError.validation(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      ));
      return;
    }

    next();
  };
};

/**
 * Validate UUID parameter
 */
export const validateUUID = (paramName: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];

    if (!value || !uuidRegex.test(value)) {
      next(ApiError.validation(`Invalid ${paramName} format`));
      return;
    }

    next();
  };
};

/**
 * Transform query parameters
 */
export const transformQuery = (transforms: Record<string, (value: string) => any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const [key, transform] of Object.entries(transforms)) {
      if (req.query[key] !== undefined) {
        try {
          req.query[key] = transform(req.query[key] as string);
        } catch (error) {
          next(ApiError.validation(`Invalid value for query parameter: ${key}`));
          return;
        }
      }
    }
    next();
  };
};

/**
 * Validate content type
 */
export const requireContentType = (...types: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'];

    if (!contentType) {
      next(ApiError.badRequest('Content-Type header required'));
      return;
    }

    const hasValidType = types.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!hasValidType) {
      next(ApiError.badRequest(
        `Invalid Content-Type. Expected: ${types.join(' or ')}`
      ));
      return;
    }

    next();
  };
};

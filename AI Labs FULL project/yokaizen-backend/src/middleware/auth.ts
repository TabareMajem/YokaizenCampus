import { Response, NextFunction } from 'express';
import { authService } from '@services/AuthService';
import { ApiError } from '@utils/errors';
import { AuthenticatedRequest, UserRole } from '@/types';
import { logger } from '@config/logger';

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = await authService.validateAccessToken(token);

    req.user = {
      userId: decoded.userId,
      firebaseUid: decoded.firebaseUid,
      tier: decoded.tier,
      role: decoded.role,
      squadId: decoded.squadId,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to optionally authenticate (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = await authService.validateAccessToken(token);
        req.user = {
          userId: decoded.userId,
          firebaseUid: decoded.firebaseUid,
          tier: decoded.tier,
          role: decoded.role,
          squadId: decoded.squadId,
        };
      } catch {
        // Token invalid, but we don't fail - just continue without user
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to require specific user roles
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      next(ApiError.forbidden('Insufficient permissions'));
      return;
    }

    next();
  };
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    next(ApiError.unauthorized('Authentication required'));
    return;
  }

  if (req.user.role !== UserRole.ADMIN) {
    logger.warn('Unauthorized admin access attempt', { userId: req.user.userId });
    next(ApiError.forbidden('Admin access required'));
    return;
  }

  next();
};

/**
 * Middleware to require specific subscription tiers
 */
export const requireTier = (...tiers: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized('Authentication required'));
      return;
    }

    if (!tiers.includes(req.user.tier)) {
      next(ApiError.forbidden(`This feature requires one of: ${tiers.join(', ')}`));
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user owns a resource or is admin
 */
export const requireOwnershipOrAdmin = (
  getResourceOwnerId: (req: AuthenticatedRequest) => Promise<string | null>
) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      // Admins can access anything
      if (req.user.role === UserRole.ADMIN) {
        next();
        return;
      }

      const ownerId = await getResourceOwnerId(req);
      
      if (!ownerId) {
        throw ApiError.notFound('Resource not found');
      }

      if (ownerId !== req.user.userId) {
        throw ApiError.forbidden('Access denied');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

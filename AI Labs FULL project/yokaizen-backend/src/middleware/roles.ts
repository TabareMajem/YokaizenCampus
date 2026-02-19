import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@utils/errors';
import { UserRole, UserTier } from '@entities/User';
import { AuthenticatedRequest } from '@/types';

export const checkRole = (roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as AuthenticatedRequest).user;

        if (!user) {
            next(ApiError.unauthorized('Not authenticated'));
            return;
        }

        if (!roles.includes(user.role)) {
            next(ApiError.forbidden('Insufficient permissions'));
            return;
        }

        next();
    };
};

export const checkTier = (minTier: UserTier) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as AuthenticatedRequest).user;

        if (!user) {
            next(ApiError.unauthorized('Not authenticated'));
            return;
        }

        const tiers = Object.values(UserTier);
        const userTierIndex = tiers.indexOf(user.tier);
        const minTierIndex = tiers.indexOf(minTier);

        if (userTierIndex < minTierIndex) {
            next(ApiError.forbidden(`Requires ${minTier} tier or higher`));
            return;
        }

        next();
    };
};

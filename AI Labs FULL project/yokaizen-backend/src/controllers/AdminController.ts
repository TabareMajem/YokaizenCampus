import { Response, Request } from 'express';
import { adminService } from '@services/AdminService';
import { asyncHandler, ApiError } from '@utils/errors';
import { AuthenticatedRequest } from '@/types';
import { UserRole } from '@entities/User';
import { RewardType, RewardRarity } from '@entities/Reward';

// Helper to create success response
const successResponse = <T>(data: T) => ({ success: true, data });

export class AdminController {
    /**
     * Middleware to check admin access
     */
    private checkAdmin = async (req: AuthenticatedRequest): Promise<void> => {
        if (!req.user?.id) {
            throw ApiError.unauthorized();
        }
        const isAdmin = await adminService.isAdmin(req.user.id);
        if (!isAdmin) {
            throw ApiError.forbidden('Admin access required');
        }
    };

    /**
     * GET /admin/stats
     * Get admin dashboard statistics
     */
    getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await this.checkAdmin(req);
        const stats = await adminService.getStats();
        res.json(successResponse(stats));
    });

    /**
     * GET /admin/traffic
     * Get daily traffic data for charts
     */
    getTraffic = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await this.checkAdmin(req);
        const { days = '7' } = req.query as { days?: string };
        const traffic = await adminService.getDailyTraffic(parseInt(days));
        res.json(successResponse(traffic));
    });

    /**
     * GET /admin/rewards
     * Get all rewards
     */
    getRewards = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await this.checkAdmin(req);
        const rewards = await adminService.getRewards();
        res.json(successResponse(rewards));
    });

    /**
     * POST /admin/rewards
     * Create a new reward
     */
    createReward = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await this.checkAdmin(req);
        const { name, description, type, rarity, icon, cost, stock, code, link, criteria } = req.body;

        if (!name || !type) {
            throw ApiError.badRequest('Name and type are required');
        }

        const reward = await adminService.createReward({
            name,
            description,
            type: type as RewardType,
            rarity: rarity as RewardRarity,
            icon,
            cost,
            stock,
            code,
            link,
            criteria,
        });

        res.status(201).json(successResponse(reward));
    });

    /**
     * PUT /admin/rewards/:id
     * Update a reward
     */
    updateReward = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await this.checkAdmin(req);
        const { id } = req.params;
        const reward = await adminService.updateReward(id, req.body);
        res.json(successResponse(reward));
    });

    /**
     * DELETE /admin/rewards/:id
     * Delete a reward
     */
    deleteReward = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await this.checkAdmin(req);
        const { id } = req.params;
        await adminService.deleteReward(id);
        res.json(successResponse({ message: 'Reward deleted' }));
    });

    /**
     * GET /admin/users
     * Get all users with pagination
     */
    getUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await this.checkAdmin(req);
        const { page, limit, role, tier, search } = req.query as {
            page?: string;
            limit?: string;
            role?: string;
            tier?: string;
            search?: string;
        };

        const result = await adminService.getUsers({
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            role: role as UserRole,
            tier: tier as any,
            search: search,
        });

        res.json(successResponse(result));
    });

    /**
     * PUT /admin/users/:id/role
     * Update user role
     */
    updateUserRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await this.checkAdmin(req);
        const { id } = req.params;
        const { role } = req.body;

        if (!role || !Object.values(UserRole).includes(role)) {
            throw ApiError.badRequest('Valid role is required');
        }

        const user = await adminService.updateUserRole(id, role);
        res.json(successResponse(user));
    });

    /**
     * POST /admin/users/:id/ban
     * Ban a user
     */
    banUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await this.checkAdmin(req);
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            throw ApiError.badRequest('Ban reason is required');
        }

        const user = await adminService.banUser(id, reason);
        res.json(successResponse(user));
    });

    /**
     * POST /admin/users/:id/unban
     * Unban a user
     */
    unbanUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await this.checkAdmin(req);
        const { id } = req.params;
        const user = await adminService.unbanUser(id);
        res.json(successResponse(user));
    });
}

export const adminController = new AdminController();

import { Response } from 'express';
import { userService } from '@services/UserService';
import { asyncHandler, successResponse } from '@utils/errors';
import { AuthenticatedRequest } from '@/types';

export class UserController {
  /**
   * GET /user/me
   * Get full user profile with stats
   */
  getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await userService.getFullProfile(req.user!.userId);
    res.json(successResponse(user));
  });

  /**
   * PATCH /user/me
   * Update user profile
   */
  updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { username, avatarUrl, language } = req.body;
    
    const user = await userService.updateProfile(req.user!.userId, {
      username,
      avatarUrl,
      language,
    });

    res.json(successResponse(user));
  });

  /**
   * GET /user/stats
   * Get detailed user statistics
   */
  getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const stats = await userService.getStats(req.user!.userId);
    res.json(successResponse(stats));
  });

  /**
   * GET /user/inventory
   * Get user's inventory items
   */
  getInventory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { type, rarity } = req.query;
    
    const inventory = await userService.getInventory(req.user!.userId, {
      type: type as string,
      rarity: rarity as string,
    });

    res.json(successResponse(inventory));
  });

  /**
   * POST /user/inventory/:itemId/equip
   * Equip an inventory item
   */
  equipItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { itemId } = req.params;
    
    await userService.equipItem(req.user!.userId, itemId);
    res.json(successResponse({ message: 'Item equipped' }));
  });

  /**
   * GET /user/skills
   * Get user's skill tree progress
   */
  getSkills = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const skills = await userService.getSkills(req.user!.userId);
    res.json(successResponse(skills));
  });

  /**
   * POST /user/skill/unlock
   * Unlock a skill tree node
   */
  unlockSkill = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { nodeId } = req.body;
    
    const result = await userService.unlockSkill(req.user!.userId, nodeId);
    res.json(successResponse(result));
  });

  /**
   * GET /user/agents
   * Get user's created AI agents
   */
  getAgents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const agents = await userService.getAgents(req.user!.userId);
    res.json(successResponse(agents));
  });

  /**
   * GET /user/achievements
   * Get user's achievements
   */
  getAchievements = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const achievements = await userService.getAchievements(req.user!.userId);
    res.json(successResponse(achievements));
  });

  /**
   * POST /user/energy/refresh
   * Calculate and return current energy
   */
  refreshEnergy = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const energy = await userService.refreshEnergy(req.user!.userId);
    res.json(successResponse({ energy }));
  });

  /**
   * POST /user/streak/claim
   * Claim daily streak bonus
   */
  claimStreak = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await userService.claimDailyStreak(req.user!.userId);
    res.json(successResponse(result));
  });

  /**
   * GET /user/notifications
   * Get user notifications
   */
  getNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { unreadOnly } = req.query;
    
    const notifications = await userService.getNotifications(
      req.user!.userId,
      unreadOnly === 'true'
    );

    res.json(successResponse(notifications));
  });

  /**
   * DELETE /user/account
   * Request account deletion
   */
  deleteAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await userService.requestAccountDeletion(req.user!.userId);
    res.json(successResponse({ message: 'Account deletion requested' }));
  });
}

export const userController = new UserController();

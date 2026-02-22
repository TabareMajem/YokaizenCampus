import { Request, Response } from 'express';
import { z } from 'zod';
import { gamificationService } from '../services/GamificationService';
import { asyncHandler, ValidationError, ForbiddenError } from '../middleware/errorHandler';

// Validation schemas
const claimAchievementSchema = z.object({
  achievementId: z.string().min(1, 'Achievement ID is required')
});

export class GamificationController {
  /**
   * GET /gamification/profile
   * Get user's gamification profile
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const profile = await gamificationService.getProfile(req.user!.userId);

    res.json({
      success: true,
      data: profile
    });
  });

  /**
   * GET /gamification/career
   * Get user's career path and skill tree
   */
  getCareerPath = asyncHandler(async (req: Request, res: Response) => {
    const careerPath = await gamificationService.getCareerPath(req.user!.userId);

    res.json({
      success: true,
      data: careerPath
    });
  });

  /**
   * GET /gamification/achievements
   * Get all achievements (unlocked and available)
   */
  getAchievements = asyncHandler(async (req: Request, res: Response) => {
    const achievements = await gamificationService.getAchievements(req.user!.userId);

    res.json({
      success: true,
      data: achievements
    });
  });

  /**
   * POST /gamification/achievements/claim
   * Claim an unlocked achievement (for manual claim achievements)
   */
  claimAchievement = asyncHandler(async (req: Request, res: Response) => {
    const validation = claimAchievementSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const result = await gamificationService.claimAchievement(
      req.user!.userId,
      validation.data.achievementId
    );

    res.json({
      success: true,
      message: 'Achievement claimed',
      data: result
    });
  });

  /**
   * GET /gamification/leaderboard
   * Get leaderboard
   */
  getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
    const { scope, period, limit } = req.query;

    const leaderboard = await gamificationService.getLeaderboard({
      scope: (scope as 'global' | 'classroom' | 'school') || 'global',
      period: (period as 'all' | 'week' | 'month') || 'all',
      limit: limit ? parseInt(limit as string) : 50,
      userId: req.user!.userId
    });

    res.json({
      success: true,
      data: leaderboard
    });
  });

  /**
   * GET /gamification/nodes
   * Get available and unlocked agent nodes
   */
  getNodes = asyncHandler(async (req: Request, res: Response) => {
    const nodes = await gamificationService.getAvailableNodes(req.user!.userId);

    res.json({
      success: true,
      data: nodes
    });
  });

  /**
   * GET /gamification/stats
   * Get detailed gamification statistics
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const { period } = req.query;

    const stats = await gamificationService.getDetailedStats(
      req.user!.userId,
      (period as 'week' | 'month' | 'all') || 'all'
    );

    res.json({
      success: true,
      data: stats
    });
  });

  /**
   * GET /gamification/xp-history
   * Get XP gain history
   */
  getXPHistory = asyncHandler(async (req: Request, res: Response) => {
    const { limit, offset } = req.query;

    const history = await gamificationService.getXPHistory(
      req.user!.userId,
      {
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      }
    );

    res.json({
      success: true,
      data: history
    });
  });

  /**
   * GET /gamification/streaks
   * Get user's activity streaks
   */
  getStreaks = asyncHandler(async (req: Request, res: Response) => {
    const streaks = await gamificationService.getStreaks(req.user!.userId);

    res.json({
      success: true,
      data: streaks
    });
  });

  /**
   * GET /gamification/challenges
   * Get active challenges
   */
  getChallenges = asyncHandler(async (req: Request, res: Response) => {
    const challenges = await gamificationService.getActiveChallenges(req.user!.userId);

    res.json({
      success: true,
      data: challenges
    });
  });

  /**
   * POST /gamification/challenges/:id/join
   * Join a challenge
   */
  joinChallenge = asyncHandler(async (req: Request, res: Response) => {
    const result = await gamificationService.joinChallenge(
      req.user!.userId,
      req.params.id
    );

    res.json({
      success: true,
      message: 'Joined challenge',
      data: result
    });
  });

  /**
   * GET /gamification/rewards
   * Get available rewards
   */
  getRewards = asyncHandler(async (req: Request, res: Response) => {
    const rewards = await gamificationService.getAvailableRewards(req.user!.userId);

    res.json({
      success: true,
      data: rewards
    });
  });

  /**
   * POST /gamification/rewards/:id/redeem
   * Redeem a reward
   */
  redeemReward = asyncHandler(async (req: Request, res: Response) => {
    const result = await gamificationService.redeemReward(
      req.user!.userId,
      req.params.id
    );

    res.json({
      success: true,
      message: 'Reward redeemed',
      data: result
    });
  });

  /**
   * GET /gamification/rank
   * Get user's current rank
   */
  getRank = asyncHandler(async (req: Request, res: Response) => {
    const rank = await gamificationService.getUserRank(req.user!.userId);

    res.json({
      success: true,
      data: rank
    });
  });

  /**
   * GET /gamification/progress
   * Get progress towards next level
   */
  getProgress = asyncHandler(async (req: Request, res: Response) => {
    const progress = await gamificationService.getLevelProgress(req.user!.userId);

    res.json({
      success: true,
      data: progress
    });
  });

  /**
   * GET /gamification/titles
   * Get available and earned titles
   */
  getTitles = asyncHandler(async (req: Request, res: Response) => {
    const titles = await gamificationService.getTitles(req.user!.userId);

    res.json({
      success: true,
      data: titles
    });
  });

  /**
   * POST /gamification/titles/:id/equip
   * Equip a title
   */
  equipTitle = asyncHandler(async (req: Request, res: Response) => {
    await gamificationService.equipTitle(req.user!.userId, req.params.id);

    res.json({
      success: true,
      message: 'Title equipped'
    });
  });

  /**
   * GET /gamification/badges
   * Get all badges
   */
  getBadges = asyncHandler(async (req: Request, res: Response) => {
    const badges = await gamificationService.getBadges(req.user!.userId);

    res.json({
      success: true,
      data: badges
    });
  });

  /**
   * POST /gamification/badges/:id/display
   * Set badge as displayed on profile
   */
  displayBadge = asyncHandler(async (req: Request, res: Response) => {
    const { slot } = req.body;

    await gamificationService.displayBadge(
      req.user!.userId,
      req.params.id,
      slot
    );

    res.json({
      success: true,
      message: 'Badge displayed'
    });
  });

  /**
   * POST /gamification/check-achievements
   * Manually trigger achievement check
   */
  checkAchievements = asyncHandler(async (req: Request, res: Response) => {
    const newAchievements = await gamificationService.checkAndAwardAchievements(
      req.user!.userId
    );

    res.json({
      success: true,
      data: {
        newAchievements,
        count: newAchievements.length
      }
    });
  });

  /**
   * GET /gamification/classroom/:id/leaderboard
   * Get classroom-specific leaderboard
   */
  getClassroomLeaderboard = asyncHandler(async (req: Request, res: Response) => {
    const leaderboard = await gamificationService.getClassroomLeaderboard(
      req.params.id,
      req.user!.userId
    );

    res.json({
      success: true,
      data: leaderboard
    });
  });
}

export const gamificationController = new GamificationController();

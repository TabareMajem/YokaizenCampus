import { Response } from 'express';
import { leaderboardService } from '@services/LeaderboardService';
import { asyncHandler, successResponse } from '@utils/errors';
import { AuthenticatedRequest } from '@/types';

export class LeaderboardController {
  /**
   * GET /leaderboard/global
   * Get global leaderboard
   */
  getGlobal = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { 
      limit = '100', 
      offset = '0',
      includeMe 
    } = req.query;

    const result = await leaderboardService.getGlobalLeaderboard({
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      includeUser: includeMe === 'true' ? req.user?.userId : undefined,
    });

    res.json(successResponse(result));
  });

  /**
   * GET /leaderboard/squads
   * Get squad leaderboard
   */
  getSquads = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { limit = '50', offset = '0' } = req.query;

    const result = await leaderboardService.getSquadLeaderboard({
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json(successResponse(result));
  });

  /**
   * GET /leaderboard/regional
   * Get regional leaderboard
   */
  getRegional = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { region, limit = '100', offset = '0' } = req.query;

    if (!region) {
      res.status(400).json({ 
        success: false, 
        error: { message: 'Region parameter required' } 
      });
      return;
    }

    const result = await leaderboardService.getRegionalLeaderboard(
      region as string,
      {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      }
    );

    res.json(successResponse(result));
  });

  /**
   * GET /leaderboard/game/:gameType
   * Get game-specific leaderboard
   */
  getGameLeaderboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { gameType } = req.params;
    const { difficulty, limit = '50', offset = '0' } = req.query;

    const result = await leaderboardService.getGameLeaderboard(
      gameType as any,
      difficulty as string,
      {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      }
    );

    res.json(successResponse(result));
  });

  /**
   * GET /leaderboard/timeframed
   * Get daily, weekly, and all-time top 10
   */
  getTimeframed = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await leaderboardService.getTimeframedLeaderboard(
      req.user?.userId
    );

    res.json(successResponse(result));
  });

  /**
   * GET /leaderboard/me
   * Get current user's rankings
   */
  getMyRankings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await leaderboardService.getUserRankings(req.user!.userId);
    res.json(successResponse(result));
  });

  /**
   * GET /leaderboard/around-me
   * Get leaderboard entries around the current user
   */
  getAroundMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { type = 'global', range = '5' } = req.query;

    const keyMap: Record<string, string> = {
      global: 'leaderboard:global',
      daily: 'leaderboard:daily',
      weekly: 'leaderboard:weekly',
    };

    const key = keyMap[type as string] || keyMap.global;

    const result = await leaderboardService.getLeaderboardAroundUser(
      req.user!.userId,
      key,
      parseInt(range as string)
    );

    res.json(successResponse(result));
  });
}

export const leaderboardController = new LeaderboardController();

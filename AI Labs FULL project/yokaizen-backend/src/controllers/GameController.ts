import { Response } from 'express';
import { gameService } from '@services/GameService';
import { asyncHandler, successResponse } from '@utils/errors';
import { AuthenticatedRequest } from '@/types';

export class GameController {
  /**
   * POST /games/start
   * Start a new game session
   */
  start = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { gameType, difficulty } = req.body;

    const session = await gameService.startGame(
      req.user!.userId,
      gameType,
      difficulty
    );

    res.json(successResponse({
      sessionToken: session.token,
      startTime: session.startTime,
      maxDuration: session.maxDuration,
    }));
  });

  /**
   * POST /games/submit
   * Submit game results
   */
  submit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionToken, score, metadata } = req.body;

    const result = await gameService.submitGame(
      req.user!.userId,
      sessionToken,
      score,
      metadata
    );

    res.json(successResponse(result));
  });

  /**
   * GET /games/history
   * Get user's game history
   */
  getHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { 
      gameType, 
      page = '1', 
      limit = '20',
      startDate,
      endDate 
    } = req.query;

    const history = await gameService.getHistory(req.user!.userId, {
      gameType: gameType as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json(successResponse(history));
  });

  /**
   * GET /games/:id
   * Get specific game details
   */
  getGame = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const game = await gameService.getGameById(id, req.user!.userId);
    res.json(successResponse(game));
  });

  /**
   * GET /games/stats
   * Get user's game statistics
   */
  getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { gameType } = req.query;

    const stats = await gameService.getGameStats(
      req.user!.userId,
      gameType as string
    );

    res.json(successResponse(stats));
  });

  /**
   * GET /games/types
   * Get available game types and their info
   */
  getTypes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const types = await gameService.getGameTypes();
    res.json(successResponse(types));
  });

  /**
   * GET /games/daily-challenge
   * Get today's daily challenge
   */
  getDailyChallenge = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const challenge = await gameService.getDailyChallenge(req.user!.userId);
    res.json(successResponse(challenge));
  });

  /**
   * POST /games/daily-challenge/complete
   * Mark daily challenge as completed
   */
  completeDailyChallenge = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionToken, score, metadata } = req.body;

    const result = await gameService.completeDailyChallenge(
      req.user!.userId,
      sessionToken,
      score,
      metadata
    );

    res.json(successResponse(result));
  });

  // =========== Generated Games (Game Creator) ===========

  /**
   * GET /games/generated
   * Get list of generated games (public + user's own)
   */
  getGeneratedGames = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { 
      page = '1', 
      limit = '20',
      search,
      creatorId 
    } = req.query;

    const games = await gameService.getGeneratedGames({
      userId: req.user!.userId,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      creatorId: creatorId as string,
    });

    res.json(successResponse(games));
  });

  /**
   * GET /games/generated/:id
   * Get specific generated game
   */
  getGeneratedGame = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const game = await gameService.getGeneratedGameById(id, req.user?.userId);
    res.json(successResponse(game));
  });

  /**
   * POST /games/generated
   * Create a new generated game (manual creation, not AI)
   */
  createGeneratedGame = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { title, introText, scenes, isPublic } = req.body;

    const game = await gameService.createGeneratedGame(
      req.user!.userId,
      { title, introText, scenes, isPublic }
    );

    res.json(successResponse(game));
  });

  /**
   * PUT /games/generated/:id
   * Update a generated game
   */
  updateGeneratedGame = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const game = await gameService.updateGeneratedGame(
      id,
      req.user!.userId,
      updates
    );

    res.json(successResponse(game));
  });

  /**
   * DELETE /games/generated/:id
   * Delete a generated game
   */
  deleteGeneratedGame = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    await gameService.deleteGeneratedGame(id, req.user!.userId);
    res.json(successResponse({ message: 'Game deleted' }));
  });

  /**
   * POST /games/generated/:id/play
   * Start playing a generated game
   */
  playGeneratedGame = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const session = await gameService.startGeneratedGame(id, req.user!.userId);
    res.json(successResponse(session));
  });

  /**
   * POST /games/generated/:id/progress
   * Update progress in a generated game
   */
  updateGameProgress = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { sessionToken, currentSceneId, choices } = req.body;

    const progress = await gameService.updateGeneratedGameProgress(
      id,
      req.user!.userId,
      sessionToken,
      { currentSceneId, choices }
    );

    res.json(successResponse(progress));
  });

  /**
   * POST /games/generated/:id/complete
   * Complete a generated game session
   */
  completeGeneratedGame = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { sessionToken, outcome, metadata } = req.body;

    const result = await gameService.completeGeneratedGame(
      id,
      req.user!.userId,
      sessionToken,
      { outcome, metadata }
    );

    res.json(successResponse(result));
  });

  /**
   * POST /games/generated/:id/rate
   * Rate a generated game
   */
  rateGeneratedGame = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { rating, review } = req.body;

    await gameService.rateGeneratedGame(id, req.user!.userId, rating, review);
    res.json(successResponse({ message: 'Rating submitted' }));
  });
}

export const gameController = new GameController();

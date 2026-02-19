import { Response } from 'express';
import { squadService } from '@services/SquadService';
import { asyncHandler, successResponse } from '@utils/errors';
import { AuthenticatedRequest } from '@/types';

export class SquadController {
  /**
   * GET /squads
   * List squads with optional filtering
   */
  list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      search,
      recommended,
      tier,
      page = '1',
      limit = '20'
    } = req.query;

    const squads = await squadService.searchSquads({
      query: search as string,
      recommended: recommended === 'true',
      tier: tier as any,
      limit: parseInt(limit as string),
    });

    res.json(successResponse(squads));
  });

  /**
   * GET /squads/:id
   * Get squad details
   */
  get = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const squad = await squadService.getSquadById(id);
    res.json(successResponse(squad));
  });

  /**
   * POST /squads
   * Create a new squad
   */
  create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, icon, description } = req.body;

    const squad = await squadService.createSquad(req.user!.userId, name, icon, description);

    res.json(successResponse(squad));
  });

  /**
   * PUT /squads/:id
   * Update squad settings (owner/officers only)
   */
  update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const squad = await squadService.updateSquad(req.user!.userId, id, updates);
    res.json(successResponse(squad));
  });

  /**
   * DELETE /squads/:id
   * Delete/disband squad (owner only)
   */
  delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    await squadService.deleteSquad(req.user!.userId, id);
    res.json(successResponse({ message: 'Squad disbanded' }));
  });

  /**
   * POST /squads/:id/join
   * Join a squad
   */
  join = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const result = await squadService.joinSquad(req.user!.userId, id);
    res.json(successResponse(result));
  });

  /**
   * POST /squads/:id/leave
   * Leave current squad
   */
  leave = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    await squadService.leaveSquad(req.user!.userId);
    res.json(successResponse({ message: 'Left squad successfully' }));
  });

  /**
   * POST /squads/:id/contribute
   * Contribute credits to squad treasury
   */
  contribute = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { amount } = req.body;

    const result = await squadService.contributeToSquad(
      req.user!.userId,
      amount
    );

    res.json(successResponse(result));
  });

  /**
   * GET /squads/:id/members
   * Get squad members
   */
  getMembers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const members = await squadService.getSquadMembers(id);
    res.json(successResponse(members));
  });

  /**
   * POST /squads/:id/members/:memberId/promote
   * Promote member to officer
   */
  promoteMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id, memberId } = req.params;

    await squadService.promoteMember(req.user!.userId, memberId);
    res.json(successResponse({ message: 'Member promoted' }));
  });

  /**
   * POST /squads/:id/members/:memberId/demote
   * Demote officer to member
   */
  demoteMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id, memberId } = req.params;

    await squadService.demoteMember(req.user!.userId, memberId);
    res.json(successResponse({ message: 'Member demoted' }));
  });

  /**
   * POST /squads/:id/members/:memberId/kick
   * Remove member from squad
   */
  kickMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id, memberId } = req.params;

    await squadService.kickMember(req.user!.userId, memberId);
    res.json(successResponse({ message: 'Member removed' }));
  });

  /**
   * POST /squads/:id/transfer
   * Transfer ownership to another member
   */
  transferOwnership = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { newOwnerId } = req.body;

    await squadService.transferOwnership(req.user!.userId, newOwnerId);
    res.json(successResponse({ message: 'Ownership transferred' }));
  });

  // =========== War Room / Missions ===========

  /**
   * GET /squads/:id/missions
   * Get squad missions
   */
  getMissions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.query;

    const missions = await squadService.getSquadMissions(id, status as string);
    res.json(successResponse(missions));
  });

  /**
   * POST /squads/:id/deploy
   * Start a squad deployment/mission
   */
  deploy = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { missionType, targetScore } = req.body;

    const mission = await squadService.startMission(
      req.user!.userId,
      missionType,
      [{ id: 'default', target: targetScore }]
    );

    res.json(successResponse(mission));
  });

  /**
   * POST /squads/:id/attack
   * Attack the squad boss
   */
  attack = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    // We can accept custom damage calc or just trigger attack
    // For now, attack logic is in service
    const result = await squadService.attackBoss(req.user!.userId, id);
    res.json(successResponse(result));
  });

  /**
   * POST /squads/:id/missions/:missionId/join
   * Join an active mission
   */
  joinMission = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id, missionId } = req.params;

    const result = await squadService.joinMission(id, missionId, req.user!.userId);
    res.json(successResponse(result));
  });

  /**
   * POST /squads/:id/missions/:missionId/contribute
   * Contribute to mission progress
   */
  contributeMission = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id, missionId } = req.params;
    const { contribution, metadata } = req.body;

    const result = await squadService.contributeMission(
      id,
      missionId,
      req.user!.userId,
      contribution,
      metadata
    );

    res.json(successResponse(result));
  });

  /**
   * GET /squads/:id/chat
   * Get squad chat history
   */
  getChat = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { before, limit = '50' } = req.query;

    const messages = await squadService.getChatHistory(
      id,
      req.user!.userId,
      {
        before: before as string,
        limit: parseInt(limit as string),
      }
    );

    res.json(successResponse(messages));
  });

  /**
   * GET /squads/:id/leaderboard
   * Get squad internal leaderboard
   */
  getLeaderboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { timeframe = 'weekly' } = req.query;

    const leaderboard = await squadService.getInternalSquadLeaderboard(
      id,
      timeframe as any
    );

    res.json(successResponse(leaderboard));
  });

  /**
   * GET /squads/:id/stats
   * Get squad statistics
   */
  getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const stats = await squadService.getSquadStats(id);
    res.json(successResponse(stats));
  });
}

export const squadController = new SquadController();

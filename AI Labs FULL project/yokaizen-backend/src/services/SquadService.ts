import { Repository, Like, In, Not, IsNull } from 'typeorm';
import { AppDataSource } from '@config/database';
import { redisClient, invalidateCache, publishToChannel } from '@config/redis';
import { logger } from '@config/logger';
import { User, UserTier } from '@entities/User';
import { Squad, SquadTier, SquadRole } from '@entities/Squad';
import { SquadMission, MissionStatus, MissionType } from '@entities/SquadMission';
import { Transaction, TransactionType } from '@entities/Transaction';
import { ApiError } from '@utils/errors';
import { calculateLevel } from '@utils/helpers';

// Squad tier configuration
const SQUAD_TIER_CONFIG: Record<SquadTier, {
  xpRequired: number;
  maxMembers: number;
  perks: string[];
}> = {
  [SquadTier.ROOKIE]: {
    xpRequired: 0,
    maxMembers: 10,
    perks: ['Basic chat', 'Weekly missions'],
  },
  [SquadTier.BRONZE]: {
    xpRequired: 10000,
    maxMembers: 15,
    perks: ['Custom icon', 'Daily missions', '+5% XP bonus'],
  },
  [SquadTier.SILVER]: {
    xpRequired: 50000,
    maxMembers: 25,
    perks: ['Squad banner', 'War room access', '+10% XP bonus'],
  },
  [SquadTier.GOLD]: {
    xpRequired: 150000,
    maxMembers: 40,
    perks: ['Custom emotes', 'Priority matchmaking', '+15% XP bonus'],
  },
  [SquadTier.PLATINUM]: {
    xpRequired: 250000,
    maxMembers: 50,
    perks: ['Elite missions', 'Squad colors', '+20% XP bonus'],
  },
  [SquadTier.DIAMOND]: {
    xpRequired: 350000,
    maxMembers: 75,
    perks: ['Global broadcast', 'Custom trails', '+22% XP bonus'],
  },
  [SquadTier.ELITE]: {
    xpRequired: 500000,
    maxMembers: 100,
    perks: ['Exclusive badge', 'All perks', '+25% XP bonus'],
  },
};

export class SquadService {
  private userRepository: Repository<User>;
  private squadRepository: Repository<Squad>;
  private missionRepository: Repository<SquadMission>;
  private transactionRepository: Repository<Transaction>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.squadRepository = AppDataSource.getRepository(Squad);
    this.missionRepository = AppDataSource.getRepository(SquadMission);
    this.transactionRepository = AppDataSource.getRepository(Transaction);
  }

  /**
   * Create a new squad
   */
  async createSquad(
    ownerId: string,
    name: string,
    icon?: string,
    description?: string
  ): Promise<Squad> {
    const owner = await this.userRepository.findOne({
      where: { id: ownerId },
      relations: ['squad'],
    });

    if (!owner) {
      throw ApiError.notFound('User not found');
    }

    // Check if user is PRO tier
    if (owner.tier !== UserTier.PRO_CREATOR) {
      throw ApiError.forbidden('Only Pro Creator tier can create squads');
    }

    // Check if user already in a squad
    if (owner.squad) {
      throw ApiError.conflict('You must leave your current squad first');
    }

    // Check name uniqueness
    const existingSquad = await this.squadRepository.findOne({ where: { name } });
    if (existingSquad) {
      throw ApiError.conflict('Squad name already taken');
    }

    // Check name validity
    if (name.length < 3 || name.length > 30) {
      throw ApiError.badRequest('Squad name must be 3-30 characters');
    }

    // Create squad
    const squad = this.squadRepository.create({
      name,
      icon: icon || '🎮',
      description: description || '',
      owner,
      tier: SquadTier.ROOKIE,
      totalXp: BigInt(0),
      weeklyXP: 0,
      treasury: 0,
      warRating: 1000, // Starting ELO
      warsWon: 0,
      warsLost: 0,
      settings: {
        isPublic: true,
        autoAccept: false,
        minLevel: 1,
      },
    });

    await this.squadRepository.save(squad);

    // Add owner to squad
    owner.squad = squad;
    owner.squadRole = SquadRole.OWNER;
    owner.squadJoinedAt = new Date();
    await this.userRepository.save(owner);

    logger.info('Squad created', { squadId: squad.id, ownerId, name });
    return squad;
  }

  /**
   * Get squad details
   */
  async getSquad(squadId: string): Promise<Squad> {
    const squad = await this.squadRepository.findOne({
      where: { id: squadId },
      relations: ['owner', 'members', 'missions'],
    });

    if (!squad) {
      throw ApiError.notFound('Squad not found');
    }

    return squad;
  }

  /**
   * Search squads
   */
  async searchSquads(options: {
    query?: string;
    tier?: SquadTier;
    minMembers?: number;
    maxMembers?: number;
    recommended?: boolean;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ squads: Squad[]; total: number }> {
    const qb = this.squadRepository.createQueryBuilder('squad')
      .leftJoinAndSelect('squad.owner', 'owner')
      .loadRelationCountAndMap('squad.memberCount', 'squad.members');

    // Search by name
    if (options.query) {
      qb.andWhere('LOWER(squad.name) LIKE LOWER(:query)', { query: `%${options.query}%` });
    }

    // Filter by tier
    if (options.tier) {
      qb.andWhere('squad.tier = :tier', { tier: options.tier });
    }

    // Filter public squads only
    qb.andWhere("squad.settings->>'isPublic' = 'true'");

    // Recommended squads - based on activity
    if (options.recommended) {
      qb.orderBy('squad.weeklyXP', 'DESC');
    } else {
      qb.orderBy('squad.totalXp', 'DESC');
    }

    const [squads, total] = await qb
      .skip(options.offset || 0)
      .take(options.limit || 20)
      .getManyAndCount();

    return { squads, total };
  }

  /**
   * Join a squad
   */
  async joinSquad(userId: string, squadId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['squad'],
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.squad) {
      throw ApiError.conflict('You are already in a squad');
    }

    const squad = await this.squadRepository.findOne({
      where: { id: squadId },
      relations: ['members'],
    });

    if (!squad) {
      throw ApiError.notFound('Squad not found');
    }

    // Check if squad is full
    const tierConfig = SQUAD_TIER_CONFIG[squad.tier];
    if (squad.members.length >= tierConfig.maxMembers) {
      throw ApiError.conflict('Squad is full');
    }

    // Check if squad is public
    if (!squad.settings?.isPublic) {
      throw ApiError.forbidden('This squad is invite-only');
    }

    // Check minimum level requirement
    const userLevel = calculateLevel(Number(user.xp));
    if (squad.settings?.minLevel && userLevel < squad.settings.minLevel) {
      throw ApiError.forbidden(`You need to be level ${squad.settings.minLevel} to join`);
    }

    // Join squad
    user.squad = squad;
    user.squadRole = SquadRole.MEMBER;
    user.squadJoinedAt = new Date();
    user.squadContributions = 0;

    await this.userRepository.save(user);
    await invalidateCache(`squad:${squadId}`);

    // Notify squad
    await publishToChannel(`squad:${squadId}`, {
      type: 'member_joined',
      userId: user.id,
      username: user.username,
    });

    logger.info('User joined squad', { userId, squadId });
    return user;
  }

  /**
   * Leave squad
   */
  async leaveSquad(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['squad'],
    });

    if (!user || !user.squad) {
      throw ApiError.badRequest('You are not in a squad');
    }

    const squadId = user.squad.id;

    // Owner cannot leave, must transfer or disband
    if (user.squadRole === SquadRole.OWNER) {
      throw ApiError.badRequest('Owner cannot leave. Transfer ownership or disband the squad.');
    }

    user.squad = null as any;
    user.squadRole = null;
    user.squadJoinedAt = null;

    await this.userRepository.save(user);
    await invalidateCache(`squad:${squadId}`);

    // Notify squad
    await publishToChannel(`squad:${squadId}`, {
      type: 'member_left',
      userId: user.id,
      username: user.username,
    });

    logger.info('User left squad', { userId, squadId });
  }

  /**
   * Contribute credits to squad treasury
   */
  async contribute(userId: string, amount: number): Promise<{ squad: Squad; transaction: Transaction }> {
    if (amount <= 0) {
      throw ApiError.badRequest('Amount must be positive');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['squad'],
    });

    if (!user || !user.squad) {
      throw ApiError.badRequest('You are not in a squad');
    }

    if (user.credits < amount) {
      throw ApiError.badRequest('Insufficient credits');
    }

    // Deduct from user
    user.credits -= amount;
    user.squadContributions = (user.squadContributions || 0) + amount;

    // Add to treasury
    const squad = user.squad;
    squad.treasury += amount;

    // Create transaction
    const transaction = this.transactionRepository.create({
      user,
      type: TransactionType.SQUAD_CONTRIBUTION,
      amount: -amount,
      description: `Contributed ${amount} credits to ${squad.name}`,
      metadata: { squadId: squad.id },
    });

    await this.userRepository.save(user);
    await this.squadRepository.save(squad);
    await this.transactionRepository.save(transaction);
    await invalidateCache(`squad:${squad.id}`);
    await invalidateCache(`user:${userId}`);

    logger.info('Squad contribution', { userId, squadId: squad.id, amount });
    return { squad, transaction };
  }

  /**
   * Promote member to officer
   */
  async promoteMember(requesterId: string, targetUserId: string): Promise<User> {
    const requester = await this.userRepository.findOne({
      where: { id: requesterId },
      relations: ['squad'],
    });

    if (!requester?.squad) {
      throw ApiError.badRequest('You are not in a squad');
    }

    // Check permission
    if (requester.squadRole !== SquadRole.OWNER) {
      throw ApiError.forbidden('Only owner can promote members');
    }

    const target = await this.userRepository.findOne({
      where: { id: targetUserId, squad: { id: requester.squad.id } },
    });

    if (!target) {
      throw ApiError.notFound('Member not found in your squad');
    }

    if (target.squadRole === SquadRole.OFFICER) {
      throw ApiError.conflict('Member is already an officer');
    }

    target.squadRole = SquadRole.OFFICER;
    await this.userRepository.save(target);
    await invalidateCache(`squad:${requester.squad.id}`);

    logger.info('Member promoted', { squadId: requester.squad.id, targetUserId });
    return target;
  }

  /**
   * Demote officer to member
   */
  async demoteMember(requesterId: string, targetUserId: string): Promise<User> {
    const requester = await this.userRepository.findOne({
      where: { id: requesterId },
      relations: ['squad'],
    });

    if (!requester?.squad) {
      throw ApiError.badRequest('You are not in a squad');
    }

    if (requester.squadRole !== SquadRole.OWNER) {
      throw ApiError.forbidden('Only owner can demote officers');
    }

    const target = await this.userRepository.findOne({
      where: { id: targetUserId, squad: { id: requester.squad.id } },
    });

    if (!target) {
      throw ApiError.notFound('Member not found in your squad');
    }

    if (target.squadRole !== SquadRole.OFFICER) {
      throw ApiError.conflict('Member is not an officer');
    }

    target.squadRole = SquadRole.MEMBER;
    await this.userRepository.save(target);
    await invalidateCache(`squad:${requester.squad.id}`);

    return target;
  }

  /**
   * Kick member from squad
   */
  async kickMember(requesterId: string, targetUserId: string): Promise<void> {
    const requester = await this.userRepository.findOne({
      where: { id: requesterId },
      relations: ['squad'],
    });

    if (!requester?.squad) {
      throw ApiError.badRequest('You are not in a squad');
    }

    if (requester.squadRole !== SquadRole.OWNER && requester.squadRole !== SquadRole.OFFICER) {
      throw ApiError.forbidden('Only owner or officers can kick members');
    }

    const target = await this.userRepository.findOne({
      where: { id: targetUserId, squad: { id: requester.squad.id } },
    });

    if (!target) {
      throw ApiError.notFound('Member not found in your squad');
    }

    // Officers can't kick other officers or owner
    if (requester.squadRole === SquadRole.OFFICER && target.squadRole !== SquadRole.MEMBER) {
      throw ApiError.forbidden('Officers can only kick regular members');
    }

    // Can't kick owner
    if (target.squadRole === SquadRole.OWNER) {
      throw ApiError.forbidden('Cannot kick the owner');
    }

    const squadId = requester.squad.id;
    target.squad = null as any;
    target.squadRole = null;
    target.squadJoinedAt = null;

    await this.userRepository.save(target);
    await invalidateCache(`squad:${squadId}`);

    // Notify
    await publishToChannel(`squad:${squadId}`, {
      type: 'member_kicked',
      userId: target.id,
      username: target.username,
    });

    logger.info('Member kicked', { squadId, requesterId, targetUserId });
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(ownerId: string, newOwnerId: string): Promise<Squad> {
    const owner = await this.userRepository.findOne({
      where: { id: ownerId },
      relations: ['squad'],
    });

    if (!owner?.squad) {
      throw ApiError.badRequest('You are not in a squad');
    }

    if (owner.squadRole !== SquadRole.OWNER) {
      throw ApiError.forbidden('Only the owner can transfer ownership');
    }

    const newOwner = await this.userRepository.findOne({
      where: { id: newOwnerId, squad: { id: owner.squad.id } },
    });

    if (!newOwner) {
      throw ApiError.notFound('New owner must be a member of the squad');
    }

    // Update roles
    owner.squadRole = SquadRole.OFFICER;
    newOwner.squadRole = SquadRole.OWNER;

    // Update squad owner
    const squad = await this.squadRepository.findOne({ where: { id: owner.squad.id } });
    if (squad) {
      squad.owner = newOwner;
      await this.squadRepository.save(squad);
    }

    await this.userRepository.save([owner, newOwner]);
    await invalidateCache(`squad:${owner.squad.id}`);

    logger.info('Ownership transferred', { squadId: owner.squad.id, oldOwnerId: ownerId, newOwnerId });
    return squad!;
  }

  /**
   * Disband squad
   */
  async disbandSquad(ownerId: string): Promise<void> {
    const owner = await this.userRepository.findOne({
      where: { id: ownerId },
      relations: ['squad'],
    });

    if (!owner?.squad) {
      throw ApiError.badRequest('You are not in a squad');
    }

    if (owner.squadRole !== SquadRole.OWNER) {
      throw ApiError.forbidden('Only the owner can disband the squad');
    }

    const squadId = owner.squad.id;
    const squadName = owner.squad.name;

    // Remove all members from squad
    await this.userRepository.update(
      { squad: { id: squadId } },
      { squad: null as any, squadRole: null, squadJoinedAt: null }
    );

    // Delete missions
    await this.missionRepository.delete({ squad: { id: squadId } });

    // Delete squad
    await this.squadRepository.delete({ id: squadId });

    // Notify
    await publishToChannel(`squad:${squadId}`, {
      type: 'squad_disbanded',
      squadName,
    });

    logger.info('Squad disbanded', { squadId, ownerId });
  }

  /**
   * Update squad settings
   */
  async updateSettings(
    ownerId: string,
    settings: {
      isPublic?: boolean;
      autoAccept?: boolean;
      minLevel?: number;
      description?: string;
      icon?: string;
    }
  ): Promise<Squad> {
    const owner = await this.userRepository.findOne({
      where: { id: ownerId },
      relations: ['squad'],
    });

    if (!owner?.squad) {
      throw ApiError.badRequest('You are not in a squad');
    }

    if (owner.squadRole !== SquadRole.OWNER && owner.squadRole !== SquadRole.OFFICER) {
      throw ApiError.forbidden('Only owner or officers can update settings');
    }

    const squad = await this.squadRepository.findOne({ where: { id: owner.squad.id } });
    if (!squad) {
      throw ApiError.notFound('Squad not found');
    }

    if (settings.description !== undefined) {
      squad.description = settings.description;
    }
    if (settings.icon !== undefined) {
      squad.icon = settings.icon;
    }
    if (settings.isPublic !== undefined || settings.autoAccept !== undefined || settings.minLevel !== undefined) {
      squad.settings = {
        ...squad.settings,
        isPublic: settings.isPublic ?? squad.settings?.isPublic,
        autoAccept: settings.autoAccept ?? squad.settings?.autoAccept,
        minLevel: settings.minLevel ?? squad.settings?.minLevel,
      };
    }

    await this.squadRepository.save(squad);
    await invalidateCache(`squad:${squad.id}`);

    return squad;
  }

  /**
   * Start a war room mission
   */
  async startMission(
    requesterId: string,
    missionType: MissionType,
    objectives: any[]
  ): Promise<SquadMission> {
    const requester = await this.userRepository.findOne({
      where: { id: requesterId },
      relations: ['squad'],
    });

    if (!requester?.squad) {
      throw ApiError.badRequest('You are not in a squad');
    }

    // Check tier for war room access
    if (requester.squad.tier === SquadTier.ROOKIE || requester.squad.tier === SquadTier.BRONZE) {
      throw ApiError.forbidden('Squad must be Silver tier or higher for war room missions');
    }

    // Check for active mission
    const activeMission = await this.missionRepository.findOne({
      where: { squad: { id: requester.squad.id }, status: MissionStatus.ACTIVE },
    });

    if (activeMission) {
      throw ApiError.conflict('Squad already has an active mission');
    }

    // Calculate rewards based on type
    const rewardMultiplier = {
      [MissionType.DAILY]: 1,
      [MissionType.WEEKLY]: 5,
      [MissionType.WAR]: 10,
      [MissionType.SPECIAL]: 15,
      [MissionType.RAID]: 20,
    };

    const mission = this.missionRepository.create({
      squad: requester.squad,
      type: missionType,
      status: MissionStatus.ACTIVE,
      objectives,
      progress: {},
      participantIds: [requesterId],
      xpReward: 1000 * rewardMultiplier[missionType],
      creditReward: 500 * rewardMultiplier[missionType],
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + this.getMissionDuration(missionType)),
    });

    await this.missionRepository.save(mission);

    // Notify squad
    await publishToChannel(`squad:${requester.squad.id}`, {
      type: 'mission_started',
      missionId: mission.id,
      missionType,
    });

    logger.info('Mission started', { squadId: requester.squad.id, missionType });
    return mission;
  }

  /**
   * Update mission progress
   */
  async updateMissionProgress(
    userId: string,
    missionId: string,
    objectiveId: string,
    progress: number
  ): Promise<SquadMission> {
    const mission = await this.missionRepository.findOne({
      where: { id: missionId },
      relations: ['squad'],
    });

    if (!mission) {
      throw ApiError.notFound('Mission not found');
    }

    if (mission.status !== MissionStatus.ACTIVE) {
      throw ApiError.badRequest('Mission is not active');
    }

    // Add participant if not already
    if (!mission.participantIds.includes(userId)) {
      mission.participantIds.push(userId);
    }

    // Update progress
    mission.progress = {
      ...mission.progress,
      [objectiveId]: Math.max(mission.progress[objectiveId] || 0, progress),
    };

    // Check if mission complete
    const allComplete = mission.objectives.every(
      (obj: any) => (mission.progress[obj.id] || 0) >= obj.target
    );

    if (allComplete) {
      mission.status = MissionStatus.COMPLETED;
      mission.completedAt = new Date();

      // Distribute rewards
      await this.distributeMissionRewards(mission);
    }

    await this.missionRepository.save(mission);

    // Notify
    await publishToChannel(`squad:${mission.squad.id}`, {
      type: 'mission_progress',
      missionId,
      progress: mission.progress,
      status: mission.status,
    });

    return mission;
  }

  /**
   * Get squad leaderboard
   */
  async getSquadLeaderboard(
    type: 'xp' | 'wars' | 'weekly'
  ): Promise<Squad[]> {
    const orderBy = {
      xp: 'totalXp',
      wars: 'warsWon',
      weekly: 'weeklyXP',
    };

    return this.squadRepository.find({
      order: { [orderBy[type]]: 'DESC' },
      take: 100,
      relations: ['owner'],
    });
  }

  // Private methods

  private getMissionDuration(type: MissionType): number {
    const durations = {
      [MissionType.DAILY]: 24 * 60 * 60 * 1000, // 24 hours
      [MissionType.WEEKLY]: 7 * 24 * 60 * 60 * 1000, // 7 days
      [MissionType.WAR]: 2 * 60 * 60 * 1000, // 2 hours
      [MissionType.SPECIAL]: 72 * 60 * 60 * 1000, // 72 hours
      [MissionType.RAID]: 4 * 60 * 60 * 1000, // 4 hours
    };
    return durations[type];
  }

  private async distributeMissionRewards(mission: SquadMission): Promise<void> {
    const xpPerParticipant = Math.floor(mission.xpReward / mission.participantIds.length);
    const creditsPerParticipant = Math.floor(mission.creditReward / mission.participantIds.length);

    for (const participantId of mission.participantIds) {
      const user = await this.userRepository.findOne({ where: { id: participantId } });
      if (user) {
        user.xp = BigInt(Number(user.xp) + xpPerParticipant);
        user.credits += creditsPerParticipant;
        await this.userRepository.save(user);
      }
    }

    // Add to squad XP
    const squad = mission.squad;
    squad.totalXp = Number(squad.totalXp) + mission.xpReward;
    squad.weeklyXp += mission.xpReward;

    // Check for tier upgrade
    await this.checkAndUpgradeTier(squad);
    await this.squadRepository.save(squad);

    logger.info('Mission rewards distributed', {
      missionId: mission.id,
      participants: mission.participantIds.length,
      xpPerParticipant,
      creditsPerParticipant,
    });
  }

  private async checkAndUpgradeTier(squad: Squad): Promise<void> {
    const totalXP = Number(squad.totalXp);
    const tiers = Object.entries(SQUAD_TIER_CONFIG).sort((a, b) => b[1].xpRequired - a[1].xpRequired);

    for (const [tier, config] of tiers) {
      if (totalXP >= config.xpRequired && squad.tier !== tier) {
        const oldTier = squad.tier;
        squad.tier = tier as SquadTier;

        logger.info('Squad tier upgraded', { squadId: squad.id, oldTier, newTier: tier });

        // Notify squad
        await publishToChannel(`squad:${squad.id}`, {
          type: 'tier_upgraded',
          oldTier,
          newTier: tier,
        });
        break;
      }
    }
  }
}

export const squadService = new SquadService();

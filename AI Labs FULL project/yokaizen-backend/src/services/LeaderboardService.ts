import { Repository } from 'typeorm';
import { AppDataSource } from '@config/database';
import {
  redis,
  addToLeaderboard,
  getLeaderboard,
  getUserRank,
  cacheGet,
  cacheSet
} from '@config/redis';
import { logger } from '@config/logger';
import { User, UserTier } from '@entities/User';
import { Squad } from '@entities/Squad';
import { GameHistory, GameType } from '@entities/GameHistory';
import { LeaderboardEntry } from '@/types';

interface LeaderboardOptions {
  limit?: number;
  offset?: number;
  includeUser?: string; // Include user's rank even if not in top
}

interface DetailedLeaderboardEntry extends LeaderboardEntry {
  avatarUrl?: string;
  tier?: UserTier;
  recentGames?: number;
}

interface SquadLeaderboardEntry {
  squadId: string;
  name: string;
  iconUrl?: string;
  tier: string;
  score: number;
  rank: number;
  memberCount: number;
  weeklyProgress: number;
}

interface TimeframedLeaderboard {
  daily: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
}

export class LeaderboardService {
  private userRepository: Repository<User>;
  private squadRepository: Repository<Squad>;
  private gameHistoryRepository: Repository<GameHistory>;

  // Redis key prefixes
  private readonly GLOBAL_KEY = 'leaderboard:global';
  private readonly SQUADS_KEY = 'leaderboard:squads';
  private readonly DAILY_KEY = 'leaderboard:daily';
  private readonly WEEKLY_KEY = 'leaderboard:weekly';
  private readonly REGIONAL_PREFIX = 'leaderboard:regional';
  private readonly GAME_PREFIX = 'leaderboard:game';

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.squadRepository = AppDataSource.getRepository(Squad);
    this.gameHistoryRepository = AppDataSource.getRepository(GameHistory);
  }

  async getGlobalLeaderboard(options: LeaderboardOptions = {}): Promise<{
    entries: DetailedLeaderboardEntry[];
    userRank?: { rank: number; score: number };
    total: number;
  }> {
    const { limit = 100, offset = 0, includeUser } = options;

    // Try cache first
    const cacheKey = `leaderboard_global_${limit}_${offset}`;
    const cached = await cacheGet<DetailedLeaderboardEntry[]>(cacheKey);

    let entries: DetailedLeaderboardEntry[];

    if (cached) {
      entries = cached;
    } else {
      // Get from Redis sorted set
      const leaderboardData = await getLeaderboard(this.GLOBAL_KEY, offset, offset + limit - 1);

      // Enrich with user data
      entries = await this.enrichUserLeaderboard(leaderboardData);

      // Cache for 5 minutes
      await cacheSet(cacheKey, entries, 300);
    }

    // Get total count
    const total = await redis.zcard(this.GLOBAL_KEY);

    // Get user's rank if requested
    let userRank: { rank: number; score: number } | undefined;
    if (includeUser) {
      const rank = await getUserRank(this.GLOBAL_KEY, includeUser);
      if (rank !== null) {
        const score = await redis.zscore(this.GLOBAL_KEY, includeUser);
        userRank = { rank: rank + 1, score: Number(score) || 0 };
      }
    }

    return { entries, userRank, total };
  }

  async getSquadLeaderboard(options: LeaderboardOptions = {}): Promise<{
    entries: SquadLeaderboardEntry[];
    total: number;
  }> {
    const { limit = 50, offset = 0 } = options;

    const cacheKey = `leaderboard_squads_${limit}_${offset}`;
    const cached = await cacheGet<SquadLeaderboardEntry[]>(cacheKey);

    if (cached) {
      return { entries: cached, total: await redis.zcard(this.SQUADS_KEY) };
    }

    const leaderboardData = await getLeaderboard(this.SQUADS_KEY, offset, offset + limit - 1);

    // Enrich with squad data
    const entries: SquadLeaderboardEntry[] = [];
    for (let i = 0; i < leaderboardData.length; i++) {
      const { member: squadId, score } = leaderboardData[i];
      const squad = await this.squadRepository.findOne({
        where: { id: squadId },
        relations: ['members'],
      });

      if (squad) {
        entries.push({
          squadId: squad.id,
          name: squad.name,
          iconUrl: squad.icon,
          tier: squad.tier,
          score,
          rank: offset + i + 1,
          memberCount: squad.members?.length || 0,
          weeklyProgress: squad.weeklyProgress,
        });
      }
    }

    await cacheSet(cacheKey, entries, 300);
    const total = await redis.zcard(this.SQUADS_KEY);

    return { entries, total };
  }

  async getRegionalLeaderboard(
    region: string,
    options: LeaderboardOptions = {}
  ): Promise<{ entries: DetailedLeaderboardEntry[]; total: number }> {
    const { limit = 100, offset = 0 } = options;
    const key = `${this.REGIONAL_PREFIX}:${region.toLowerCase()}`;

    const leaderboardData = await getLeaderboard(key, offset, offset + limit - 1);
    const entries = await this.enrichUserLeaderboard(leaderboardData);
    const total = await redis.zcard(key);

    return { entries, total };
  }

  async getGameLeaderboard(
    gameType: GameType,
    difficulty?: string,
    options: LeaderboardOptions = {}
  ): Promise<{ entries: DetailedLeaderboardEntry[]; total: number }> {
    const { limit = 50, offset = 0 } = options;
    const key = difficulty
      ? `${this.GAME_PREFIX}:${gameType}:${difficulty}`
      : `${this.GAME_PREFIX}:${gameType}`;

    const leaderboardData = await getLeaderboard(key, offset, offset + limit - 1);
    const entries = await this.enrichUserLeaderboard(leaderboardData);
    const total = await redis.zcard(key);

    return { entries, total };
  }

  async getTimeframedLeaderboard(userId?: string): Promise<TimeframedLeaderboard> {
    const [daily, weekly, allTime] = await Promise.all([
      getLeaderboard(this.DAILY_KEY, 0, 9),
      getLeaderboard(this.WEEKLY_KEY, 0, 9),
      getLeaderboard(this.GLOBAL_KEY, 0, 9),
    ]);

    return {
      daily: await this.enrichUserLeaderboard(daily),
      weekly: await this.enrichUserLeaderboard(weekly),
      allTime: await this.enrichUserLeaderboard(allTime),
    };
  }

  async updateUserScore(userId: string, xpGained: number): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) return;

    const totalXp = Number(user.xp);

    // Update all relevant leaderboards
    await Promise.all([
      addToLeaderboard(this.GLOBAL_KEY, totalXp, userId),
      addToLeaderboard(this.DAILY_KEY, xpGained, userId), // Daily tracks gains
      addToLeaderboard(this.WEEKLY_KEY, xpGained, userId),
    ]);

    // Update regional if user has region set
    if (user.language) {
      await addToLeaderboard(
        `${this.REGIONAL_PREFIX}:${user.language.toLowerCase()}`,
        totalXp,
        userId
      );
    }

    logger.debug('Leaderboard updated', { userId, totalXp, xpGained });
  }

  async updateSquadScore(squadId: string): Promise<void> {
    const squad = await this.squadRepository.findOneBy({ id: squadId });
    if (!squad) return;

    await addToLeaderboard(this.SQUADS_KEY, Number(squad.totalXp), squadId);
    logger.debug('Squad leaderboard updated', { squadId, totalXp: squad.totalXp });
  }

  async updateGameScore(
    userId: string,
    gameType: GameType,
    difficulty: string,
    score: number
  ): Promise<boolean> {
    const key = `${this.GAME_PREFIX}:${gameType}:${difficulty}`;

    // Get current high score
    const currentScore = await redis.zscore(key, userId);

    // Only update if new score is higher
    if (!currentScore || score > Number(currentScore)) {
      await addToLeaderboard(key, score, userId);

      // Also update overall game leaderboard
      await addToLeaderboard(`${this.GAME_PREFIX}:${gameType}`, score, userId);

      return true; // New high score!
    }

    return false;
  }

  async resetDailyLeaderboard(): Promise<void> {
    await redis.del(this.DAILY_KEY);
    logger.info('Daily leaderboard reset');
  }

  async resetWeeklyLeaderboard(): Promise<void> {
    await redis.del(this.WEEKLY_KEY);
    logger.info('Weekly leaderboard reset');
  }

  async getUserRankings(userId: string): Promise<{
    global: { rank: number; score: number } | null;
    daily: { rank: number; score: number } | null;
    weekly: { rank: number; score: number } | null;
    regional: { rank: number; score: number; region: string } | null;
  }> {
    const user = await this.userRepository.findOneBy({ id: userId });

    const getStats = async (key: string) => {
      const rank = await getUserRank(key, userId);
      if (rank === null) return null;
      const score = await redis.zscore(key, userId);
      return { rank: rank + 1, score: Number(score) || 0 };
    };

    const [global, daily, weekly] = await Promise.all([
      getStats(this.GLOBAL_KEY),
      getStats(this.DAILY_KEY),
      getStats(this.WEEKLY_KEY),
    ]);

    let regional: { rank: number; score: number; region: string } | null = null;
    if (user?.language) {
      const regionStats = await getStats(`${this.REGIONAL_PREFIX}:${user.language.toLowerCase()}`);
      if (regionStats) {
        regional = { ...regionStats, region: user.language };
      }
    }

    return { global, daily, weekly, regional };
  }

  async getLeaderboardAroundUser(
    userId: string,
    key: string = this.GLOBAL_KEY,
    range: number = 5
  ): Promise<DetailedLeaderboardEntry[]> {
    const rank = await getUserRank(key, userId);
    if (rank === null) return [];

    const start = Math.max(0, rank - range);
    const end = rank + range;

    const leaderboardData = await getLeaderboard(key, start, end);
    return this.enrichUserLeaderboard(leaderboardData);
  }

  async rebuildLeaderboards(): Promise<void> {
    logger.info('Rebuilding all leaderboards...');

    // Rebuild global leaderboard from database
    const users = await this.userRepository.find({
      where: { isBanned: false },
      select: ['id', 'xp', 'language'],
    });

    const pipeline = redis.pipeline();
    pipeline.del(this.GLOBAL_KEY);

    for (const user of users) {
      pipeline.zadd(this.GLOBAL_KEY, Number(user.xp), user.id);

      if (user.language) {
        const regionalKey = `${this.REGIONAL_PREFIX}:${user.language.toLowerCase()}`;
        pipeline.zadd(regionalKey, Number(user.xp), user.id);
      }
    }

    // Rebuild squad leaderboard
    const squads = await this.squadRepository.find({
      select: ['id', 'totalXp'],
    });

    pipeline.del(this.SQUADS_KEY);
    for (const squad of squads) {
      pipeline.zadd(this.SQUADS_KEY, Number(squad.totalXp), squad.id);
    }

    await pipeline.exec();
    logger.info('Leaderboards rebuilt', { users: users.length, squads: squads.length });
  }

  private async enrichUserLeaderboard(
    data: { member: string; score: number }[]
  ): Promise<DetailedLeaderboardEntry[]> {
    if (data.length === 0) return [];

    const userIds = data.map(d => d.member);
    const users = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.username', 'user.avatarUrl', 'user.tier'])
      .where('user.id IN (:...userIds)', { userIds })
      .getMany();

    const userMap = new Map(users.map(u => [u.id, u]));

    return data.map((entry, index) => {
      const user = userMap.get(entry.member);
      return {
        userId: entry.member,
        username: user?.username || 'Unknown',
        avatarUrl: user?.avatarUrl,
        tier: user?.tier,
        score: entry.score,
        rank: index + 1,
      };
    });
  }
}

export const leaderboardService = new LeaderboardService();

import { Repository, Between } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '@config/database';
import { setGameSession, getGameSession, deleteGameSession } from '@config/redis';
import { logger } from '@config/logger';
import { User, UserTier } from '@entities/User';
import { GameHistory, GameType, GameDifficulty } from '@entities/GameHistory';
import { Squad } from '@entities/Squad';
import { ApiError } from '@utils/errors';
import { calculateXPReward, calculateCreditReward, calculateLevel } from '@utils/helpers';
import { GameSession } from '@types';
import { userService } from './UserService';
import { leaderboardService } from './LeaderboardService';

// Game configuration
const GAME_CONFIG: Record<GameType, {
  energyCost: number;
  minDuration: number; // seconds
  maxDuration: number; // seconds
  maxPossibleScore: Record<GameDifficulty, number>;
}> = {
  [GameType.QUICK_FIRE]: {
    energyCost: 10,
    minDuration: 30,
    maxDuration: 300,
    maxPossibleScore: {
      [GameDifficulty.EASY]: 500,
      [GameDifficulty.MEDIUM]: 1000,
      [GameDifficulty.HARD]: 2000,
      [GameDifficulty.EXTREME]: 5000,
      [GameDifficulty.ADAPTIVE]: 1000,
    },
  },
  [GameType.DEEP_DIVE]: {
    energyCost: 20,
    minDuration: 120,
    maxDuration: 900,
    maxPossibleScore: {
      [GameDifficulty.EASY]: 1000,
      [GameDifficulty.MEDIUM]: 2500,
      [GameDifficulty.HARD]: 5000,
      [GameDifficulty.EXTREME]: 10000,
      [GameDifficulty.ADAPTIVE]: 3000,
    },
  },
  [GameType.CHALLENGE]: {
    energyCost: 15,
    minDuration: 60,
    maxDuration: 600,
    maxPossibleScore: {
      [GameDifficulty.EASY]: 750,
      [GameDifficulty.MEDIUM]: 1500,
      [GameDifficulty.HARD]: 3500,
      [GameDifficulty.EXTREME]: 7500,
      [GameDifficulty.ADAPTIVE]: 2000,
    },
  },
  [GameType.CREATIVE]: {
    energyCost: 25,
    minDuration: 180,
    maxDuration: 1800,
    maxPossibleScore: {
      [GameDifficulty.EASY]: 2000,
      [GameDifficulty.MEDIUM]: 4000,
      [GameDifficulty.HARD]: 8000,
      [GameDifficulty.EXTREME]: 15000,
      [GameDifficulty.ADAPTIVE]: 5000,
    },
  },
  [GameType.SQUAD_MISSION]: {
    energyCost: 30,
    minDuration: 300,
    maxDuration: 3600,
    maxPossibleScore: {
      [GameDifficulty.EASY]: 3000,
      [GameDifficulty.MEDIUM]: 6000,
      [GameDifficulty.HARD]: 12000,
      [GameDifficulty.EXTREME]: 25000,
      [GameDifficulty.ADAPTIVE]: 8000,
    },
  },
  [GameType.AI_GENERATED]: {
    energyCost: 15,
    minDuration: 60,
    maxDuration: 1200,
    maxPossibleScore: {
      [GameDifficulty.EASY]: 1000,
      [GameDifficulty.MEDIUM]: 2000,
      [GameDifficulty.HARD]: 4000,
      [GameDifficulty.EXTREME]: 8000,
      [GameDifficulty.ADAPTIVE]: 2000,
    },
  },
  [GameType.BRAIN_BOOST]: { energyCost: 10, minDuration: 30, maxDuration: 300, maxPossibleScore: { [GameDifficulty.EASY]: 500, [GameDifficulty.MEDIUM]: 1000, [GameDifficulty.HARD]: 2000, [GameDifficulty.EXTREME]: 5000, [GameDifficulty.ADAPTIVE]: 1000 } },
  [GameType.MEMORY_MATRIX]: { energyCost: 10, minDuration: 30, maxDuration: 300, maxPossibleScore: { [GameDifficulty.EASY]: 500, [GameDifficulty.MEDIUM]: 1000, [GameDifficulty.HARD]: 2000, [GameDifficulty.EXTREME]: 5000, [GameDifficulty.ADAPTIVE]: 1000 } },
  [GameType.WORD_WEAVER]: { energyCost: 10, minDuration: 30, maxDuration: 300, maxPossibleScore: { [GameDifficulty.EASY]: 500, [GameDifficulty.MEDIUM]: 1000, [GameDifficulty.HARD]: 2000, [GameDifficulty.EXTREME]: 5000, [GameDifficulty.ADAPTIVE]: 1000 } },
  [GameType.PATTERN_PULSE]: { energyCost: 10, minDuration: 30, maxDuration: 300, maxPossibleScore: { [GameDifficulty.EASY]: 500, [GameDifficulty.MEDIUM]: 1000, [GameDifficulty.HARD]: 2000, [GameDifficulty.EXTREME]: 5000, [GameDifficulty.ADAPTIVE]: 1000 } },
  [GameType.EMOTION_QUEST]: { energyCost: 10, minDuration: 30, maxDuration: 300, maxPossibleScore: { [GameDifficulty.EASY]: 500, [GameDifficulty.MEDIUM]: 1000, [GameDifficulty.HARD]: 2000, [GameDifficulty.EXTREME]: 5000, [GameDifficulty.ADAPTIVE]: 1000 } },
  [GameType.ANXIETY_ARENA]: { energyCost: 10, minDuration: 30, maxDuration: 300, maxPossibleScore: { [GameDifficulty.EASY]: 500, [GameDifficulty.MEDIUM]: 1000, [GameDifficulty.HARD]: 2000, [GameDifficulty.EXTREME]: 5000, [GameDifficulty.ADAPTIVE]: 1000 } },
  [GameType.CONFIDENCE_CLIMB]: { energyCost: 10, minDuration: 30, maxDuration: 300, maxPossibleScore: { [GameDifficulty.EASY]: 500, [GameDifficulty.MEDIUM]: 1000, [GameDifficulty.HARD]: 2000, [GameDifficulty.EXTREME]: 5000, [GameDifficulty.ADAPTIVE]: 1000 } },
  [GameType.SOCIAL_SIM]: { energyCost: 10, minDuration: 30, maxDuration: 300, maxPossibleScore: { [GameDifficulty.EASY]: 500, [GameDifficulty.MEDIUM]: 1000, [GameDifficulty.HARD]: 2000, [GameDifficulty.EXTREME]: 5000, [GameDifficulty.ADAPTIVE]: 1000 } },
  [GameType.CUSTOM_QUEST]: { energyCost: 10, minDuration: 30, maxDuration: 300, maxPossibleScore: { [GameDifficulty.EASY]: 500, [GameDifficulty.MEDIUM]: 1000, [GameDifficulty.HARD]: 2000, [GameDifficulty.EXTREME]: 5000, [GameDifficulty.ADAPTIVE]: 1000 } },
  [GameType.AI_CHALLENGE]: { energyCost: 10, minDuration: 30, maxDuration: 300, maxPossibleScore: { [GameDifficulty.EASY]: 500, [GameDifficulty.MEDIUM]: 1000, [GameDifficulty.HARD]: 2000, [GameDifficulty.EXTREME]: 5000, [GameDifficulty.ADAPTIVE]: 1000 } },
  [GameType.SQUAD_WAR]: { energyCost: 10, minDuration: 30, maxDuration: 300, maxPossibleScore: { [GameDifficulty.EASY]: 500, [GameDifficulty.MEDIUM]: 1000, [GameDifficulty.HARD]: 2000, [GameDifficulty.EXTREME]: 5000, [GameDifficulty.ADAPTIVE]: 1000 } },
  [GameType.DAILY_CHALLENGE]: { energyCost: 10, minDuration: 30, maxDuration: 300, maxPossibleScore: { [GameDifficulty.EASY]: 500, [GameDifficulty.MEDIUM]: 1000, [GameDifficulty.HARD]: 2000, [GameDifficulty.EXTREME]: 5000, [GameDifficulty.ADAPTIVE]: 1000 } },
  [GameType.WEEKLY_TOURNAMENT]: { energyCost: 10, minDuration: 30, maxDuration: 300, maxPossibleScore: { [GameDifficulty.EASY]: 500, [GameDifficulty.MEDIUM]: 1000, [GameDifficulty.HARD]: 2000, [GameDifficulty.EXTREME]: 5000, [GameDifficulty.ADAPTIVE]: 1000 } },
};

export class GameService {
  private userRepository: Repository<User>;
  private gameHistoryRepository: Repository<GameHistory>;
  private squadRepository: Repository<Squad>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.gameHistoryRepository = AppDataSource.getRepository(GameHistory);
    this.squadRepository = AppDataSource.getRepository(Squad);
  }

  /**
   * Start a new game session
   */
  async startGame(
    userId: string,
    gameType: GameType,
    difficulty: GameDifficulty,
    metadata?: Record<string, any>
  ): Promise<GameSession> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['squad'],
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const config = GAME_CONFIG[gameType];
    if (!config) {
      throw ApiError.badRequest('Invalid game type');
    }

    // Check energy
    const currentEnergy = this.calculateCurrentEnergy(user);
    if (currentEnergy < config.energyCost) {
      throw ApiError.badRequest(`Insufficient energy. Need ${config.energyCost}, have ${currentEnergy}`);
    }

    // Deduct energy
    await userService.consumeEnergy(userId, config.energyCost);

    // Generate session token
    const sessionToken = uuidv4();
    const startTime = Date.now();

    // Store session in Redis
    const session: GameSession = {
      sessionToken,
      userId,
      gameType,
      difficulty,
      startTime,
      metadata: metadata || {},
      isActive: true,
    };

    await setGameSession(userId, sessionToken, session);

    logger.info('Game session started', { userId, gameType, difficulty, sessionToken });

    return session;
  }

  /**
   * Submit game score
   */
  async submitScore(
    userId: string,
    sessionToken: string,
    score: number,
    metadata?: Record<string, any>
  ): Promise<{
    gameHistory: GameHistory;
    xpGained: number;
    creditsGained: number;
    leveledUp: boolean;
    newLevel: number;
    achievements: string[];
  }> {
    // Get session
    const session = await getGameSession<GameSession>(userId, sessionToken);
    if (!session || !session.isActive) {
      throw ApiError.badRequest('Invalid or inactive game session');
    }

    const durationSeconds = Math.floor((Date.now() - session.startTime) / 1000);

    const config = GAME_CONFIG[session.gameType as GameType]; // Moved config declaration here

    // Anti-cheat validations
    const antiCheatResult = await this.validateScore(
      userId,
      session,
      score,
      durationSeconds,
      config
    );

    if (!antiCheatResult.valid) {
      logger.warn('Score validation failed', {
        userId,
        sessionToken,
        reason: antiCheatResult.reason,
        score,
        duration: durationSeconds,
      });

      // Mark session as completed but flag the score
      await deleteGameSession(userId, sessionToken);
      throw ApiError.badRequest(`Score validation failed: ${antiCheatResult.reason}`);
    }

    // Get user
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['squad'],
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Calculate rewards
    const difficulty = session.difficulty as GameDifficulty;
    const baseXP = calculateXPReward(score, difficulty);
    const baseCredits = calculateCreditReward(score, difficulty);

    // Apply bonuses
    const { xpGained, creditsGained, bonuses } = this.applyBonuses(
      user,
      baseXP,
      baseCredits,
      metadata
    );

    // Create game history record
    const gameHistory = this.gameHistoryRepository.create({
      user,
      gameType: session.gameType as GameType,
      difficulty,
      score,
      durationSeconds: durationSeconds,
      xpEarned: xpGained,
      creditsEarned: creditsGained,
      metadata: {
        ...session.metadata,
        ...metadata,
        bonuses,
        antiCheat: antiCheatResult.checks,
      },
      isValid: true,
    }) as any;

    await this.gameHistoryRepository.save(gameHistory);

    // Update user stats
    const xpResult = await userService.addXP(userId, xpGained, `game:${session.gameType}`);
    await userService.addCredits(userId, creditsGained, `game:${session.gameType}`);

    // Update squad XP if applicable
    if (user.squad) {
      await this.addSquadXP(user.squad.id, Math.floor(xpGained * 0.1));
    }

    // Update leaderboards
    await leaderboardService.updateGameScore(userId, session.gameType as GameType, difficulty, score);
    await leaderboardService.updateUserScore(userId, xpGained);

    // Check achievements
    const achievements = await this.checkAchievements(userId, gameHistory);

    // Delete session
    await deleteGameSession(userId, sessionToken);

    logger.info('Game completed', {
      userId,
      gameType: session.gameType,
      score,
      xpGained,
      creditsGained,
      leveledUp: xpResult.leveledUp,
    });

    return {
      gameHistory,
      xpGained,
      creditsGained,
      leveledUp: xpResult.leveledUp,
      newLevel: xpResult.newLevel,
      achievements,
    };
  }

  /**
   * Get game history for user
   */
  async getGameHistory(
    userId: string,
    options?: {
      gameType?: GameType;
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ games: GameHistory[]; total: number }> {
    const where: any = { user: { id: userId } };

    if (options?.gameType) {
      where.gameType = options.gameType;
    }
    if (options?.startDate && options?.endDate) {
      where.playedAt = Between(options.startDate, options.endDate);
    }

    const [games, total] = await this.gameHistoryRepository.findAndCount({
      where,
      order: { playedAt: 'DESC' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    });

    return { games, total };
  }

  /**
   * Get game statistics for user
   */
  async getGameStats(userId: string, gameType?: string): Promise<{
    totalGames: number;
    totalScore: number;
    totalXP: number;
    averageScore: number;
    bestScore: number;
    byGameType: Record<string, { games: number; avgScore: number; bestScore: number }>;
    recentPerformance: { date: string; score: number }[];
  }> {
    const where: any = { user: { id: userId }, isValid: true };
    if (gameType) {
      where.gameType = gameType;
    }

    const games = await this.gameHistoryRepository.find({
      where,
      order: { playedAt: 'DESC' },
    });

    if (games.length === 0) {
      return {
        totalGames: 0,
        totalScore: 0,
        totalXP: 0,
        averageScore: 0,
        bestScore: 0,
        byGameType: {},
        recentPerformance: [],
      };
    }

    const totalScore = games.reduce((sum, g) => sum + g.score, 0);
    const totalXP = games.reduce((sum, g) => sum + g.xpEarned, 0);
    const bestScore = Math.max(...games.map(g => g.score));

    // Stats by game type
    const byGameType: Record<string, { games: number; avgScore: number; bestScore: number }> = {};
    for (const game of games) {
      if (!byGameType[game.gameType]) {
        byGameType[game.gameType] = { games: 0, avgScore: 0, bestScore: 0 };
      }
      byGameType[game.gameType].games += 1;
      byGameType[game.gameType].bestScore = Math.max(byGameType[game.gameType].bestScore, game.score);
    }

    // Calculate averages
    for (const type of Object.keys(byGameType)) {
      const typeGames = games.filter(g => g.gameType === type);
      byGameType[type].avgScore = Math.round(
        typeGames.reduce((sum, g) => sum + g.score, 0) / typeGames.length
      );
    }

    // Recent performance (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentGames = games.filter(g => g.playedAt >= sevenDaysAgo);
    const dailyScores: Record<string, number[]> = {};

    for (const game of recentGames) {
      const dateKey = game.playedAt.toISOString().split('T')[0];
      if (!dailyScores[dateKey]) {
        dailyScores[dateKey] = [];
      }
      dailyScores[dateKey].push(game.score);
    }

    const recentPerformance = Object.entries(dailyScores).map(([date, scores]) => ({
      date,
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalGames: games.length,
      totalScore,
      totalXP,
      averageScore: Math.round(totalScore / games.length),
      bestScore,
      byGameType,
      recentPerformance,
    };
  }

  /**
   * Validate active session exists
   */
  async hasActiveSession(userId: string): Promise<boolean> {
    const pattern = `game_session:${userId}:*`;
    const keys = await redisClient.keys(pattern);
    return keys.length > 0;
  }

  // Private methods

  private calculateCurrentEnergy(user: User): number {
    const now = Date.now();
    const lastUpdate = user.lastEnergyUpdate?.getTime() || now;
    const minutesPassed = (now - lastUpdate) / (1000 * 60);
    const regenRate = 1 / 5; // 1 energy per 5 minutes
    const regenerated = Math.floor(minutesPassed * regenRate);
    return Math.min(user.energy + regenerated, user.maxEnergy);
  }

  private async validateScore(
    userId: string,
    session: GameSession,
    score: number,
    duration: number,
    config: typeof GAME_CONFIG[GameType]
  ): Promise<{ valid: boolean; reason?: string; checks: Record<string, boolean> }> {
    const checks: Record<string, boolean> = {};
    const difficulty = session.difficulty as GameDifficulty;

    // Check 1: Duration validation
    checks.durationValid = duration >= config.minDuration && duration <= config.maxDuration;
    if (!checks.durationValid) {
      return {
        valid: false,
        reason: `Invalid duration: ${duration}s (expected ${config.minDuration}-${config.maxDuration}s)`,
        checks,
      };
    }

    // Check 2: Score plausibility
    const maxScore = config.maxPossibleScore[difficulty];
    checks.scorePlausible = score >= 0 && score <= maxScore;
    if (!checks.scorePlausible) {
      return {
        valid: false,
        reason: `Score ${score} exceeds maximum possible ${maxScore} for difficulty ${difficulty}`,
        checks,
      };
    }

    // Check 3: Score/time ratio (suspicious if too high)
    const scorePerSecond = score / duration;
    const maxScorePerSecond = maxScore / config.minDuration;
    checks.scoreRateValid = scorePerSecond <= maxScorePerSecond * 1.2; // 20% tolerance
    if (!checks.scoreRateValid) {
      return {
        valid: false,
        reason: `Suspicious score rate: ${scorePerSecond.toFixed(2)}/s`,
        checks,
      };
    }

    // Check 4: Statistical outlier detection
    const recentGames = await this.gameHistoryRepository.find({
      where: {
        user: { id: userId },
        gameType: session.gameType as GameType,
        difficulty,
        isValid: true,
      },
      order: { playedAt: 'DESC' },
      take: 20,
    });

    if (recentGames.length >= 5) {
      const scores = recentGames.map(g => g.score);
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const stdDev = Math.sqrt(
        scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
      );

      // Flag if > 3 standard deviations above mean
      const zScore = stdDev > 0 ? (score - mean) / stdDev : 0;
      checks.notStatisticalOutlier = zScore <= 3;

      if (!checks.notStatisticalOutlier) {
        logger.warn('Statistical outlier detected', {
          userId,
          score,
          mean: mean.toFixed(2),
          stdDev: stdDev.toFixed(2),
          zScore: zScore.toFixed(2),
        });
        // Don't reject, just flag for review
      }
    } else {
      checks.notStatisticalOutlier = true; // Not enough data
    }

    return { valid: true, checks };
  }

  private applyBonuses(
    user: User,
    baseXP: number,
    baseCredits: number,
    metadata?: Record<string, any>
  ): { xpGained: number; creditsGained: number; bonuses: string[] } {
    let xpMultiplier = 1;
    let creditMultiplier = 1;
    const bonuses: string[] = [];

    // Tier bonus
    if (user.tier === UserTier.OPERATIVE) {
      xpMultiplier += 0.1;
      bonuses.push('Operative XP Boost (+10%)');
    } else if (user.tier === UserTier.PRO_CREATOR) {
      xpMultiplier += 0.25;
      creditMultiplier += 0.1;
      bonuses.push('Pro Creator Boost (XP +25%, Credits +10%)');
    }

    // Streak bonus
    if (user.streak >= 7) {
      const streakBonus = Math.min(user.streak * 0.01, 0.3); // Max 30%
      xpMultiplier += streakBonus;
      bonuses.push(`${user.streak}-day Streak (XP +${Math.round(streakBonus * 100)}%)`);
    }

    // Accuracy bonus from metadata
    if (metadata?.accuracy && metadata.accuracy >= 90) {
      xpMultiplier += 0.15;
      bonuses.push('Perfect Accuracy (+15% XP)');
    }

    // Combo bonus
    if (metadata?.maxCombo && metadata.maxCombo >= 10) {
      const comboBonus = Math.min(metadata.maxCombo * 0.01, 0.2);
      xpMultiplier += comboBonus;
      bonuses.push(`${metadata.maxCombo}x Combo (+${Math.round(comboBonus * 100)}% XP)`);
    }

    // Squad bonus
    if (user.squad) {
      xpMultiplier += 0.05;
      bonuses.push('Squad Bonus (+5% XP)');
    }

    return {
      xpGained: Math.round(baseXP * xpMultiplier),
      creditsGained: Math.round(baseCredits * creditMultiplier),
      bonuses,
    };
  }

  private async addSquadXP(squadId: string, xp: number): Promise<void> {
    const squad = await this.squadRepository.findOne({ where: { id: squadId } });
    if (squad) {
      squad.totalXp = Number(squad.totalXp) + xp;
      squad.weeklyXp = Number(squad.weeklyXp) + xp;
      await this.squadRepository.save(squad);
    }
  }

  private async checkAchievements(userId: string, game: GameHistory): Promise<string[]> {
    const achievements: string[] = [];

    // First game achievement
    const totalGames = await this.gameHistoryRepository.count({
      where: { user: { id: userId } },
    });
    if (totalGames === 1) {
      achievements.push('first_game');
    }

    // High score achievements
    if (game.score >= 1000) achievements.push('score_1000');
    if (game.score >= 5000) achievements.push('score_5000');
    if (game.score >= 10000) achievements.push('score_10000');

    // Game count milestones
    if (totalGames === 10) achievements.push('games_10');
    if (totalGames === 50) achievements.push('games_50');
    if (totalGames === 100) achievements.push('games_100');

    // Speed achievements
    if (game.durationSeconds <= 60 && game.score >= 500) {
      achievements.push('speed_demon');
    }

    // Perfect accuracy
    const metadata = game.metadata as any;
    if (metadata?.accuracy === 100) {
      achievements.push('perfectionist');
    }

    // TODO: Award achievement items to inventory

    return achievements;
  }

  /**
   * Get available game types and their info
   */
  async getGameTypes(): Promise<{ type: GameType; config: typeof GAME_CONFIG[GameType] }[]> {
    return Object.entries(GAME_CONFIG).map(([type, config]) => ({
      type: type as GameType,
      config,
    }));
  }

  // Aliases for backwards compatibility
  submitGame = this.submitScore;
  getHistory = this.getGameHistory;

  /**
   * Get specific game history entry by ID
   */
  async getGameById(id: string, userId: string): Promise<GameHistory> {
    const game = await this.gameHistoryRepository.findOne({
      where: { id, user: { id: userId } }
    });
    if (!game) throw ApiError.notFound('Game record not found');
    return game;
  }

  // Daily Challenge Stubs
  async getDailyChallenge(userId: string) {
    return { id: 'daily-1', type: GameType.QUICK_FIRE, difficulty: GameDifficulty.MEDIUM };
  }

  async completeDailyChallenge(userId: string, sessionToken: string, score: number, metadata?: any) {
    return this.submitScore(userId, sessionToken, GameType.DAILY_CHALLENGE, score, metadata);
  }

  // Generated Games Stubs
  async getGeneratedGames(options: any) {
    return { items: [], total: 0 };
  }

  async getGeneratedGameById(id: string, userId?: string) {
    throw ApiError.notFound('Generated game not found');
  }

  async createGeneratedGame(userId: string, data: any) {
    throw ApiError.notImplemented('AI Game Generation temporarily unavailable');
  }

  async updateGeneratedGame(id: string, userId: string, updates: any) {
    throw ApiError.notFound('Game not found');
  }

  async deleteGeneratedGame(id: string, userId: string) {
    throw ApiError.notFound('Game not found');
  }

  async startGeneratedGame(id: string, userId: string) {
    throw ApiError.notFound('Game not found');
  }

  async updateGeneratedGameProgress(id: string, userId: string, sessionToken: string, data: any) {
    throw ApiError.notFound('Session not found');
  }

  async completeGeneratedGame(id: string, userId: string, sessionToken: string, data: any) {
    throw ApiError.notFound('Session not found');
  }

  async rateGeneratedGame(id: string, userId: string, rating: number, review?: string) {
    throw ApiError.notFound('Game not found');
  }
}

export const gameService = new GameService();

import { Repository } from 'typeorm';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '@config/database';
import { config } from '@config/env';
import { redisClient, setSession, getSession, deleteSession } from '@config/redis';
import { verifyFirebaseToken, getFirebaseUser, setCustomClaims } from '@config/firebase';
import { logger } from '@config/logger';
import { User, UserTier, UserRole } from '@entities/User';
import { ApiError } from '@utils/errors';
import { JWTPayload, AuthUser } from '@types';

export class AuthService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * Verify Firebase ID token and create/update user
   */
  async verifyAndAuthenticate(idToken: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
  }> {
    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(idToken);
    const firebaseUid = decodedToken.uid;
    const phone = decodedToken.phone_number;
    const email = decodedToken.email;

    // Check if user exists
    let user = await this.userRepository.findOne({
      where: { firebaseUid },
    });

    const isNewUser = !user;

    if (!user) {
      // Create new user
      // @ts-ignore
      user = this.userRepository.create({
        firebaseUid,
        phone,
        email,
        username: `user_${uuidv4().slice(0, 8)}`,
        tier: UserTier.FREE,
        role: UserRole.USER,
        credits: 100, // Welcome bonus
        xp: 0,
        currentEnergy: 100, // Fixed: energy -> currentEnergy
        maxEnergy: 100,
        streak: 0,
        language: 'EN',
        preferences: { // Fixed: settings -> preferences
          notifications: true,
          soundEffects: true, // Fixed: soundEnabled -> soundEffects
          darkMode: true, // Fixed: theme -> darkMode
          language: 'EN',
          timezone: 'UTC',
        },
      } as any);

      await this.userRepository.save(user);

      // Set custom claims in Firebase
      await setCustomClaims(firebaseUid, {
        tier: UserTier.FREE,
        role: UserRole.USER,
      });

      logger.info('New user created', { userId: user.id, firebaseUid });
    } else {
      // Update last login
      user.lastLogin = new Date();

      // Check and update streak
      const streakResult = this.checkAndUpdateStreak(user);
      user.streak = streakResult.newStreak;
      user.lastDailyReward = streakResult.lastStreakDate; // Fixed: lastStreakDate -> lastDailyReward

      if (streakResult.streakBonus > 0) {
        user.credits += streakResult.streakBonus;
        logger.info('Streak bonus awarded', {
          userId: user.id,
          streak: user.streak,
          bonus: streakResult.streakBonus
        });
      }

      await this.userRepository.save(user);
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Store session in Redis
    await this.storeSession(user.id, accessToken, refreshToken);

    return { user, accessToken, refreshToken, isNewUser };
  }

  /**
   * Verify mock phone login (unified auth approach)
   */
  async verifyAndAuthenticateMock(phone: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
  }> {
    // Check if user exists by phone
    let user = await this.userRepository.findOne({
      where: { phone },
    });

    const isNewUser = !user;

    if (!user) {
      // Create new user
      // @ts-ignore
      user = this.userRepository.create({
        firebaseUid: `mock_${uuidv4().split('-')[0]}`,
        phone,
        username: `user_${uuidv4().slice(0, 8)}`,
        tier: UserTier.FREE,
        role: UserRole.USER,
        credits: 100,
        xp: 0,
        currentEnergy: 100,
        maxEnergy: 100,
        streak: 0,
        language: 'EN',
        authProvider: 'phone',
        preferences: {
          notifications: true,
          soundEffects: true,
          darkMode: true,
          language: 'EN',
          timezone: 'UTC',
        },
      } as any);

      await this.userRepository.save(user);
      logger.info('New mock user created', { userId: user.id, phone });
    } else {
      user.lastLogin = new Date();
      await this.userRepository.save(user);
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Store session in Redis
    await this.storeSession(user.id, accessToken, refreshToken);

    return { user, accessToken, refreshToken, isNewUser };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as JWTPayload;

      // Verify session exists
      const session = await getSession<any>(payload.userId);
      if (!session || session.refreshToken !== refreshToken) {
        throw ApiError.unauthorized('Invalid refresh token');
      }

      // Get user
      const user = await this.userRepository.findOne({
        where: { id: payload.userId },
      });

      if (!user || user.isBanned) {
        throw ApiError.unauthorized('User not found or banned');
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      // Update session
      await this.storeSession(user.id, newAccessToken, newRefreshToken);

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw ApiError.unauthorized('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Logout user - invalidate session
   */
  async logout(userId: string): Promise<void> {
    await deleteSession(userId);
    logger.info('User logged out', { userId });
  }

  /**
   * Validate access token and return user
   */
  async validateToken(token: string): Promise<AuthUser> {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;

      // Verify session exists
      const session = await getSession(payload.userId);
      if (!session) {
        throw ApiError.unauthorized('Session expired');
      }

      // Get user from cache or database
      const cacheKey = `cache:user:${payload.userId}`;
      let userData = await redisClient.get(cacheKey);

      let user: User | null;
      if (userData) {
        user = JSON.parse(userData);
      } else {
        user = await this.userRepository.findOne({
          where: { id: payload.userId },
          // relations: ['squad'], // Removed implicit relation
        });

        if (user) {
          await redisClient.setex(cacheKey, 300, JSON.stringify(user)); // Cache for 5 min
        }
      }

      if (!user || user.isBanned) {
        throw ApiError.unauthorized('User not found or banned');
      }

      return {
        id: user.id,
        firebaseUid: user.firebaseUid,
        tier: user.tier,
        role: user.role,
        squadId: user.squadId, // Fixed: user.squad?.id -> user.squadId
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw ApiError.unauthorized('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      // relations: ['inventory', 'skills'], // Removed relations that might miss entities
    });
  }

  /**
   * Check if user has admin role
   */
  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return user?.role === UserRole.ADMIN;
  }

  /**
   * Ban/unban user (admin only)
   */
  async setUserBanStatus(userId: string, isBanned: boolean, reason?: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    user.isBanned = isBanned;
    user.banReason = reason || null;

    await this.userRepository.save(user);

    // Invalidate session if banned
    if (isBanned) {
      await deleteSession(userId);
    }

    logger.info(`User ${isBanned ? 'banned' : 'unbanned'}`, { userId, reason });
    return user;
  }

  // Private methods

  private generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      sub: user.id, // Mandatory JWT field
      userId: user.id,
      firebaseUid: user.firebaseUid,
      tier: user.tier,
      role: user.role,
      squadId: user.squadId, // Fixed: user.squad?.id -> user.squadId
    };

    return jwt.sign(payload, config.jwt.secret as string, {
      expiresIn: config.jwt.expiresIn,
    } as any);
  }

  private generateRefreshToken(user: User): string {
    const payload = {
      sub: user.id,
      userId: user.id,
      type: 'refresh',
    };

    return jwt.sign(payload, config.jwt.refreshSecret as string, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as any);
  }

  private async storeSession(
    userId: string,
    accessToken: string,
    refreshToken: string
  ): Promise<void> {
    await setSession(userId, {
      accessToken,
      refreshToken,
      createdAt: new Date().toISOString(),
    });
  }

  private checkAndUpdateStreak(user: User): {
    newStreak: number;
    lastStreakDate: Date;
    streakBonus: number;
  } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastStreakDate = user.lastDailyReward // Fixed: lastStreakDate -> lastDailyReward
      ? new Date(user.lastDailyReward.getFullYear(), user.lastDailyReward.getMonth(), user.lastDailyReward.getDate())
      : null;

    if (!lastStreakDate) {
      // First login
      return { newStreak: 1, lastStreakDate: today, streakBonus: 10 };
    }

    const daysDiff = Math.floor((today.getTime() - lastStreakDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Same day - no change
      return { newStreak: user.streak, lastStreakDate: user.lastDailyReward!, streakBonus: 0 };
    } else if (daysDiff === 1) {
      // Consecutive day - increment streak
      const newStreak = user.streak + 1;
      const streakBonus = Math.min(newStreak * 5, 150); // Max 150 credits
      return { newStreak, lastStreakDate: today, streakBonus };
    } else {
      // Streak broken - reset
      return { newStreak: 1, lastStreakDate: today, streakBonus: 10 };
    }
  }

  // Aliases for backwards compatibility
  verifyAndCreateSession = this.verifyAndAuthenticate;
  refreshAccessToken = this.refreshTokens;
}

export const authService = new AuthService();

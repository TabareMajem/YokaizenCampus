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

    if (!phone) {
      throw ApiError.badRequest('Phone number is required for authentication');
    }

    // Check if user exists
    let user = await this.userRepository.findOne({
      where: { firebaseUid },
      relations: ['squad'],
    });

    const isNewUser = !user;

    if (!user) {
      // Create new user
      user = this.userRepository.create({
        firebaseUid,
        phone,
        username: `user_${uuidv4().slice(0, 8)}`,
        tier: UserTier.FREE,
        role: UserRole.USER,
        credits: 100, // Welcome bonus
        xp: 0,
        energy: 100,
        maxEnergy: 100,
        streak: 0,
        language: 'EN',
        settings: {
          notifications: true,
          soundEnabled: true,
          theme: 'dark',
        },
      });

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
      user.lastStreakDate = streakResult.lastStreakDate;
      
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
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as JWTPayload;
      
      // Verify session exists
      const session = await getSession(payload.userId);
      if (!session || session.refreshToken !== refreshToken) {
        throw ApiError.unauthorized('Invalid refresh token');
      }

      // Get user
      const user = await this.userRepository.findOne({
        where: { id: payload.userId },
        relations: ['squad'],
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
          relations: ['squad'],
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
        squadId: user.squad?.id,
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
      relations: ['squad', 'inventory', 'skills'],
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
      userId: user.id,
      firebaseUid: user.firebaseUid,
      tier: user.tier,
      role: user.role,
      squadId: user.squad?.id,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  private generateRefreshToken(user: User): string {
    const payload = {
      userId: user.id,
      type: 'refresh',
    };

    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });
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
    const lastStreakDate = user.lastStreakDate 
      ? new Date(user.lastStreakDate.getFullYear(), user.lastStreakDate.getMonth(), user.lastStreakDate.getDate())
      : null;

    if (!lastStreakDate) {
      // First login
      return { newStreak: 1, lastStreakDate: today, streakBonus: 10 };
    }

    const daysDiff = Math.floor((today.getTime() - lastStreakDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Same day - no change
      return { newStreak: user.streak, lastStreakDate: user.lastStreakDate!, streakBonus: 0 };
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
}

export const authService = new AuthService();

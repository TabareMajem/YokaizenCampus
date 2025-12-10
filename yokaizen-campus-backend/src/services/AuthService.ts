// Yokaizen Campus - Authentication Service
// JWT-based authentication with bcrypt password hashing

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../utils/prisma.js';
import { generateSecureToken, parseDuration, sanitizeUser } from '../utils/helpers.js';
import {
  CreateUserInput,
  JWTPayload,
  TokenPair,
  AuthResponse,
  SafeUser,
  UserRole,
} from '../types/index.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../middleware/errorHandler.js';

const SALT_ROUNDS = 12;

// Generate JWT access token
function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

// Generate refresh token
async function generateRefreshToken(userId: string): Promise<string> {
  const token = generateSecureToken(64);
  const expiresAt = new Date(Date.now() + parseDuration(config.jwt.refreshExpiresIn));

  await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

// Auth service class
export class AuthService {
  // Register a new user
  async register(input: CreateUserInput): Promise<AuthResponse> {
    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Create user with career path
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        fullName: input.fullName,
        role: input.role || 'STUDENT',
        schoolId: input.schoolId,
        // Create career path
        careerPath: {
          create: {
            unlockedNodes: ['SCOUT'],
            stats: {
              orchestration: 10,
              resilience: 10,
              creativity: 10,
              logic: 10,
              ethics: 10,
            },
          },
        },
      },
      include: {
        careerPath: true,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tier: user.subscriptionTier,
      schoolId: user.schoolId || undefined,
    });

    const refreshToken = await generateRefreshToken(user.id);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        actionType: 'REGISTER',
        details: `User registered with role: ${user.role}`,
      },
    });

    return {
      user: this.toSafeUser(user),
      tokens: { accessToken, refreshToken },
      careerPath: user.careerPath ? {
        id: user.careerPath.id,
        userId: user.careerPath.userId,
        unlockedNodes: user.careerPath.unlockedNodes,
        stats: user.careerPath.stats as any,
        achievements: user.careerPath.achievements,
        chaosEventsSurvived: user.careerPath.chaosEventsSurvived,
      } : null,
    };
  }

  // Login user
  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        careerPath: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tier: user.subscriptionTier,
      schoolId: user.schoolId || undefined,
    });

    const refreshToken = await generateRefreshToken(user.id);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        actionType: 'LOGIN',
        details: 'User logged in',
      },
    });

    return {
      user: this.toSafeUser(user),
      tokens: { accessToken, refreshToken },
      careerPath: user.careerPath ? {
        id: user.careerPath.id,
        userId: user.careerPath.userId,
        unlockedNodes: user.careerPath.unlockedNodes,
        stats: user.careerPath.stats as any,
        achievements: user.careerPath.achievements,
        chaosEventsSurvived: user.careerPath.chaosEventsSurvived,
      } : null,
    };
  }

  // Refresh tokens
  async refresh(refreshToken: string): Promise<TokenPair> {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: storedToken.userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Delete old refresh token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tier: user.subscriptionTier,
      schoolId: user.schoolId || undefined,
    });

    const newRefreshToken = await generateRefreshToken(user.id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  // Logout (invalidate refresh token)
  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  // Logout from all devices
  async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  // Change password
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all refresh tokens
    await this.logoutAll(userId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        actionType: 'PASSWORD_CHANGE',
        details: 'Password changed',
      },
    });
  }

  // Get user profile
  async getProfile(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return this.toSafeUser(user);
  }

  // Update profile
  async updateProfile(
    userId: string,
    updates: { fullName?: string; avatarUrl?: string }
  ): Promise<SafeUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    return this.toSafeUser(user);
  }

  // Convert user to safe user (without password)
  private toSafeUser(user: any): SafeUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      level: user.level,
      xp: user.xp,
      credits: user.credits,
      subscriptionTier: user.subscriptionTier,
      philosophyMode: user.philosophyMode,
      schoolId: user.schoolId,
      createdAt: user.createdAt,
    };
  }

  // Verify token (for WebSocket auth)
  verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch {
      return null;
    }
  }
}

// Factory function
export function createAuthService(): AuthService {
  return new AuthService();
}

// Clean up expired refresh tokens (run periodically)
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  return result.count;
}

// Export singleton instance
export const authService = new AuthService();


import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/AuthService';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['STUDENT', 'TEACHER', 'PARENT']).optional().default('STUDENT'),
  schoolId: z.string().uuid().optional(),
  philosophyMode: z.enum(['FINLAND', 'KOREA', 'JAPAN']).optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional(),
  philosophyMode: z.enum(['FINLAND', 'KOREA', 'JAPAN']).optional()
});

export class AuthController {
  /**
   * POST /auth/register
   * Register a new user
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const result = await authService.register(validation.data);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result
    });
  });

  /**
   * POST /auth/login
   * Login user
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const result = await authService.login(
      validation.data.email,
      validation.data.password
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  });

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  refresh = asyncHandler(async (req: Request, res: Response) => {
    const validation = refreshSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const result = await authService.refreshToken(validation.data.refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed',
      data: result
    });
  });

  /**
   * POST /auth/logout
   * Logout user (invalidate refresh token)
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });

  /**
   * GET /auth/me
   * Get current user profile
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const profile = await authService.getProfile(userId);

    res.json({
      success: true,
      data: profile
    });
  });

  /**
   * PATCH /auth/me
   * Update current user profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const profile = await authService.updateProfile(userId, validation.data);

    res.json({
      success: true,
      message: 'Profile updated',
      data: profile
    });
  });

  /**
   * POST /auth/change-password
   * Change password
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    await authService.changePassword(
      userId,
      validation.data.currentPassword,
      validation.data.newPassword
    );

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.'
    });
  });

  /**
   * POST /auth/verify-token
   * Verify if a token is valid (for WebSocket auth)
   */
  verifyToken = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      throw new ValidationError('Token is required');
    }

    const payload = await authService.verifyToken(token);

    res.json({
      success: true,
      data: { valid: true, userId: payload.userId, role: payload.role }
    });
  });

  /**
   * POST /auth/firebase
   * Login or register using Firebase/Google credentials
   */
  loginWithFirebase = asyncHandler(async (req: Request, res: Response) => {
    const { firebaseUid, email, displayName } = req.body;

    if (!firebaseUid || !email) {
      throw new ValidationError('Firebase UID and email are required');
    }

    const result = await authService.loginOrRegisterWithFirebase(
      firebaseUid,
      email,
      displayName || null
    );

    res.json({
      success: true,
      message: 'Firebase login successful',
      data: result
    });
  });
}

export const authController = new AuthController();

import { Response } from 'express';
import { authService } from '@services/AuthService';
import { asyncHandler, successResponse } from '@utils/errors';
import { AuthenticatedRequest } from '@/types';

export class AuthController {
  /**
   * POST /auth/verify
   * Verify Firebase token and create session
   */
  verify = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { idToken } = req.body;

    const result = await authService.verifyAndCreateSession(idToken);

    res.json(successResponse({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }));
  });

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  refresh = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { refreshToken } = req.body;

    const result = await authService.refreshAccessToken(refreshToken);

    res.json(successResponse({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }));
  });

  /**
   * POST /auth/logout
   * Invalidate session
   */
  logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await authService.logout(req.user!.userId);

    res.json(successResponse({ message: 'Logged out successfully' }));
  });

  /**
   * GET /auth/me
   * Get current session info (validates token)
   */
  me = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json(successResponse({
      userId: req.user!.userId,
      tier: req.user!.tier,
      role: req.user!.role,
      squadId: req.user!.squadId,
    }));
  });
}

export const authController = new AuthController();

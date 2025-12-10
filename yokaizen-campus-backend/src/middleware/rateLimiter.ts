// Yokaizen Campus - Rate Limiting Middleware
// Protect API endpoints from abuse

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { APIResponse } from '../types/index.js';

// Default rate limiter (general API endpoints)
export const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Please try again later',
  } as APIResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.userId || req.ip || 'unknown';
  },
});

// Strict rate limiter (auth endpoints)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Please try again in 15 minutes',
  } as APIResponse,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// AI endpoint limiter (expensive operations)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI requests per minute
  message: {
    success: false,
    error: 'AI rate limit exceeded',
    message: 'Please wait before making more AI requests',
  } as APIResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
  skip: (req: Request) => {
    // PRO users get higher limits
    return req.user?.tier === 'PRO';
  },
});

// PRO AI limiter (for subscribed users)
export const proAiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 AI requests per minute for PRO
  message: {
    success: false,
    error: 'AI rate limit exceeded',
    message: 'Please wait before making more AI requests',
  } as APIResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || 'unknown';
  },
});

// Graph sync limiter (debounced autosave)
export const graphSyncLimiter = rateLimit({
  windowMs: 5 * 1000, // 5 seconds
  max: 2, // 2 syncs per 5 seconds (debounced)
  message: {
    success: false,
    error: 'Sync rate limit',
    message: 'Graph syncing too frequently',
  } as APIResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return `graph:${req.user?.userId || req.ip || 'unknown'}`;
  },
});

// Classroom event limiter (broadcasts, chaos)
export const classroomEventLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 5, // 5 events per 30 seconds
  message: {
    success: false,
    error: 'Event rate limit',
    message: 'Too many classroom events',
  } as APIResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return `classroom:${req.params.id}:${req.user?.userId || 'unknown'}`;
  },
});

// Grant application limiter (prevent spam)
export const grantLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // 3 applications per day
  message: {
    success: false,
    error: 'Application limit',
    message: 'You have submitted too many grant applications today',
  } as APIResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return `grant:${req.body.contactEmail || req.ip || 'unknown'}`;
  },
});

// AR scan limiter (prevent rapid scanning)
export const arScanLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 5, // 5 scans per 10 seconds
  message: {
    success: false,
    error: 'Scan limit',
    message: 'Scanning too quickly',
  } as APIResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return `ar:${req.user?.userId || req.ip || 'unknown'}`;
  },
});

// Dynamic rate limiter factory
export function createRateLimiter(options: {
  windowMs?: number;
  max?: number;
  message?: string;
  keyPrefix?: string;
}) {
  return rateLimit({
    windowMs: options.windowMs || 60 * 1000,
    max: options.max || 30,
    message: {
      success: false,
      error: 'Rate limit exceeded',
      message: options.message || 'Please try again later',
    } as APIResponse,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const prefix = options.keyPrefix || 'custom';
      return `${prefix}:${req.user?.userId || req.ip || 'unknown'}`;
    },
  });
}

// Combined rate limiter that applies different limits based on user tier
export function tieredRateLimiter(
  freeLimit: number,
  proLimit: number,
  windowMs: number = 60 * 1000
) {
  return (req: Request, res: Response, next: () => void) => {
    const limiter = req.user?.tier === 'PRO'
      ? createRateLimiter({ windowMs, max: proLimit, keyPrefix: 'pro' })
      : createRateLimiter({ windowMs, max: freeLimit, keyPrefix: 'free' });

    limiter(req, res, next);
  };
}

// Default export object with all rate limiters
export const rateLimiter = {
  default: defaultLimiter,
  auth: authLimiter,
  ai: aiLimiter,
  proAi: proAiLimiter,
  graphSync: graphSyncLimiter,
  classroomEvent: classroomEventLimiter,
  grant: grantLimiter,
  arScan: arScanLimiter,
};


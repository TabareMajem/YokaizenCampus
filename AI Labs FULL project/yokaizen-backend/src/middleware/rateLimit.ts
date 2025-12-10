import { Response, NextFunction } from 'express';
import { redis } from '@config/redis';
import { config } from '@config/env';
import { logger, securityLogger } from '@config/logger';
import { ApiError } from '@utils/errors';
import { AuthenticatedRequest } from '@/types';
import { UserTier } from '@entities/User';

interface RateLimitOptions {
  windowMs?: number;        // Time window in milliseconds
  maxRequests?: number;     // Max requests per window (overrides tier-based)
  keyPrefix?: string;       // Custom key prefix
  skipAuth?: boolean;       // Allow unauthenticated requests
  tierBased?: boolean;      // Use tier-based limits
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
}

// Tier-based rate limits (requests per minute)
const TIER_LIMITS: Record<string, number> = {
  [UserTier.FREE]: config.rateLimit.freeTier,
  [UserTier.OPERATIVE]: config.rateLimit.operativeTier,
  [UserTier.PRO_CREATOR]: config.rateLimit.proTier,
  default: 10,
};

// Specific endpoint limits
const ENDPOINT_LIMITS: Record<string, number> = {
  'ai:chat': 20,
  'ai:generate-image': 5,
  'ai:generate-game': 2,
  'auth:verify': 10,
  'payment:checkout': 5,
};

/**
 * Get rate limit key for a request
 */
const getRateLimitKey = (
  req: AuthenticatedRequest,
  prefix: string
): string => {
  const identifier = req.user?.userId || req.ip || 'anonymous';
  return `rate_limit:${prefix}:${identifier}`;
};

/**
 * Get appropriate limit based on user tier and endpoint
 */
const getLimit = (
  tier: string | undefined,
  endpoint: string,
  options: RateLimitOptions
): number => {
  // Use custom limit if specified
  if (options.maxRequests) {
    return options.maxRequests;
  }

  // Check endpoint-specific limits
  if (ENDPOINT_LIMITS[endpoint]) {
    return ENDPOINT_LIMITS[endpoint];
  }

  // Use tier-based limits
  if (options.tierBased && tier) {
    return TIER_LIMITS[tier] || TIER_LIMITS.default;
  }

  return TIER_LIMITS.default;
};

/**
 * Main rate limiting middleware factory
 */
export const rateLimit = (options: RateLimitOptions = {}) => {
  const {
    windowMs = 60000, // 1 minute default
    keyPrefix = 'general',
    skipAuth = false,
    tierBased = true,
  } = options;

  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Skip rate limiting for admins
      if (req.user?.role === 'ADMIN') {
        next();
        return;
      }

      const key = getRateLimitKey(req, keyPrefix);
      const limit = getLimit(req.user?.tier, keyPrefix, options);
      const windowSeconds = Math.ceil(windowMs / 1000);

      // Get current count
      const current = await redis.get(key);
      const count = current ? parseInt(current, 10) : 0;

      // Get TTL for reset time
      let ttl = await redis.ttl(key);
      if (ttl === -2 || ttl === -1) {
        ttl = windowSeconds;
      }

      const resetTime = Date.now() + (ttl * 1000);
      const remaining = Math.max(0, limit - count - 1);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);

      if (count >= limit) {
        securityLogger.warn('Rate limit exceeded', {
          userId: req.user?.userId,
          ip: req.ip,
          endpoint: keyPrefix,
          count,
          limit,
        });

        res.setHeader('Retry-After', ttl);
        next(ApiError.rateLimitExceeded(
          `Rate limit exceeded. Try again in ${ttl} seconds.`
        ));
        return;
      }

      // Increment counter
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowSeconds);
      await pipeline.exec();

      next();
    } catch (error) {
      // On Redis error, allow request but log
      logger.error('Rate limit check failed', { error });
      next();
    }
  };
};

/**
 * Specialized rate limiter for AI endpoints
 */
export const aiRateLimit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    next(ApiError.unauthorized('Authentication required'));
    return;
  }

  const tier = req.user.tier;
  const limit = TIER_LIMITS[tier] || TIER_LIMITS.default;
  const key = `rate_limit:ai:${req.user.userId}`;
  const windowSeconds = 60;

  try {
    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    let ttl = await redis.ttl(key);
    if (ttl === -2 || ttl === -1) {
      ttl = windowSeconds;
    }

    const remaining = Math.max(0, limit - count - 1);
    const resetTime = Date.now() + (ttl * 1000);

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (count >= limit) {
      securityLogger.warn('AI rate limit exceeded', {
        userId: req.user.userId,
        tier,
        count,
        limit,
      });

      res.setHeader('Retry-After', ttl);
      next(ApiError.rateLimitExceeded(
        `AI rate limit exceeded. Upgrade your plan for more requests.`
      ));
      return;
    }

    // Increment
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, windowSeconds);
    await pipeline.exec();

    next();
  } catch (error) {
    logger.error('AI rate limit check failed', { error });
    next();
  }
};

/**
 * IP-based rate limiter for unauthenticated endpoints
 */
export const ipRateLimit = (maxRequests: number = 30, windowMs: number = 60000) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `rate_limit:ip:${ip}`;
    const windowSeconds = Math.ceil(windowMs / 1000);

    try {
      const current = await redis.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= maxRequests) {
        const ttl = await redis.ttl(key);
        res.setHeader('Retry-After', ttl > 0 ? ttl : windowSeconds);
        next(ApiError.rateLimitExceeded('Too many requests from this IP'));
        return;
      }

      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowSeconds);
      await pipeline.exec();

      next();
    } catch (error) {
      logger.error('IP rate limit check failed', { error });
      next();
    }
  };
};

/**
 * Sliding window rate limiter for more accurate limiting
 */
export const slidingWindowRateLimit = (
  maxRequests: number,
  windowMs: number,
  keyPrefix: string
) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const identifier = req.user?.userId || req.ip || 'anonymous';
    const key = `rate_limit:sliding:${keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Remove old entries and count remaining
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zcard(key);
      const results = await pipeline.exec();

      const count = (results?.[1]?.[1] as number) || 0;

      if (count >= maxRequests) {
        // Get oldest entry to calculate reset time
        const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
        const resetTime = oldest.length > 1 
          ? parseInt(oldest[1]) + windowMs 
          : now + windowMs;

        const retryAfter = Math.ceil((resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter);
        
        next(ApiError.rateLimitExceeded(
          `Rate limit exceeded. Try again in ${retryAfter} seconds.`
        ));
        return;
      }

      // Add current request
      await redis.zadd(key, now, `${now}:${Math.random()}`);
      await redis.expire(key, Math.ceil(windowMs / 1000) + 1);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - count - 1);

      next();
    } catch (error) {
      logger.error('Sliding window rate limit failed', { error });
      next();
    }
  };
};

/**
 * Get current rate limit status
 */
export const getRateLimitStatus = async (
  userId: string,
  endpoint: string = 'general'
): Promise<RateLimitInfo> => {
  const key = `rate_limit:${endpoint}:${userId}`;
  
  const [current, ttl] = await Promise.all([
    redis.get(key),
    redis.ttl(key),
  ]);

  const count = current ? parseInt(current, 10) : 0;
  const limit = TIER_LIMITS.default;
  const resetTime = ttl > 0 ? Date.now() + (ttl * 1000) : Date.now() + 60000;

  return {
    limit,
    remaining: Math.max(0, limit - count),
    resetTime,
  };
};

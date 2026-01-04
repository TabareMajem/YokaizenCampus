import Redis from 'ioredis';
import { config } from './env';

export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000,
  lazyConnect: true,
  password: config.redis.password || undefined,
});

redis.on('connect', () => {
  console.log('✅ Redis connection established');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

export const initializeRedis = async (): Promise<typeof redis> => {
  try {
    await redis.connect();
    await redis.ping();
    return redis;
  } catch (error) {
    console.error('❌ Redis initialization failed:', error);
    throw error;
  }
};

export const closeRedis = async (): Promise<void> => {
  await redis.quit();
  console.log('✅ Redis connection closed');
};

// Redis key prefixes for organization
export const RedisKeys = {
  // Session keys
  session: (userId: string) => `session:${userId}`,
  sessionToken: (token: string) => `session_token:${token}`,

  // Rate limiting
  rateLimit: (userId: string, endpoint: string) => `rate_limit:${userId}:${endpoint}`,
  rateLimitAI: (userId: string) => `rate_limit:ai:${userId}`,

  // Leaderboard keys
  globalLeaderboard: 'leaderboard:global',
  squadLeaderboard: 'leaderboard:squads',
  regionalLeaderboard: (region: string) => `leaderboard:regional:${region}`,
  weeklyLeaderboard: 'leaderboard:weekly',

  // Game session anti-cheat
  gameSession: (userId: string, sessionToken: string) => `game_session:${userId}:${sessionToken}`,

  // Cache keys
  userCache: (userId: string) => `cache:user:${userId}`,
  squadCache: (squadId: string) => `cache:squad:${squadId}`,
  agentCache: (agentId: string) => `cache:agent:${agentId}`,

  // Pub/Sub channels
  squadRoom: (squadId: string) => `squad_room:${squadId}`,
  globalTicker: 'global_ticker',

  // Lock keys for distributed operations
  lock: (resource: string) => `lock:${resource}`,

  // User online status
  userOnline: (userId: string) => `user_online:${userId}`,
  squadOnlineMembers: (squadId: string) => `squad_online:${squadId}`,
};

// Helper functions for common Redis operations
export const RedisHelpers = {
  // Set with expiration
  async setEx(key: string, value: string, seconds: number): Promise<void> {
    await redis.setex(key, seconds, value as string);
  },

  // Get JSON value
  async getJson<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  // Set JSON value
  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const jsonValue = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, jsonValue as string);
    } else {
      await redis.set(key, jsonValue);
    }
  },

  // Increment rate limit
  async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    const multi = redis.multi();
    multi.incr(key);
    multi.expire(key, windowSeconds);
    const results = await multi.exec();
    return results?.[0]?.[1] as number || 0;
  },

  // Add to sorted set (leaderboard)
  async updateLeaderboard(key: string, score: number, member: string): Promise<void> {
    await redis.zadd(key, score, member as string);
  },

  // Get leaderboard range
  async getLeaderboard(key: string, start: number, end: number): Promise<Array<{ member: string; score: number }>> {
    const results = await redis.zrevrange(key, start, end, 'WITHSCORES');
    const leaderboard: Array<{ member: string; score: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      leaderboard.push({
        member: results[i],
        score: parseFloat(results[i + 1]),
      });
    }
    return leaderboard;
  },

  // Get user rank
  async getUserRank(key: string, member: string): Promise<number | null> {
    const rank = await redis.zrevrank(key, member as string);
    return rank !== null ? rank + 1 : null;
  },

  // Acquire distributed lock
  async acquireLock(resource: string, ttlMs: number): Promise<boolean> {
    const key = RedisKeys.lock(resource);
    const result = await redis.set(key, '1', 'PX', ttlMs, 'NX');
    return result === 'OK';
  },

  // Release distributed lock
  async releaseLock(resource: string): Promise<void> {
    await redis.del(RedisKeys.lock(resource));
  },

  // Pub/Sub publish
  async publish(channel: string, message: object): Promise<void> {
    await redis.publish(channel, JSON.stringify(message));
  },

  // Delete pattern
  async deletePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};

// ============================================
// BACKWARDS COMPATIBLE EXPORTS FOR SERVICES
// ============================================

// Alias for services expecting redisClient
export const redisClient = redis;

// Session management
export const setSession = async (userId: string, data: object, ttl = 86400): Promise<void> => {
  await RedisHelpers.setJson(RedisKeys.session(userId), data, ttl);
};

export const getSession = async <T>(userId: string): Promise<T | null> => {
  return RedisHelpers.getJson<T>(RedisKeys.session(userId));
};

export const deleteSession = async (userId: string): Promise<void> => {
  await redis.del(RedisKeys.session(userId));
};

// Game session management
export const setGameSession = async (userId: string, sessionToken: string, data: object, ttl = 3600): Promise<void> => {
  await RedisHelpers.setJson(RedisKeys.gameSession(userId, sessionToken), data, ttl);
};

export const getGameSession = async <T>(userId: string, sessionToken: string): Promise<T | null> => {
  return RedisHelpers.getJson<T>(RedisKeys.gameSession(userId, sessionToken));
};

export const deleteGameSession = async (userId: string, sessionToken: string): Promise<void> => {
  await redis.del(RedisKeys.gameSession(userId, sessionToken));
};

// Rate limiting
export const checkAIRateLimit = async (userId: string): Promise<boolean> => {
  const count = await redis.get(RedisKeys.rateLimitAI(userId));
  return count !== null && parseInt(count) > 0;
};

export const incrementAIRateLimit = async (userId: string, windowSeconds = 60): Promise<number> => {
  return RedisHelpers.incrementRateLimit(RedisKeys.rateLimitAI(userId), windowSeconds);
};

// Leaderboard functions
export const addToLeaderboard = async (key: string, score: number, member: string): Promise<void> => {
  await RedisHelpers.updateLeaderboard(key, score, member);
};

export const getLeaderboard = async (key: string, start: number, end: number) => {
  return RedisHelpers.getLeaderboard(key, start, end);
};

export const getUserRank = async (key: string, member: string): Promise<number | null> => {
  return RedisHelpers.getUserRank(key, member);
};

// Cache functions
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  return RedisHelpers.getJson<T>(key);
};

export const cacheSet = async <T>(key: string, value: T, ttl?: number): Promise<void> => {
  await RedisHelpers.setJson(key, value, ttl);
};

export const invalidateCache = async (pattern: string): Promise<void> => {
  await RedisHelpers.deletePattern(pattern);
};

// Pub/Sub
export const publishToChannel = async (channel: string, message: object): Promise<void> => {
  await RedisHelpers.publish(channel, message);
};

export default redis;

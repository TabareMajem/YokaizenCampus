// Yokaizen Campus - Redis Client
// Caching and real-time state management

import Redis from 'ioredis';
import { config } from '../config/index.js';

export let redis: Redis | null = null;

export const REDIS_KEYS = {
  CLASSROOM_STATE: 'classroom:state:',
  STUDENT_STATUS: 'student:status:',
  RAISED_HANDS: 'classroom:hands:'
};

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('❌ Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redis.on('error', (error) => {
      console.error('❌ Redis error:', error.message);
    });
  }

  return redis;
}

// Classroom state management
export const classroomCache = {
  // Store student status in classroom
  async setStudentStatus(
    classroomId: string,
    studentId: string,
    status: {
      status: string;
      sentiment: number;
      nodeCount: number;
      raisedHand: boolean;
    }
  ): Promise<void> {
    const client = getRedisClient();
    const key = `classroom:${classroomId}:students`;
    await client.hset(key, studentId, JSON.stringify({
      ...status,
      lastUpdate: Date.now(),
    }));
    await client.expire(key, 3600); // 1 hour TTL
  },

  // Get all students in classroom
  async getStudentStatuses(classroomId: string): Promise<Record<string, unknown>> {
    const client = getRedisClient();
    const key = `classroom:${classroomId}:students`;
    const data = await client.hgetall(key);

    const parsed: Record<string, unknown> = {};
    for (const [studentId, value] of Object.entries(data)) {
      try {
        parsed[studentId] = JSON.parse(value);
      } catch {
        parsed[studentId] = value;
      }
    }
    return parsed;
  },

  // Remove student from classroom
  async removeStudent(classroomId: string, studentId: string): Promise<void> {
    const client = getRedisClient();
    const key = `classroom:${classroomId}:students`;
    await client.hdel(key, studentId);
  },

  // Clear classroom state
  async clearClassroom(classroomId: string): Promise<void> {
    const client = getRedisClient();
    const key = `classroom:${classroomId}:students`;
    await client.del(key);
  },

  // Set raised hand
  async setRaisedHand(
    classroomId: string,
    studentId: string,
    raised: boolean,
    question?: string
  ): Promise<void> {
    const client = getRedisClient();
    const key = `classroom:${classroomId}:hands`;
    if (raised) {
      await client.hset(key, studentId, JSON.stringify({
        raised: true,
        question,
        timestamp: Date.now(),
      }));
    } else {
      await client.hdel(key, studentId);
    }
    await client.expire(key, 3600);
  },

  // Get raised hands
  async getRaisedHands(classroomId: string): Promise<Record<string, unknown>> {
    const client = getRedisClient();
    const key = `classroom:${classroomId}:hands`;
    const data = await client.hgetall(key);

    const parsed: Record<string, unknown> = {};
    for (const [studentId, value] of Object.entries(data)) {
      try {
        parsed[studentId] = JSON.parse(value);
      } catch {
        parsed[studentId] = value;
      }
    }
    return parsed;
  },
};

// Session management
export const sessionCache = {
  // Store user session data
  async setSession(userId: string, data: Record<string, unknown>): Promise<void> {
    const client = getRedisClient();
    const key = `session:${userId}`;
    await client.set(key, JSON.stringify(data), 'EX', 86400); // 24 hours
  },

  // Get user session data
  async getSession(userId: string): Promise<Record<string, unknown> | null> {
    const client = getRedisClient();
    const key = `session:${userId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  },

  // Delete user session
  async deleteSession(userId: string): Promise<void> {
    const client = getRedisClient();
    const key = `session:${userId}`;
    await client.del(key);
  },
};

// Rate limiting
export const rateLimiter = {
  async checkLimit(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const client = getRedisClient();
    const key = `ratelimit:${identifier}`;

    const current = await client.incr(key);

    if (current === 1) {
      await client.expire(key, windowSeconds);
    }

    const ttl = await client.ttl(key);

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt: Date.now() + (ttl * 1000),
    };
  },
};

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('📤 Redis disconnected');
  }
}

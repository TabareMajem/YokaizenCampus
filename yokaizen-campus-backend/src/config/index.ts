// Yokaizen Campus - Configuration
// Environment variables and app settings

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  // AI Providers
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),

  // DeepSeek (via OpenRouter)
  DEEPSEEK_MODEL: z.string().default('deepseek/deepseek-chat'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3001,http://localhost:7787'),

  // Feature Flags
  ENABLE_MOCK_AI: z.string().transform(v => v === 'true').default('true'),
  ENABLE_CONTENT_FILTER: z.string().transform(v => v === 'true').default('true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  // In development, continue with defaults for easier setup
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/yokaizen_campus',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'yokaizen-dev-secret-change-in-production-32chars!',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },

  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    google: {
      apiKey: process.env.GOOGLE_AI_API_KEY,
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
    },
    deepseek: {
      model: process.env.DEEPSEEK_MODEL || 'deepseek/deepseek-chat',
    },
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    proPriceId: process.env.STRIPE_PRO_PRICE_ID,
  },

  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001', 'http://localhost:7787'],

  features: {
    mockAI: process.env.ENABLE_MOCK_AI === 'true' || !process.env.OPENAI_API_KEY,
    contentFilter: process.env.ENABLE_CONTENT_FILTER !== 'false',
  },

  // Credit costs for AI operations
  credits: {
    scoutCost: 5,
    architectCost: 15,
    criticCost: 10,
    ethicistCost: 12,
    synthesizerCost: 20,
    oracleCost: 25,
    commanderCost: 30,
    debuggerCost: 10,
    creativeCost: 15,
    analystCost: 12,
    graphGeneration: 50,
    auditCheck: 20,
  },
} as const;

export type Config = typeof config;

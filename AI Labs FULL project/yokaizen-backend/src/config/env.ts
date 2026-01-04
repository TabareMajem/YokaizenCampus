import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  API_VERSION: z.string().default('v1'),

  // Database
  DATABASE_URL: z.string(),
  DATABASE_HOST: z.string().optional(),
  DATABASE_PORT: z.string().default('5432').transform(Number),
  DATABASE_USER: z.string().optional(),
  DATABASE_PASSWORD: z.string().optional(),
  DATABASE_NAME: z.string().optional(),
  DATABASE_SSL: z.string().default('false').transform((v) => v === 'true'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string(),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Firebase
  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_CREDENTIALS_PATH: z.string().default('./firebase-admin.json'),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),

  // Google AI
  GOOGLE_API_KEY: z.string(),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-pro'),
  GEMINI_FLASH_MODEL: z.string().default('gemini-1.5-flash'),
  IMAGEN_MODEL: z.string().default('imagen-3.0-generate-001'),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),

  // DeepSeek
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().default('https://api.deepseek.com/v1'),

  // Stripe
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  STRIPE_OPERATIVE_PRICE_ID: z.string(),
  STRIPE_PRO_PRICE_ID: z.string(),

  // AWS S3
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().optional(),

  // GCS
  GCS_BUCKET: z.string().optional(),
  GCS_PROJECT_ID: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_FREE: z.string().default('5').transform(Number),
  RATE_LIMIT_MAX_OPERATIVE: z.string().default('20').transform(Number),
  RATE_LIMIT_MAX_PRO: z.string().default('50').transform(Number),

  // Socket.io
  SOCKET_CORS_ORIGIN: z.string().default('http://localhost:3001'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_DIR: z.string().default('./logs'),

  // Security
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  ENCRYPTION_KEY: z.string().optional(),

  // BullMQ
  BULLMQ_REDIS_URL: z.string().optional(),

  // Pollinations
  POLLINATIONS_API_URL: z.string().default('https://image.pollinations.ai/prompt'),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parseResult.error.format());
  process.exit(1);
}

export const env = parseResult.data;

export const config = {
  server: {
    env: env.NODE_ENV,
    port: env.PORT,
    apiVersion: env.API_VERSION,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
  },
  // App URLs for payment redirects
  app: {
    frontendUrl: env.CORS_ORIGIN.split(',')[0],
    backendUrl: `http://localhost:${env.PORT}`,
    corsOrigins: env.CORS_ORIGIN,
  },
  database: {
    url: env.DATABASE_URL,
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    name: env.DATABASE_NAME,
    ssl: env.DATABASE_SSL,
  },
  redis: {
    url: env.REDIS_URL,
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  firebase: {
    projectId: env.FIREBASE_PROJECT_ID,
    credentialsPath: env.FIREBASE_CREDENTIALS_PATH,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
  },
  google: {
    apiKey: env.GOOGLE_API_KEY,
    projectId: env.GOOGLE_CLOUD_PROJECT,
    credentials: env.GOOGLE_APPLICATION_CREDENTIALS,
    geminiModel: env.GEMINI_MODEL,
    geminiFlashModel: env.GEMINI_FLASH_MODEL,
    imagenModel: env.IMAGEN_MODEL,
    // Aliases for backwards compatibility
    modelPro: env.GEMINI_MODEL,
    modelFlash: env.GEMINI_FLASH_MODEL,
  },
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
  },
  deepseek: {
    apiKey: env.DEEPSEEK_API_KEY,
    baseUrl: env.DEEPSEEK_BASE_URL,
  },
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    operativePriceId: env.STRIPE_OPERATIVE_PRICE_ID,
    proPriceId: env.STRIPE_PRO_PRICE_ID,
  },
  aws: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
    s3Bucket: env.AWS_S3_BUCKET,
  },
  gcs: {
    bucket: env.GCS_BUCKET,
    projectId: env.GCS_PROJECT_ID,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxFree: env.RATE_LIMIT_MAX_FREE,
    maxOperative: env.RATE_LIMIT_MAX_OPERATIVE,
    maxPro: env.RATE_LIMIT_MAX_PRO,
  },
  socket: {
    corsOrigin: env.SOCKET_CORS_ORIGIN.split(','),
  },
  logging: {
    level: env.LOG_LEVEL,
    dir: env.LOG_DIR,
  },
  cors: {
    origin: env.CORS_ORIGIN.split(','),
  },
  bullmq: {
    redisUrl: env.BULLMQ_REDIS_URL || env.REDIS_URL,
  },
  pollinations: {
    apiUrl: env.POLLINATIONS_API_URL,
  },
};

export default config;

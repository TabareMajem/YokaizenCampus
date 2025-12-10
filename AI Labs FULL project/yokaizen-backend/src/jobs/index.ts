import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '@config/env';
import { logger } from '@config/logger';
import { ragService } from '@services/RAGService';
import { leaderboardService } from '@services/LeaderboardService';
import { AppDataSource } from '@config/database';
import { User } from '@entities/User';

// Redis connection for BullMQ
const connection = new IORedis(config.redis.url, {
  maxRetriesPerRequest: null,
});

// =========== Queue Definitions ===========

export const ragProcessingQueue = new Queue('rag-processing', { connection });
export const imageGenerationQueue = new Queue('image-generation', { connection });
export const notificationQueue = new Queue('notifications', { connection });
export const analyticsQueue = new Queue('analytics', { connection });
export const maintenanceQueue = new Queue('maintenance', { connection });

// =========== Worker Definitions ===========

// RAG Processing Worker
const ragWorker = new Worker(
  'rag-processing',
  async (job: Job) => {
    const { agentId, fileBuffer, fileName, mimeType } = job.data;
    
    logger.info('Processing RAG document', { jobId: job.id, agentId, fileName });
    
    const buffer = Buffer.from(fileBuffer, 'base64');
    const result = await ragService.processDocument(agentId, buffer, fileName, mimeType);
    
    logger.info('RAG processing complete', { jobId: job.id, result });
    return result;
  },
  {
    connection,
    concurrency: 2, // Process 2 documents at a time
  }
);

// Image Generation Worker (for async image generation)
const imageWorker = new Worker(
  'image-generation',
  async (job: Job) => {
    const { userId, prompt, callbackUrl } = job.data;
    
    logger.info('Processing image generation', { jobId: job.id, userId });
    
    // This would call the AI service
    // const result = await aiService.generateImage(userId, prompt);
    
    // If callback URL provided, notify completion
    if (callbackUrl) {
      // await fetch(callbackUrl, { method: 'POST', body: JSON.stringify(result) });
    }
    
    return { status: 'completed' };
  },
  {
    connection,
    concurrency: 5,
  }
);

// Notification Worker
const notificationWorker = new Worker(
  'notifications',
  async (job: Job) => {
    const { type, userId, data } = job.data;
    
    logger.info('Processing notification', { jobId: job.id, type, userId });
    
    switch (type) {
      case 'push':
        // Send push notification via Firebase
        // await sendPushNotification(userId, data);
        break;
      
      case 'email':
        // Send email notification
        // await sendEmail(data.email, data.subject, data.body);
        break;
      
      case 'in_app':
        // Store in-app notification
        // await storeInAppNotification(userId, data);
        break;
      
      default:
        logger.warn('Unknown notification type', { type });
    }
    
    return { sent: true };
  },
  {
    connection,
    concurrency: 10,
  }
);

// Analytics Worker
const analyticsWorker = new Worker(
  'analytics',
  async (job: Job) => {
    const { event, userId, metadata } = job.data;
    
    // Process analytics event
    // This could send to BigQuery, Mixpanel, etc.
    logger.debug('Analytics event', { event, userId, metadata });
    
    return { processed: true };
  },
  {
    connection,
    concurrency: 20,
  }
);

// Maintenance Worker (for scheduled tasks)
const maintenanceWorker = new Worker(
  'maintenance',
  async (job: Job) => {
    const { task } = job.data;
    
    logger.info('Running maintenance task', { jobId: job.id, task });
    
    switch (task) {
      case 'reset_daily_leaderboard':
        await leaderboardService.resetDailyLeaderboard();
        break;
      
      case 'reset_weekly_leaderboard':
        await leaderboardService.resetWeeklyLeaderboard();
        break;
      
      case 'rebuild_leaderboards':
        await leaderboardService.rebuildLeaderboards();
        break;
      
      case 'cleanup_expired_sessions':
        await cleanupExpiredSessions();
        break;
      
      case 'calculate_streak_resets':
        await calculateStreakResets();
        break;
      
      case 'process_subscription_expirations':
        await processSubscriptionExpirations();
        break;
      
      default:
        logger.warn('Unknown maintenance task', { task });
    }
    
    return { completed: true };
  },
  {
    connection,
    concurrency: 1, // Run maintenance tasks sequentially
  }
);

// =========== Helper Functions ===========

async function cleanupExpiredSessions(): Promise<void> {
  // Clean up old Redis sessions
  // Implementation depends on session structure
  logger.info('Cleaning up expired sessions');
}

async function calculateStreakResets(): Promise<void> {
  const userRepository = AppDataSource.getRepository(User);
  
  // Find users who haven't logged in today and reset their streaks
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const result = await userRepository
    .createQueryBuilder()
    .update(User)
    .set({ streak: 0 })
    .where('lastLogin < :yesterday', { yesterday })
    .andWhere('streak > 0')
    .execute();
  
  logger.info('Streak resets processed', { affected: result.affected });
}

async function processSubscriptionExpirations(): Promise<void> {
  const userRepository = AppDataSource.getRepository(User);
  
  // Find users with expired subscriptions
  const now = new Date();
  
  const expiredUsers = await userRepository.find({
    where: {
      subscriptionEndsAt: { $lt: now } as any,
      tier: { $ne: 'FREE' } as any,
    },
  });
  
  for (const user of expiredUsers) {
    user.tier = 'FREE' as any;
    user.maxEnergy = 100;
    await userRepository.save(user);
    
    // Queue notification
    await notificationQueue.add('subscription-expired', {
      type: 'in_app',
      userId: user.id,
      data: {
        title: 'Subscription Expired',
        message: 'Your subscription has expired. Upgrade to continue enjoying premium features!',
      },
    });
  }
  
  logger.info('Subscription expirations processed', { count: expiredUsers.length });
}

// =========== Job Schedulers ===========

export async function scheduleRecurringJobs(): Promise<void> {
  // Daily leaderboard reset at midnight UTC
  await maintenanceQueue.add(
    'reset_daily_leaderboard',
    { task: 'reset_daily_leaderboard' },
    {
      repeat: {
        pattern: '0 0 * * *', // Every day at midnight
      },
    }
  );

  // Weekly leaderboard reset on Monday at midnight UTC
  await maintenanceQueue.add(
    'reset_weekly_leaderboard',
    { task: 'reset_weekly_leaderboard' },
    {
      repeat: {
        pattern: '0 0 * * 1', // Every Monday at midnight
      },
    }
  );

  // Streak reset check every hour
  await maintenanceQueue.add(
    'calculate_streak_resets',
    { task: 'calculate_streak_resets' },
    {
      repeat: {
        pattern: '0 * * * *', // Every hour
      },
    }
  );

  // Subscription expiration check every hour
  await maintenanceQueue.add(
    'process_subscription_expirations',
    { task: 'process_subscription_expirations' },
    {
      repeat: {
        pattern: '30 * * * *', // Every hour at :30
      },
    }
  );

  // Session cleanup every 6 hours
  await maintenanceQueue.add(
    'cleanup_expired_sessions',
    { task: 'cleanup_expired_sessions' },
    {
      repeat: {
        pattern: '0 */6 * * *', // Every 6 hours
      },
    }
  );

  logger.info('Recurring jobs scheduled');
}

// =========== Worker Event Handlers ===========

const workers = [ragWorker, imageWorker, notificationWorker, analyticsWorker, maintenanceWorker];

workers.forEach((worker) => {
  worker.on('completed', (job) => {
    logger.debug(`Job ${job.id} completed on ${worker.name}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed on ${worker.name}`, { error: err.message });
  });

  worker.on('error', (err) => {
    logger.error(`Worker error on ${worker.name}`, { error: err.message });
  });
});

// =========== Graceful Shutdown ===========

export async function closeWorkers(): Promise<void> {
  logger.info('Closing job workers...');
  
  await Promise.all([
    ragWorker.close(),
    imageWorker.close(),
    notificationWorker.close(),
    analyticsWorker.close(),
    maintenanceWorker.close(),
  ]);
  
  await connection.quit();
  
  logger.info('Job workers closed');
}

// =========== Queue Helper Functions ===========

export async function addRagJob(
  agentId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const job = await ragProcessingQueue.add('process-document', {
    agentId,
    fileBuffer: fileBuffer.toString('base64'),
    fileName,
    mimeType,
  });
  return job.id!;
}

export async function addNotificationJob(
  type: 'push' | 'email' | 'in_app',
  userId: string,
  data: any
): Promise<string> {
  const job = await notificationQueue.add('send-notification', {
    type,
    userId,
    data,
  });
  return job.id!;
}

export async function addAnalyticsEvent(
  event: string,
  userId: string,
  metadata: any
): Promise<void> {
  await analyticsQueue.add('track-event', {
    event,
    userId,
    metadata,
    timestamp: new Date().toISOString(),
  });
}

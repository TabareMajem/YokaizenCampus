import { z } from 'zod';
import { UserRole, UserTier } from '../entities/User';
import { GameType, GameDifficulty } from '../entities/GameHistory';
import { AgentModel, AgentCategory } from '../entities/Agent';
import { GeneratedGameType } from '../entities/GeneratedGame';

// Common schemas
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const emailSchema = z.string().email('Invalid email format');
export const phoneSchema = z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number (E.164 format required)');
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

// Auth schemas
export const authVerifySchema = z.object({
  idToken: z.string().min(1, 'ID token is required'),
});

export const authRefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// User schemas
export const updateUserSchema = z.object({
  username: usernameSchema.optional(),
  avatarUrl: z.string().url().optional(),
  language: z.string().length(2).optional(),
  region: z.string().max(50).optional(),
  preferences: z
    .object({
      notifications: z.boolean().optional(),
      soundEffects: z.boolean().optional(),
      darkMode: z.boolean().optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

export const unlockSkillSchema = z.object({
  nodeId: z.string().min(1, 'Skill node ID is required'),
});

// Game schemas
export const startGameSchema = z.object({
  gameType: z.nativeEnum(GameType),
  difficulty: z.nativeEnum(GameDifficulty).default(GameDifficulty.MEDIUM),
  customGameId: uuidSchema.optional(),
  squadId: uuidSchema.optional(),
});

export const submitGameSchema = z.object({
  gameType: z.nativeEnum(GameType),
  score: z.number().int().min(0),
  sessionToken: z.string().min(1, 'Session token is required'),
  difficulty: z.nativeEnum(GameDifficulty),
  metadata: z
    .object({
      moves: z
        .array(
          z.object({
            action: z.string(),
            timestamp: z.number(),
            data: z.unknown().optional(),
          })
        )
        .optional(),
      answers: z
        .array(
          z.object({
            question: z.string(),
            answer: z.string(),
            correct: z.boolean(),
          })
        )
        .optional(),
      powerUpsUsed: z.array(z.string()).optional(),
    })
    .optional(),
  durationSeconds: z.number().int().min(0).optional(),
  combo: z.number().int().min(0).optional(),
  accuracy: z.number().min(0).max(100).optional(),
});

// Squad schemas
export const createSquadSchema = z.object({
  name: z
    .string()
    .min(3, 'Squad name must be at least 3 characters')
    .max(50, 'Squad name must be at most 50 characters'),
  description: z.string().max(200).optional(),
  icon: z.string().optional(),
  isPublic: z.boolean().default(false),
  minLevelRequirement: z.number().int().min(1).max(100).default(1),
});

export const updateSquadSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  description: z.string().max(200).optional(),
  icon: z.string().optional(),
  bannerUrl: z.string().url().optional(),
  isPublic: z.boolean().optional(),
  isRecruiting: z.boolean().optional(),
  minLevelRequirement: z.number().int().min(1).max(100).optional(),
  settings: z
    .object({
      autoAcceptMembers: z.boolean().optional(),
      requireApproval: z.boolean().optional(),
      chatEnabled: z.boolean().optional(),
      missionNotifications: z.boolean().optional(),
    })
    .optional(),
});

export const contributeToSquadSchema = z.object({
  amount: z.number().int().positive('Amount must be positive'),
});

// AI schemas
export const aiChatSchema = z.object({
  agentId: uuidSchema.optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
        timestamp: z.date().optional(),
      })
    )
    .default([]),
  message: z.string().min(1, 'Message is required').max(10000),
  stream: z.boolean().default(false),
});

export const generateImageSchema = z.object({
  prompt: z.string().min(1).max(1000),
  style: z.string().optional(),
  size: z.enum(['256x256', '512x512', '1024x1024']).default('512x512'),
  negativePrompt: z.string().max(500).optional(),
});

export const generateGameSchema = z.object({
  topic: z.string().min(1).max(200),
  gameType: z.nativeEnum(GeneratedGameType).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  targetAudience: z.string().optional(),
  therapeuticGoals: z.array(z.string()).optional(),
});

export const voiceSynthSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().optional(),
  language: z.string().default('en-US'),
  pitch: z.number().min(-20).max(20).default(0),
  speed: z.number().min(0.25).max(4).default(1),
});

export const visionAnalyzeSchema = z.object({
  imageBase64: z.string().min(1),
  prompt: z.string().optional(),
});

// Agent schemas
export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  persona: z.string().min(1).max(5000),
  systemInstruction: z.string().min(1).max(10000),
  modelPref: z.nativeEnum(AgentModel).default(AgentModel.GEMINI_FLASH),
  category: z.nativeEnum(AgentCategory).default(AgentCategory.CUSTOM),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  config: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().min(1).max(32000).optional(),
      topP: z.number().min(0).max(1).optional(),
      topK: z.number().int().min(1).optional(),
    })
    .optional(),
  conversationStarters: z.array(z.string().max(200)).max(5).optional(),
});

export const updateAgentSchema = createAgentSchema.partial();

// Payment schemas
export const createCheckoutSchema = z.object({
  planId: z.enum(['OPERATIVE', 'PRO', 'PRO_CREATOR']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const createPortalSchema = z.object({
  returnUrl: z.string().url().optional(),
});

// Leaderboard schemas
export const leaderboardQuerySchema = z.object({
  type: z.enum(['global', 'squads', 'regional', 'weekly']).default('global'),
  region: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

// Search schemas
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  ...paginationSchema.shape,
});

// Export all schemas
export const schemas = {
  uuid: uuidSchema,
  email: emailSchema,
  phone: phoneSchema,
  username: usernameSchema,
  pagination: paginationSchema,
  auth: {
    verify: authVerifySchema,
    refresh: authRefreshSchema,
  },
  user: {
    update: updateUserSchema,
    unlockSkill: unlockSkillSchema,
  },
  game: {
    start: startGameSchema,
    submit: submitGameSchema,
  },
  squad: {
    create: createSquadSchema,
    update: updateSquadSchema,
    contribute: contributeToSquadSchema,
  },
  ai: {
    chat: aiChatSchema,
    generateImage: generateImageSchema,
    generateGame: generateGameSchema,
    voiceSynth: voiceSynthSchema,
    visionAnalyze: visionAnalyzeSchema,
  },
  agent: {
    create: createAgentSchema,
    update: updateAgentSchema,
  },
  payment: {
    createCheckout: createCheckoutSchema,
    createPortal: createPortalSchema,
  },
  leaderboard: leaderboardQuerySchema,
  search: searchQuerySchema,
};

export default schemas;

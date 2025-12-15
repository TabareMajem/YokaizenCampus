import { User, UserTier, UserRole } from '../entities/User';

export { UserRole, UserTier };

// Extended Express Request with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  rawBody?: Buffer;
}

// Authenticated user payload
export interface AuthUser {
  id: string;
  userId?: string; // alias for id
  firebaseUid: string;
  email?: string;
  phone?: string;
  username?: string;
  role: UserRole;
  tier: UserTier;
  squadId?: string;
}

// JWT Token payload
export interface JWTPayload {
  sub: string; // user id
  userId?: string; // alias for sub
  firebaseUid: string;
  email?: string;
  role: UserRole;
  tier: UserTier;
  squadId?: string; // for socket.io
  iat?: number;
  exp?: number;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

// Pagination params
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// User stats response
export interface UserStatsResponse {
  id: string;
  username: string;
  avatarUrl: string;
  tier: UserTier;
  role: UserRole;
  credits: number;
  xp: number;
  level: number;
  streak: number;
  skillPoints: number;
  energy: {
    current: number;
    max: number;
    regenRate: number;
  };
  squad: {
    id: string;
    name: string;
    tier: string;
  } | null;
  stats: {
    totalGamesPlayed: number;
    totalWins: number;
    highestScore: number;
    favoriteGame: string;
  };
  rank: {
    global: number;
    regional: number;
  } | null;
  subscriptionStatus: {
    isActive: boolean;
    expiresAt: Date | null;
  };
}

// Game session for anti-cheat
export interface GameSession {
  userId: string;
  gameType: string;
  difficulty: string;
  sessionToken: string;
  startedAt: Date;
  metadata?: Record<string, unknown>;
}

// Leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  score: number;
  tier?: UserTier;
  squadName?: string;
}

// AI Chat message
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  metadata?: {
    tokens?: number;
    model?: string;
    latency?: number;
  };
}

// AI Chat request
export interface AIChatRequest {
  agentId?: string;
  history: ChatMessage[];
  message: string;
  stream?: boolean;
}

// AI Chat response
export interface AIChatResponse {
  content: string;
  model: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  latency: number;
  finishReason: string;
}

// Image generation request
export interface ImageGenerationRequest {
  prompt: string;
  style?: string;
  size?: '256x256' | '512x512' | '1024x1024';
  negativePrompt?: string;
}

// Image generation response
export interface ImageGenerationResponse {
  url: string;
  prompt: string;
  model: string;
  generationTime: number;
}

// Game generation request
export interface GameGenerationRequest {
  topic: string;
  gameType?: string;
  difficulty?: string;
  targetAudience?: string;
  therapeuticGoals?: string[];
}

// Socket events
export interface SocketEvents {
  // Client -> Server
  'join_room': { squadId: string };
  'leave_room': { squadId: string };
  'mission_start': { squadId: string; missionId: string };
  'game_update': { gameType: string; score: number; combo: number };

  // Server -> Client
  'room_joined': { squadId: string; members: string[] };
  'member_joined': { userId: string; username: string };
  'member_left': { userId: string };
  'member_status_change': { userId: string; status: 'online' | 'offline' | 'playing' };
  'mission_update': { missionId: string; progress: number; status: string };
  'ticker_update': { message: string; type: 'achievement' | 'news' | 'event' };
  'leaderboard_update': { entries: LeaderboardEntry[] };
}

// Webhook event types
export interface WebhookEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
  signature?: string;
}

// Error codes
export const ErrorCodes = {
  // Auth errors (1000s)
  INVALID_TOKEN: 'AUTH_1001',
  TOKEN_EXPIRED: 'AUTH_1002',
  INSUFFICIENT_PERMISSIONS: 'AUTH_1003',
  USER_BANNED: 'AUTH_1004',

  // Validation errors (2000s)
  INVALID_INPUT: 'VAL_2001',
  MISSING_REQUIRED_FIELD: 'VAL_2002',
  INVALID_FORMAT: 'VAL_2003',

  // Resource errors (3000s)
  NOT_FOUND: 'RES_3001',
  ALREADY_EXISTS: 'RES_3002',
  CONFLICT: 'RES_3003',

  // Rate limit errors (4000s)
  RATE_LIMITED: 'RATE_4001',
  QUOTA_EXCEEDED: 'RATE_4002',

  // Payment errors (5000s)
  PAYMENT_FAILED: 'PAY_5001',
  INSUFFICIENT_CREDITS: 'PAY_5002',
  SUBSCRIPTION_REQUIRED: 'PAY_5003',

  // Game errors (6000s)
  GAME_SESSION_INVALID: 'GAME_6001',
  GAME_SESSION_EXPIRED: 'GAME_6002',
  INVALID_SCORE: 'GAME_6003',
  INSUFFICIENT_ENERGY: 'GAME_6004',

  // AI errors (7000s)
  AI_SERVICE_ERROR: 'AI_7001',
  AI_RATE_LIMITED: 'AI_7002',
  AI_CONTENT_FILTERED: 'AI_7003',

  // Squad errors (8000s)
  SQUAD_FULL: 'SQUAD_8001',
  NOT_SQUAD_MEMBER: 'SQUAD_8002',
  SQUAD_PERMISSION_DENIED: 'SQUAD_8003',

  // Internal errors (9000s)
  INTERNAL_ERROR: 'INT_9001',
  DATABASE_ERROR: 'INT_9002',
  EXTERNAL_SERVICE_ERROR: 'INT_9003',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

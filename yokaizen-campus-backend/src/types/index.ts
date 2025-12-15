// Yokaizen Campus - Type Definitions
// The Central Cortex Type System

import { UserRole, SubscriptionTier, PhilosophyMode, GraphStatus, GrantStatus, ChaosEventType } from '@prisma/client';

// ==================== AUTH TYPES ====================

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  tier: SubscriptionTier;
  subscriptionTier?: SubscriptionTier;
  philosophyMode?: PhilosophyMode;
  schoolId?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: SafeUser;
  tokens: TokenPair;
  careerPath: CareerPathData | null;
}

// ==================== USER TYPES ====================

export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
  level: number;
  xp: number;
  credits: number;
  subscriptionTier: SubscriptionTier;
  philosophyMode: PhilosophyMode;
  schoolId: string | null;
  createdAt: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
  schoolId?: string;
}

export interface UpdateUserInput {
  fullName?: string;
  avatarUrl?: string;
  philosophyMode?: PhilosophyMode;
}

// ==================== CLASSROOM TYPES ====================

export interface CreateClassroomInput {
  name: string;
  schoolId?: string;
  currentPhilosophy?: PhilosophyMode;
}

export interface ClassroomData {
  id: string;
  name: string;
  accessCode: string;
  isActive: boolean;
  currentPhilosophy: PhilosophyMode | null;
  teacherId: string;
  schoolId: string | null;
  studentCount: number;
  createdAt: Date;
}

export interface ClassroomLiveData {
  classroom: ClassroomData;
  students: StudentLiveStatus[];
  aggregates: ClassroomAggregates;
  athenaInsight: AthenaInsight | null;
}

export interface StudentLiveStatus {
  id: string;
  displayName: string; // Can be anonymized
  status: GraphStatus;
  sentimentScore: number;
  nodeCount: number;
  lastUpdate: Date;
  raisedHand: boolean;
}

export interface ClassroomAggregates {
  totalStudents: number;
  flowCount: number;
  stuckCount: number;
  idleCount: number;
  averageSentiment: number;
  velocity: number; // 0-100, calculated by Athena
}

// ==================== GRAPH TYPES ====================

export interface AgentNode {
  id: string;
  type: AgentNodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    input?: string;
    output?: string;
    confidence?: number;
    status: 'idle' | 'running' | 'complete' | 'error' | 'corrupted';
    cost: number;
  };
}

export type AgentNodeType =
  | 'SCOUT'       // Fast, low cost, gathers raw text
  | 'ARCHITECT'   // High cost, structures data
  | 'CRITIC'      // Evaluates outputs
  | 'ETHICIST'    // Audits for bias
  | 'SYNTHESIZER' // Combines outputs
  | 'ORACLE'      // Hidden agent (AR unlock)
  | 'COMMANDER'   // Orchestrates other agents
  | 'DEBUGGER'    // Fixes errors
  | 'CREATIVE'    // Generates creative content
  | 'ANALYST';    // Data analysis

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  tier: SubscriptionTier;
  subscriptionTier?: SubscriptionTier; // Alias for tier
  philosophyMode?: PhilosophyMode;
  schoolId?: string;
  iat?: number;
  exp?: number;
}

export type AgentType = AgentNodeType;

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'data' | 'control' | 'audit';
}

export interface GraphSyncInput {
  sessionId?: string;
  classroomId?: string;
  nodes: AgentNode[];
  connections: GraphEdge[];
  status: GraphStatus;
  sentimentScore: number;
  title?: string;
  command?: string;
}

export interface GraphAuditInput {
  nodeId: string;
  nodeType: AgentNodeType;
  output: string;
  context: string;
}

export interface GraphAuditResult {
  isHallucination: boolean;
  confidence: number;
  explanation: string;
  suggestedFix?: string;
}

// ==================== AI TYPES ====================

export interface AICommandInput {
  command: string;
  philosophy: PhilosophyMode;
  context?: string;
  constraints?: string[];
}

export interface AICommandResponse {
  nodes: AgentNode[];
  connections: GraphEdge[];
  explanation: string;
  estimatedCost: number;
  requiredLevel: number;
}

export interface AISimulateInput {
  nodeType: AgentNodeType;
  context: string;
  input: string;
  philosophy?: PhilosophyMode;
}

export interface AISimulateResponse {
  output: string;
  confidence: number;
  cost: number;
  processingTime: number;
  warnings?: string[];
}

export interface AIEngineConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'openrouter' | 'mock';
  model: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
}

// ==================== CAREER PATH TYPES ====================

export interface CareerPathData {
  id: string;
  userId: string;
  unlockedNodes: string[];
  stats: CareerStats;
  achievements: string[];
  chaosEventsSurvived: number;
}

export interface CareerStats {
  orchestration: number;
  resilience: number;
  creativity: number;
  logic: number;
  ethics: number;
}

export interface LevelUpResult {
  newLevel: number;
  xpToNextLevel: number;
  unlockedNode?: string;
  achievement?: string;
}

// ==================== GAMIFICATION TYPES ====================

export interface XPAction {
  type: 'GRAPH_EXECUTE' | 'AUDIT_HALLUCINATION' | 'SURVIVE_CHAOS' | 'COMPLETE_QUEST' | 'HELP_PEER';
  baseXP: number;
  multiplier?: number;
}

export const XP_VALUES: Record<XPAction['type'], number> = {
  GRAPH_EXECUTE: 50,
  AUDIT_HALLUCINATION: 100,
  SURVIVE_CHAOS: 200,
  COMPLETE_QUEST: 150,
  HELP_PEER: 75,
};

export const LEVEL_THRESHOLDS: number[] = [
  0,      // Level 1
  100,    // Level 2
  300,    // Level 3
  600,    // Level 4
  1000,   // Level 5
  1500,   // Level 6
  2100,   // Level 7
  2800,   // Level 8
  3600,   // Level 9
  4500,   // Level 10
  5500,   // Level 11
  6600,   // Level 12
  7800,   // Level 13
  9100,   // Level 14
  10500,  // Level 15
];

// ==================== CHAOS EVENT TYPES ====================

export interface ChaosEventData {
  type: ChaosEventType;
  duration: number;
  effects: ChaosEffect[];
}

export interface ChaosEffect {
  target: 'all' | AgentNodeType;
  effect: 'disable' | 'reduce_confidence' | 'increase_latency' | 'corrupt';
  value: number;
}

export const CHAOS_EVENTS: Record<ChaosEventType, ChaosEventData> = {
  SOLAR_FLARE: {
    type: 'SOLAR_FLARE',
    duration: 30,
    effects: [{ target: 'SCOUT', effect: 'disable', value: 1 }],
  },
  LOGIC_ROT: {
    type: 'LOGIC_ROT',
    duration: 45,
    effects: [{ target: 'ARCHITECT', effect: 'reduce_confidence', value: 80 }],
  },
  DDOS: {
    type: 'DDOS',
    duration: 60,
    effects: [{ target: 'all', effect: 'increase_latency', value: 2000 }],
  },
  BLACKOUT: {
    type: 'BLACKOUT',
    duration: 15,
    effects: [{ target: 'all', effect: 'disable', value: 1 }],
  },
  PARADOX: {
    type: 'PARADOX',
    duration: 30,
    effects: [{ target: 'CRITIC', effect: 'corrupt', value: 1 }],
  },
};

// ==================== AR TYPES ====================

export interface ARScanInput {
  markerContent: string;
}

export interface ARScanResult {
  unlocked: boolean;
  agent?: string;
  lore?: string;
  rarity?: string;
  alreadyUnlocked?: boolean;
  xpGained?: number;
}

// ==================== ATHENA (TEACHER INSIGHTS) TYPES ====================

export interface AthenaInsight {
  velocity: number; // 0-100
  summary: string;
  suggestedAction: string;
  alerts: AthenaAlert[];
  trends: AthenaTrend[];
}

export interface AthenaAlert {
  type: 'stuck_cluster' | 'sentiment_drop' | 'complexity_issue' | 'idle_students';
  message: string;
  affectedStudents: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface AthenaTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change: number;
}

// ==================== PARENT PORTAL TYPES ====================

export interface ParentReport {
  studentName: string;
  period: 'weekly' | 'monthly';
  stats: {
    totalXP: number;
    levelProgress: number;
    sessionsCompleted: number;
    skillsImproved: SkillProgress[];
    achievements: string[];
  };
  summary: string;
  highlights: string[];
}

export interface SkillProgress {
  skill: keyof CareerStats;
  previousValue: number;
  currentValue: number;
  change: number;
}

// ==================== PAYMENT TYPES ====================

export interface CreateCheckoutInput {
  tier: 'PRO';
  successUrl: string;
  cancelUrl: string;
}

export interface SponsorStudentInput {
  studentId: string;
  credits: number;
  successUrl: string;
  cancelUrl: string;
}

// ==================== GRANT TYPES ====================

export interface GrantApplicationInput {
  orgName: string;
  contactEmail: string;
  contactName: string;
  region: string;
  description: string;
  studentCount: number;
  useCase: string;
}

// ==================== SOCKET TYPES ====================

export interface StudentUpdatePayload {
  status: GraphStatus;
  sentiment: number;
  nodeCount: number;
}

export interface TeacherBroadcastPayload {
  message: string;
  messageType: 'info' | 'warning' | 'hint' | 'celebration';
}

export interface ChaosEventPayload {
  eventType: ChaosEventType;
  duration: number;
  effects: ChaosEffect[];
}

export interface PhilosophyChangePayload {
  philosophy: PhilosophyMode;
}

export interface GrantCreditsPayload {
  credits: number;
  message?: string;
}

export interface RaiseHandPayload {
  studentId: string;
  displayName: string;
  question?: string;
}

// ==================== API RESPONSE TYPES ====================

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== CONTENT SAFETY TYPES ====================

export interface ContentFilterResult {
  safe: boolean;
  flaggedCategories: string[];
  confidence: number;
}

export const BLOCKED_PATTERNS = [
  // Add regex patterns for content filtering
  /\b(profanity|harmful|explicit)\b/gi,
];

// Re-export Prisma enums for convenience
export { UserRole, SubscriptionTier, PhilosophyMode, GraphStatus, GrantStatus, ChaosEventType };

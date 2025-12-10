

export enum AgentType {
  SCOUT = 'SCOUT',
  ARCHITECT = 'ARCHITECT',
  HISTORIAN = 'HISTORIAN',
  AUDITOR = 'AUDITOR',
  BUILDER = 'BUILDER',
  SECURITY = 'SECURITY'
}

export enum NodeStatus {
  IDLE = 'IDLE',
  THINKING = 'THINKING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
  WARNING = 'WARNING', // For hallucination detection
  OFFLINE = 'OFFLINE'  // For Chaos/Collapse events
}

export enum PhilosophyMode {
  FINLAND = 'FINLAND', // Play / Organic / Low Stress
  JAPAN = 'JAPAN',     // Harmony / Glass / Balanced
  KOREA = 'KOREA'      // Rigor / Cyberpunk / High Stress
}

export enum Language {
  EN = 'English',
  ES = 'Español',
  JA = '日本語',
  KO = '한국어',
  ID = 'Bahasa Indonesia',
  TH = 'ไทย',
  CA = 'Català',
  EU = 'Euskera',
  DE = 'Deutsch',
  FR = 'Français',
  NL = 'Nederlands',
  PL = 'Polski',
  PT = 'Português'
}

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN'
}

export enum AIProvider {
  GEMINI = 'GEMINI',
  DEEPSEEK = 'DEEPSEEK'
}

export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  level: number; // For gamification
  isOnboarded?: boolean;
  tier?: SubscriptionTier;
  provider?: AIProvider;
}

export interface SkillStats {
  orchestration: number; // Managing complex graphs
  auditing: number;      // Catching hallucinations
  resilience: number;    // Recovering from errors
  creativity: number;    // Prompt quality
  efficiency: number;    // Token usage / node count
  ethics: number;        // Safety checks
}

export interface AgentNode {
  id: string;
  type: AgentType;
  label: string;
  description: string;
  x: number;
  y: number;
  status: NodeStatus;
  config: {
    prompt: string;
    temperature: number;
    threshold?: number;
    source?: string;
  };
  output?: string;
  logs?: string[];
  // New fields for visual quality cues
  confidence?: number; // 0 to 100
  qualityMetrics?: {
    latency: number;
    tokens: number;
    sourcesUsed: number;
  };
  // For Tool Use / MOAT
  toolUsed?: string;
  toolResult?: string;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export interface Quest {
  id: string;
  title: string;
  objective: string;
  context: string;
  philosophy?: PhilosophyMode;
  budget: number; // Token budget for the quest
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'system' | 'agent';
  text: string;
  agentId?: string;
}

// --- NEW TYPES FOR STRATEGIC UPDATE ---

export interface CareerNode {
  id: string;
  title: string;
  description: string;
  levelReq: number;
  unlocked: boolean;
  parentId?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: 'CREATE_NODE' | 'DELETE_NODE' | 'EDIT_PROMPT' | 'EXECUTE_GRAPH' | 'AUDIT_FIX' | 'CHAOS_TRIGGERED';
  details: string;
  snapshot?: {
    nodeCount: number;
    avgConfidence: number;
  };
}

export interface CollapseEvent {
  id: string;
  type: 'API_FAILURE' | 'DATA_CORRUPTION' | 'SECURITY_BREACH';
  message: string;
  affectedNodeTypes: AgentType[];
  duration: number; // in seconds
}

export interface StudentState {
  user: User;
  nodes: AgentNode[];
  connections: Connection[];
  history: AuditLogEntry[];
  stats: SkillStats;
  currentSentiment: 'FLOW' | 'STUCK' | 'GAMING';
  credits: number;
}

// --- API & BACKEND TYPES ---

export interface ClassroomStudentSummary {
  id: string;
  name: string;
  status: 'FLOW' | 'STUCK' | 'IDLE';
  sentiment: number;
  agentsActive: number;
  lastAction: string;
}

export interface AdminStats {
  totalUsers: number;
  activeSessions: number;
  globalTokensUsed: number;
  schoolLicenseActive: boolean;
  systemHealth: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL';
}
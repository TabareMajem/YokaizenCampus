
import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export enum SkillType {
  PROMPTING = 'Prompting',
  ETHICS = 'Ethics',
  ANALYSIS = 'Analysis',
  SAFETY = 'Safety',
  DEBUGGING = 'Debugging',
  CREATIVITY = 'Creativity'
}

export type Language = 'EN' | 'ES' | 'JP' | 'KR' | 'TH';
export type Difficulty = 'Rookie' | 'Pro' | 'Elite';
export type AIModel = 'GEMINI_FLASH' | 'GEMINI_PRO' | 'DEEPSEEK_V3';

export enum GameType {
  PROMPT_ARCHITECT = 'PROMPT_ARCHITECT',
  RED_TEAM = 'RED_TEAM',
  NEON_DRIFT = 'NEON_DRIFT',
  PLANARIUM_HEIST = 'PLANARIUM_HEIST',
  STYLE_ANCHOR = 'STYLE_ANCHOR',
  BANDIT_BISTRO = 'BANDIT_BISTRO',
  GLITCHWAVE = 'GLITCHWAVE',
  OOD_SENTINEL = 'OOD_SENTINEL',
  LATENCY_LAB = 'LATENCY_LAB',
  BIAS_BINGO = 'BIAS_BINGO',
  GRADIENT_SKI = 'GRADIENT_SKI',
  LATENT_VOYAGER = 'LATENT_VOYAGER',
  TOKEN_TSUNAMI = 'TOKEN_TSUNAMI',
  PROTEIN_POKER = 'PROTEIN_POKER',
  CLIMATE_TIME_MACHINE = 'CLIMATE_TIME_MACHINE',
  WALL_STREET_WAR = 'WALL_STREET_WAR',
  SMART_CITY_MAYOR = 'SMART_CITY_MAYOR',
  SPACE_MISSION = 'SPACE_MISSION',
  DEFENSE_STRATEGIST = 'DEFENSE_STRATEGIST',
  PERSONA_SWITCHBOARD = 'PERSONA_SWITCHBOARD',
  DEEPFAKE_DETECTIVE = 'DEEPFAKE_DETECTIVE',
  CAUSAL_CONSERVATORY = 'CAUSAL_CONSERVATORY',
  DATA_WHISPERER = 'DATA_WHISPERER',
  REWARD_FIXER = 'REWARD_FIXER',
  NEURAL_NOIR = 'NEURAL_NOIR',
  PHANTOM_LATENCY = 'PHANTOM_LATENCY',
  CHRONO_QUEST = 'CHRONO_QUEST',
  VAMPIRE_INVITATION = 'VAMPIRE_INVITATION',
  MANTELLA = 'MANTELLA',
  CYBER_RAIN = 'CYBER_RAIN',
  DREAM_SIM = 'DREAM_SIM',
  BIO_GUARD = 'BIO_GUARD',
  NEXUS_NEGOTIATION = 'NEXUS_NEGOTIATION',
  XENOFLORA = 'XENOFLORA',
  NEON_SYNDICATE = 'NEON_SYNDICATE',
  ENTROPY_SANDBOX = 'ENTROPY_SANDBOX',
  COGNITIVE_CITY = 'COGNITIVE_CITY',
  PROMPT_DRIFT = 'PROMPT_DRIFT',
  DOPPELGANGER = 'DOPPELGANGER',
  VOIGHT_KAMPFF = 'VOIGHT_KAMPFF',
  ARRAKIS_SANDS = 'ARRAKIS_SANDS',
  LAZARUS_VECTOR = 'LAZARUS_VECTOR',
  VERITAS_FALLS = 'VERITAS_FALLS',
  AETHELRED_GAMBIT = 'AETHELRED_GAMBIT',
  QUANTUM_QUBIT = 'QUANTUM_QUBIT',
  NEURAL_PRISM = 'NEURAL_PRISM',
  SYNAPSE_SURGE = 'SYNAPSE_SURGE',
  DEEPFAKE_DEFLECTOR = 'DEEPFAKE_DEFLECTOR',
  ORACLE_INDEX = 'ORACLE_INDEX',
  CHAOS_ENGINEERING = 'CHAOS_ENGINEERING',
  TURING_TESSELLATION = 'TURING_TESSELLATION',
  DATA_HEIST = 'DATA_HEIST',
  PROMPT_SCULPTOR = 'PROMPT_SCULPTOR',
  SINGULARITY_CORE = 'SINGULARITY_CORE'
}

export interface SkillGain {
  skill: SkillType;
  amount: number;
  oldLevel: number;
  newLevel: number;
}

export interface Reward {
  id: string;
  name: string;
  type: 'BADGE' | 'TOOL' | 'SKIN' | 'CONSUMABLE' | 'REAL_PRIZE';
  icon: string;
  description: string;
  criteria?: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY' | 'MYTHIC';
  cost?: number;
  stock?: number;
  unlockedAt?: string;
  code?: string;
  link?: string;
  imageUrl?: string;
}

export interface Agent {
  id: string;
  name: string;
  persona: string;
  systemInstruction: string;
  knowledgeBase?: string;
  avatar: string;
  creatorId: string;
  modelPref?: AIModel; // Backend compatible
  category?: 'COACH' | 'COMPANION' | 'TUTOR' | 'THERAPIST' | 'MENTOR' | 'ASSISTANT' | 'CREATIVE' | 'GAMING' | 'CUSTOM';
  isPublic?: boolean;
  isActive?: boolean;
  rating?: number;
  totalConversations?: number;
  hasKnowledgeBase?: boolean;
  conversationStarters?: string[];
  tags?: string[];
  capabilities?: {
    canUseTools: boolean;
    customTools: string[];
  };
  skills?: AgentSkill[];
  schedules?: AgentSchedule[];
}

export interface AgentSkill {
  id: string;
  name: string;
  key: string;
  description: string;
  icon: string;
  category: 'SEARCH' | 'DATA' | 'UTILITY' | 'SOCIAL' | 'CREATIVE';
  isEnabled: boolean;
  isPremium: boolean;
}

export interface AgentTask {
  id: string;
  agentId: string;
  type: 'MANUAL' | 'SCHEDULED' | 'REACTIVE';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  name: string;
  input?: any;
  output?: any;
  error?: string;
  executionTimeMs: number;
  createdAt: string;
}

export type GameStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CreatorGame {
  id: string;
  title: string;
  description: string;
  status: GameStatus;
  creatorId: string;
  plays: number;
  prompt: string;
  scenes?: any[];
  intro?: string;
  winCondition?: string;
}

export interface CompetitionTemplate {
  id: string;
  name: string;
  durationHours: number;
  games: GameType[];
  icon: string;
}

export interface SkillNode {
  id: string;
  title: string;
  description: string;
  cost: number;
  parentId?: string;
  effect: string;
  branch: 'PROMPTING' | 'SAFETY' | 'ETHICS';
}

export interface Skin {
  id: string;
  gameId: GameType;
  name: string;
  type: 'SKIN' | 'TRAIL';
  assetUrl: string; // URL for image or Hex for color
  cost: number;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
}

export interface UserStats {
  id: string;
  email: string;
  name: string;
  avatar: string;
  title: string;
  level: number;
  xp: number;
  credits: number;
  skillPoints: number;
  unlockedSkills: string[];
  streak: number;
  streakShields: number;
  lastLoginDate: string;
  skills: Record<SkillType, number>;
  unlockedTools: string[];
  completedNodes: string[];
  isPro: boolean;
  isCreator: boolean;
  createdGames: CreatorGame[];
  squadId?: string;
  gameScores: Record<string, number>;
  completedDifficulties: Record<string, Difficulty[]>;
  subscriptionTier: 'free' | 'operative' | 'pro_creator';
  subscriptionStatus?: 'active' | 'canceled' | 'past_due';
  role: 'user' | 'admin';
  inventory: Reward[];
  agents: Agent[];
  enteredCompetitions: string[];
  isBanned?: boolean;
  language?: Language;
  // Meta-Progression
  unlockedSkins: string[]; // IDs of skins
  equippedSkins: Record<string, string>; // GameType -> SkinID (e.g., 'NEON_DRIFT': 'skin_ufo')
}

export interface GameDef {
  id: string;
  title: string;
  description: string;
  type: GameType;
  xpReward: number;
  durationMin: number;
  tags: SkillType[];
  difficulty: Difficulty;
  imageGradient?: string;
  isPremium?: boolean;
  assetIcon?: string;
  assetBanner?: string;
  visualPrompt?: string;
}

export interface TutorialContent {
  id: string;
  title: string;
  objective: string;
  controls: { icon: string; text: string }[];
  tips: string[];
}

export interface GameDebriefContent {
  id: string;
  gameId: string;
  conceptTitle: string;
  conceptDescription: string;
  keyTakeaways: string[];
  realWorldExample: string;
}

export interface PathNode {
  id: string;
  type: 'LESSON' | 'GAME' | 'CHEST';
  title: string;
  description?: string;
  gameId?: string;
  rewardToolId?: string;
  x: number;
  y: number;
  assetImage?: string;
}

export interface SquadMember {
  id: string;
  name: string;
  avatar: string;
  role: 'member' | 'leader';
  status?: 'PENDING' | 'READY' | 'OFFLINE';
}

export interface SquadTask {
  id: string;
  description: string;
  target: number;
  current: number;
  type: 'INDIVIDUAL' | 'COLLECTIVE';
}

export interface Squad {
  id: string;
  name: string;
  avatar?: string;
  tier: 'Rookie' | 'Challenger' | 'Elite';
  members: SquadMember[];
  totalXp: number;
  weeklyQuestTarget: number;
  weeklyQuestProgress: number;
  trend?: 'UP' | 'DOWN' | 'SAME';
}

export enum AppTab {
  HOME = 'HOME',
  LEARN = 'LEARN',
  LAB = 'LAB',
  LEADERBOARD = 'LEADERBOARD',
  PROFILE = 'PROFILE',
  ADMIN = 'ADMIN',
  REWARDS = 'REWARDS'
}

export interface ToolDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlockCondition: string;
  requiredBadgeId?: string;
  capabilities: string[];
  type: 'AGENT_BUILDER' | 'IMAGE_GEN' | 'AUDIO' | 'CHAT' | 'VISION' | 'GAME_CREATOR' | 'JARVIS' | 'CODE_OPT' | 'WORKFLOW' | 'OPENCLAW';
}

export interface AdminStats {
  dau: number;
  mau: number;
  totalRevenue: number;
  activeGames: number;
}

export interface Competition {
  id: string;
  title: string;
  description: string;
  timeLeft: string;
  prize: string;
  minLevel: number;
  participants: number;
  image: string;
  tasks: string[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'SUCCESS' | 'WARNING' | 'INFO' | 'REWARD';
}

export interface CyberRainState {
  rainIntensity: number;
  lightColor: string;
  fogDensity: number;
  neonColor: string;
}
export interface AgentSchedule {
  id: string;
  agentId: string;
  cronExpression: string;
  description: string;
  isActive: boolean;
  input?: any;
  createdAt: string;
}

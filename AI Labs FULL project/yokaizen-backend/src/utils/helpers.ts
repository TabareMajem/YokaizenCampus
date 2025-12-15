import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { User } from '../entities/User';

// Generate UUID
export const generateId = (): string => uuidv4();

// Generate session token
export const generateSessionToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate random string
export const generateRandomString = (length: number): string => {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

// Hash string (for non-sensitive data)
export const hashString = (input: string): string => {
  return crypto.createHash('sha256').update(input).digest('hex');
};

// Calculate XP to level
export const calculateLevel = (xp: number): number => {
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)));
};

// Calculate XP needed for next level
export const xpForNextLevel = (currentLevel: number): number => {
  return Math.pow(currentLevel + 1, 2) * 100;
};

// Calculate XP progress percentage
export const xpProgressPercentage = (xp: number, level: number): number => {
  const currentLevelXp = Math.pow(level, 2) * 100;
  const nextLevelXp = Math.pow(level + 1, 2) * 100;
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return Math.max(0, Math.min(100, progress));
};

// Calculate energy with regeneration
export const calculateEnergy = (
  currentEnergy: number,
  maxEnergy: number,
  lastUpdated: Date | null,
  regenRateMinutes: number = 5
): { energy: number; shouldUpdate: boolean } => {
  if (!lastUpdated) {
    return { energy: currentEnergy, shouldUpdate: false };
  }

  const now = new Date();
  const minutesPassed = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60));
  const energyGained = Math.floor(minutesPassed / regenRateMinutes);

  if (energyGained === 0) {
    return { energy: currentEnergy, shouldUpdate: false };
  }

  const newEnergy = Math.min(maxEnergy, currentEnergy + energyGained);
  return { energy: newEnergy, shouldUpdate: newEnergy !== currentEnergy };
};

// Check and update streak
export const calculateStreak = (
  currentStreak: number,
  lastLogin: Date | null
): { streak: number; isNewDay: boolean; streakBroken: boolean } => {
  if (!lastLogin) {
    return { streak: 1, isNewDay: true, streakBroken: false };
  }

  const now = new Date();
  const lastLoginDate = new Date(lastLogin);

  // Reset to midnight
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastDate = new Date(lastLoginDate.getFullYear(), lastLoginDate.getMonth(), lastLoginDate.getDate());

  const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    return { streak: currentStreak, isNewDay: false, streakBroken: false };
  }

  if (daysDiff === 1) {
    return { streak: currentStreak + 1, isNewDay: true, streakBroken: false };
  }

  return { streak: 1, isNewDay: true, streakBroken: true };
};

// Calculate streak bonus
export const calculateStreakBonus = (streak: number): { xpBonus: number; creditBonus: number } => {
  const multiplier = Math.min(streak, 30); // Cap at 30 days
  return {
    xpBonus: 10 * multiplier,
    creditBonus: 5 * multiplier,
  };
};

// Format number with commas
export const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US');
};

// Format duration in seconds to human readable
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};

// Sanitize user input
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

// Truncate string
export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.substring(0, length - 3) + '...';
};

// Delay utility
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Retry utility
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await delay(delayMs * attempt);
      }
    }
  }

  throw lastError;
};

// Chunk array
export const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Pick specific keys from object
export const pick = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
};

// Omit specific keys from object
export const omit = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
};

// Deep clone object
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// Check if string is valid JSON
export const isValidJson = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// Generate username from email or phone
export const generateUsername = (identifier: string): string => {
  const base = identifier.includes('@')
    ? identifier.split('@')[0]
    : identifier.replace(/[^a-zA-Z0-9]/g, '').slice(-6);

  const randomSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${base}_${randomSuffix}`;
};

// Calculate percentile rank
export const calculatePercentile = (score: number, scores: number[]): number => {
  const sorted = [...scores].sort((a, b) => a - b);
  const index = sorted.findIndex((s) => s >= score);
  return index === -1 ? 100 : Math.round((index / sorted.length) * 100);
};

// Wrap text for AI prompts
export const wrapUserInput = (input: string): string => {
  return `"""
${input}
"""`;
};

// Parse comma-separated string to array
export const parseCommaSeparated = (str: string | undefined): string[] => {
  if (!str) return [];
  return str.split(',').map((s) => s.trim()).filter(Boolean);
};

// Get date range for period
export const getDateRange = (period: 'today' | 'week' | 'month' | 'year'): { start: Date; end: Date } => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today':
      break;
    case 'week':
      start.setDate(start.getDate() - start.getDay());
      break;
    case 'month':
      start.setDate(1);
      break;
    case 'year':
      start.setMonth(0, 1);
      break;
  }

  return { start, end };
};

export default {
  generateId,
  generateSessionToken,
  generateRandomString,
  hashString,
  calculateLevel,
  xpForNextLevel,
  xpProgressPercentage,
  calculateEnergy,
  calculateStreak,
  calculateStreakBonus,
  formatNumber,
  formatDuration,
  sanitizeInput,
  truncate,
  delay,
  retry,
  chunkArray,
  pick,
  omit,
  deepClone,
  isValidJson,
  generateUsername,
  calculatePercentile,
  wrapUserInput,
  parseCommaSeparated,
  getDateRange,
};

// ============================================
// BACKWARDS COMPATIBLE ALIASES FOR SERVICES
// ============================================

// Alias for AI service
export const sanitizeForPrompt = (text: string): string => {
  return sanitizeInput(text).substring(0, 10000); // Limit prompt length
};

// XP and credit reward calculations
export const calculateXPReward = (
  baseXP: number,
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME' = 'MEDIUM',
  scoreMultiplier: number = 1
): number => {
  const difficultyMultipliers = { EASY: 1, MEDIUM: 1.5, HARD: 2, EXTREME: 3 };
  return Math.floor(baseXP * difficultyMultipliers[difficulty] * scoreMultiplier);
};

export const calculateCreditReward = (
  baseCredits: number,
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME' = 'MEDIUM',
  scoreMultiplier: number = 1
): number => {
  const difficultyMultipliers = { EASY: 0.5, MEDIUM: 1, HARD: 1.5, EXTREME: 2 };
  return Math.floor(baseCredits * difficultyMultipliers[difficulty] * scoreMultiplier);
};

// Energy regeneration alias
export const calculateEnergyRegen = calculateEnergy;

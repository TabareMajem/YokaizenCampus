// Yokaizen Campus - Helper Utilities
// Common helper functions

import crypto from 'crypto';
import { LEVEL_THRESHOLDS, CareerStats } from '../types/index.js';

// Generate a unique 6-character access code for classrooms
export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (I, O, 0, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate anonymous student identifier
export function generateAnonymousId(): string {
  const adjectives = ['Swift', 'Bright', 'Noble', 'Bold', 'Keen', 'Wise', 'Brave', 'Quick'];
  const nouns = ['Cadet', 'Pilot', 'Scout', 'Agent', 'Ranger', 'Knight', 'Sage', 'Spark'];
  const number = Math.floor(Math.random() * 1000);
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adj}${noun}-${number}`;
}

// Calculate level from XP
export function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

// Calculate XP needed for next level
export function xpToNextLevel(currentXp: number): number {
  const currentLevel = calculateLevel(currentXp);
  if (currentLevel >= LEVEL_THRESHOLDS.length) {
    return 0; // Max level reached
  }
  return LEVEL_THRESHOLDS[currentLevel] - currentXp;
}

// Calculate progress percentage to next level
export function levelProgress(currentXp: number): number {
  const currentLevel = calculateLevel(currentXp);
  if (currentLevel >= LEVEL_THRESHOLDS.length) {
    return 100;
  }
  
  const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1];
  const nextThreshold = LEVEL_THRESHOLDS[currentLevel];
  const xpInLevel = currentXp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  
  return Math.round((xpInLevel / xpNeeded) * 100);
}

// Generate a secure random token
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Hash a string (for non-password purposes)
export function hashString(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Parse duration string to milliseconds
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: throw new Error(`Unknown duration unit: ${unit}`);
  }
}

// Clamp a number between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Calculate class velocity based on student statuses
export function calculateVelocity(
  flowCount: number,
  stuckCount: number,
  idleCount: number,
  averageSentiment: number
): number {
  const total = flowCount + stuckCount + idleCount;
  if (total === 0) return 0;
  
  const flowRatio = flowCount / total;
  const stuckPenalty = (stuckCount / total) * 30;
  const idlePenalty = (idleCount / total) * 15;
  
  const baseVelocity = flowRatio * 100;
  const sentimentBonus = (averageSentiment - 50) * 0.3; // +/- 15 based on sentiment
  
  return Math.round(clamp(baseVelocity - stuckPenalty - idlePenalty + sentimentBonus, 0, 100));
}

// Default career stats for new users
export function getDefaultCareerStats(): CareerStats {
  return {
    orchestration: 10,
    resilience: 10,
    creativity: 10,
    logic: 10,
    ethics: 10,
  };
}

// Update career stats based on action
export function updateCareerStats(
  currentStats: CareerStats,
  action: string,
  performance: number // 0-100
): CareerStats {
  const multiplier = performance / 100;
  const gain = Math.round(5 * multiplier);
  
  const updates: Partial<CareerStats> = {};
  
  switch (action) {
    case 'GRAPH_EXECUTE':
      updates.orchestration = gain;
      updates.logic = Math.round(gain * 0.5);
      break;
    case 'AUDIT_HALLUCINATION':
      updates.ethics = gain;
      updates.logic = Math.round(gain * 0.7);
      break;
    case 'SURVIVE_CHAOS':
      updates.resilience = gain * 2;
      break;
    case 'CREATIVE_OUTPUT':
      updates.creativity = gain;
      break;
    default:
      // General XP action
      updates.orchestration = Math.round(gain * 0.3);
  }
  
  return {
    orchestration: currentStats.orchestration + (updates.orchestration || 0),
    resilience: currentStats.resilience + (updates.resilience || 0),
    creativity: currentStats.creativity + (updates.creativity || 0),
    logic: currentStats.logic + (updates.logic || 0),
    ethics: currentStats.ethics + (updates.ethics || 0),
  };
}

// Sanitize user input
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[^\w\s.,!?'"()-]/g, '') // Remove special characters except common punctuation
    .substring(0, 10000); // Limit length
}

// Format error for API response
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

// Sleep utility for delays
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Omit sensitive fields from user object
export function sanitizeUser<T extends Record<string, unknown>>(
  user: T,
  fieldsToRemove: string[] = ['passwordHash', 'password_hash']
): Omit<T, 'passwordHash' | 'password_hash'> {
  const sanitized = { ...user };
  for (const field of fieldsToRemove) {
    delete sanitized[field];
  }
  return sanitized;
}

// Check if string is valid UUID
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Generate random integer in range
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Chunk array into smaller arrays
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Deep merge objects
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };
  
  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = result[key];
    
    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }
  
  return result;
}

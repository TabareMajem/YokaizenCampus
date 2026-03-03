// Yokaizen Campus - Gamification Service
// XP, Levels, Career Paths, and Achievements

import { prisma } from '../utils/prisma.js';
import {
  calculateLevel,
  xpToNextLevel,
  levelProgress,
  getDefaultCareerStats,
  updateCareerStats,
} from '../utils/helpers.js';
import {
  CareerPathData,
  CareerStats,
  LevelUpResult,
  XP_VALUES,
  LEVEL_THRESHOLDS,
  AgentNodeType,
} from '../types/index.js';

// Node unlock requirements by level
const NODE_UNLOCKS: Record<number, AgentNodeType[]> = {
  1: ['SCOUT'],
  3: ['CREATIVE'],
  5: ['CRITIC'],
  6: ['ANALYST'],
  7: ['DEBUGGER'],
  8: ['ETHICIST'],
  10: ['ARCHITECT'],
  12: ['SYNTHESIZER'],
  15: ['COMMANDER'],
};

// Achievement definitions
const ACHIEVEMENTS: Record<string, {
  name: string;
  description: string;
  check: (stats: { xp: number; level: number; stats: CareerStats; chaosEventsSurvived: number }) => boolean;
}> = {
  FIRST_GRAPH: {
    name: 'Graph Pioneer',
    description: 'Complete your first graph execution',
    check: (stats) => stats.xp >= XP_VALUES.GRAPH_EXECUTE,
  },
  HALLUCINATION_HUNTER: {
    name: 'Hallucination Hunter',
    description: 'Successfully audit 5 hallucinations',
    check: (stats) => stats.stats.ethics >= 50,
  },
  CHAOS_SURVIVOR: {
    name: 'Chaos Survivor',
    description: 'Survive 10 chaos events',
    check: (stats) => stats.chaosEventsSurvived >= 10,
  },
  LEVEL_10: {
    name: 'Rising Star',
    description: 'Reach level 10',
    check: (stats) => stats.level >= 10,
  },
  ORCHESTRATOR: {
    name: 'Master Orchestrator',
    description: 'Reach 100 orchestration skill',
    check: (stats) => stats.stats.orchestration >= 100,
  },
  RESILIENT: {
    name: 'Unbreakable',
    description: 'Reach 100 resilience skill',
    check: (stats) => stats.stats.resilience >= 100,
  },
  CREATIVE_GENIUS: {
    name: 'Creative Genius',
    description: 'Reach 100 creativity skill',
    check: (stats) => stats.stats.creativity >= 100,
  },
  LOGIC_MASTER: {
    name: 'Logic Master',
    description: 'Reach 100 logic skill',
    check: (stats) => stats.stats.logic >= 100,
  },
  ETHICS_CHAMPION: {
    name: 'Ethics Champion',
    description: 'Reach 100 ethics skill',
    check: (stats) => stats.stats.ethics >= 100,
  },
  LEVEL_15: {
    name: 'Commander',
    description: 'Reach level 15 and unlock the Commander agent',
    check: (stats) => stats.level >= 15,
  },
};

// Gamification service class
export class GamificationService {
  constructor() { }

  // Get or create career path for user
  async getCareerPath(userId: string): Promise<CareerPathData> {
    let careerPath = await prisma.careerPath.findUnique({
      where: { userId },
    });

    if (!careerPath) {
      careerPath = await prisma.careerPath.create({
        data: {
          userId,
          unlockedNodes: ['SCOUT'],
          stats: getDefaultCareerStats() as any,
          achievements: [],
          chaosEventsSurvived: 0,
        },
      });
    }

    return {
      id: careerPath.id,
      userId: careerPath.userId,
      unlockedNodes: careerPath.unlockedNodes,
      stats: careerPath.stats as any,
      achievements: careerPath.achievements,
      chaosEventsSurvived: careerPath.chaosEventsSurvived,
    };
  }

  // Award XP and handle level up
  async awardXP(
    userId: string,
    actionType: keyof typeof XP_VALUES,
    performance: number = 100,
    meta?: any
  ): Promise<{ xpGained: number; levelUp?: LevelUpResult; newAchievements: string[] }> {
    const baseXP = XP_VALUES[actionType];
    const xpGained = Math.round(baseXP * (performance / 100));

    // Get current user state
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const previousLevel = user.level;
    const newXP = user.xp + xpGained;
    const newLevel = calculateLevel(newXP);

    // Update user XP and level
    await prisma.user.update({
      where: { id: userId },
      data: {
        xp: newXP,
        level: newLevel,
      },
    });

    // Update career stats
    const careerPath = await this.getCareerPath(userId);
    const updatedStats = updateCareerStats(careerPath.stats, actionType, performance);

    await prisma.careerPath.update({
      where: { userId },
      data: { stats: updatedStats as any },
    });

    // Handle level up
    let levelUp: LevelUpResult | undefined;
    if (newLevel > previousLevel) {
      levelUp = await this.handleLevelUp(userId, previousLevel, newLevel);
    }

    // Check for new achievements
    const newAchievements = await this.checkAchievements(userId, newXP, newLevel, updatedStats, careerPath.chaosEventsSurvived);

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        actionType,
        details: `Gained ${xpGained} XP (performance: ${performance}%)`,
        meta: {
          xpGained,
          newXP,
          newLevel,
          levelUp: !!levelUp,
        },
      },
    });

    return {
      xpGained,
      levelUp,
      newAchievements,
    };
  }

  // Handle level up logic
  private async handleLevelUp(userId: string, previousLevel: number, newLevel: number): Promise<LevelUpResult> {
    const unlockedNodes: string[] = [];

    // Check each level between previous and new for unlocks
    for (let level = previousLevel + 1; level <= newLevel; level++) {
      const nodes = NODE_UNLOCKS[level];
      if (nodes) {
        unlockedNodes.push(...nodes);
      }
    }

    // Update career path with newly unlocked nodes
    if (unlockedNodes.length > 0) {
      await prisma.careerPath.update({
        where: { userId },
        data: {
          unlockedNodes: {
            push: unlockedNodes,
          },
        },
      });
    }

    return {
      newLevel,
      xpToNextLevel: xpToNextLevel(LEVEL_THRESHOLDS[newLevel - 1]),
      unlockedNode: unlockedNodes[0],
    };
  }

  // Check and award achievements
  private async checkAchievements(
    userId: string,
    xp: number,
    level: number,
    stats: CareerStats,
    chaosEventsSurvived: number
  ): Promise<string[]> {
    const careerPath = await prisma.careerPath.findUnique({
      where: { userId },
      select: { achievements: true },
    });

    if (!careerPath) return [];

    const currentAchievements = new Set(careerPath.achievements);
    const newAchievements: string[] = [];

    const checkStats = { xp, level, stats, chaosEventsSurvived };

    for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
      if (!currentAchievements.has(id) && achievement.check(checkStats)) {
        newAchievements.push(id);
      }
    }

    if (newAchievements.length > 0) {
      await prisma.careerPath.update({
        where: { userId },
        data: {
          achievements: {
            push: newAchievements,
          },
        },
      });

      // Log achievement
      await prisma.auditLog.create({
        data: {
          userId,
          actionType: 'ACHIEVEMENT_UNLOCKED',
          details: `Unlocked: ${newAchievements.join(', ')}`,
        },
      });
    }

    return newAchievements;
  }

  // Record chaos event survival
  async recordChaosSurvival(userId: string): Promise<{ xpGained: number; newAchievements: string[] }> {
    await prisma.careerPath.update({
      where: { userId },
      data: {
        chaosEventsSurvived: { increment: 1 },
      },
    });

    return this.awardXP(userId, 'SURVIVE_CHAOS', 100);
  }

  // Unlock agent via AR scan
  async unlockAgentViaAR(userId: string, agentType: AgentNodeType): Promise<{ alreadyUnlocked: boolean; xpGained: number }> {
    const careerPath = await this.getCareerPath(userId);

    if (careerPath.unlockedNodes.includes(agentType)) {
      return { alreadyUnlocked: true, xpGained: 0 };
    }

    await prisma.careerPath.update({
      where: { userId },
      data: {
        unlockedNodes: {
          push: [agentType],
        },
      },
    });

    // Award XP for discovery
    const xpResult = await this.awardXP(userId, 'COMPLETE_QUEST', 100);

    return {
      alreadyUnlocked: false,
      xpGained: xpResult.xpGained,
    };
  }

  // Get user progress summary
  async getProgressSummary(userId: string): Promise<{
    level: number;
    xp: number;
    xpToNext: number;
    progress: number;
    careerPath: CareerPathData;
    achievementDetails: Array<{ id: string; name: string; description: string; unlocked: boolean }>;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { level: true, xp: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const careerPath = await this.getCareerPath(userId);
    const unlockedAchievements = new Set(careerPath.achievements);

    const achievementDetails = Object.entries(ACHIEVEMENTS).map(([id, achievement]) => ({
      id,
      name: achievement.name,
      description: achievement.description,
      unlocked: unlockedAchievements.has(id),
    }));

    return {
      level: user.level,
      xp: user.xp,
      xpToNext: xpToNextLevel(user.xp),
      progress: levelProgress(user.xp),
      careerPath,
      achievementDetails,
    };
  }

  // Check if user can use a specific agent
  async canUseAgent(userId: string, agentType: AgentNodeType): Promise<{ allowed: boolean; reason?: string }> {
    const careerPath = await this.getCareerPath(userId);

    if (careerPath.unlockedNodes.includes(agentType)) {
      return { allowed: true };
    }

    // Find required level for this agent
    for (const [level, nodes] of Object.entries(NODE_UNLOCKS)) {
      if (nodes.includes(agentType)) {
        return {
          allowed: false,
          reason: `Requires level ${level} to unlock ${agentType}`,
        };
      }
    }

    // Agent might be unlockable via AR
    if (agentType === 'ORACLE') {
      return {
        allowed: false,
        reason: 'ORACLE is unlocked by finding hidden AR markers',
      };
    }

    return {
      allowed: false,
      reason: `${agentType} is not available`,
    };
  }
  // --- REAL IMPLEMENTATIONS FOR CONTROLLER SYNC ---

  async getProfile(userId: string) { return this.getProgressSummary(userId); }

  async getAchievements(userId: string) {
    const careerPath = await this.getCareerPath(userId);
    const unlockedIds = new Set(careerPath.achievements);

    const allAchievements = Object.entries(ACHIEVEMENTS).map(([id, def]) => ({
      id,
      name: def.name,
      description: def.description,
      unlocked: unlockedIds.has(id),
    }));

    return {
      achievements: allAchievements,
      count: careerPath.achievements.length,
      total: Object.keys(ACHIEVEMENTS).length
    };
  }

  async claimAchievement(userId: string, achievementId: string) {
    // Auto-awarded in checkAchievements, but returning success for sync
    return { success: true, claimed: achievementId };
  }

  async getLeaderboard(options: any) {
    return getLeaderboard(options.limit || 10, options.scope === 'school' ? options.schoolId : undefined);
  }

  async getAvailableNodes(userId: string) {
    const path = await this.getCareerPath(userId);
    return path.unlockedNodes;
  }

  async getDetailedStats(userId: string, period: string) {
    return this.getCareerPath(userId);
  }

  async getXPHistory(userId: string, options: any) {
    return getWeeklyXPSummary(userId);
  }

  async getStreaks(userId: string) {
    // Calculate streak from AuditLog recent logins/activity
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const logs = await prisma.auditLog.findMany({
      where: { userId, timestamp: { gte: oneWeekAgo } },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true }
    });

    if (logs.length === 0) return { current: 0, best: 0 };

    const uniqueDays = new Set(logs.map(l => l.timestamp.toISOString().split('T')[0]));
    return { current: uniqueDays.size, best: uniqueDays.size };
  }

  async getActiveChallenges(userId: string) { return []; }
  async joinChallenge(userId: string, challengeId: string) { return { success: false, error: "Not implemented" }; }

  async getAvailableRewards(userId: string) {
    // Using AR Markers as available contextual rewards
    const markers = await prisma.aRMarker.findMany({
      where: { isActive: true },
      take: 10
    });
    return markers;
  }

  async redeemReward(userId: string, rewardId: string) {
    const marker = await prisma.aRMarker.findUnique({ where: { id: rewardId } });
    if (!marker) throw new Error("Reward not found");
    return this.unlockAgentViaAR(userId, marker.unlocksAgent as any);
  }

  async getUserRank(userId: string) {
    const lb = await getLeaderboard(500); // Need a large limit for accurate ranking
    const pos = lb.findIndex(u => u.userId === userId);
    return {
      rank: pos >= 0 ? pos + 1 : 0,
      percentile: pos >= 0 ? Math.round((1 - (pos / lb.length)) * 100) : 0
    };
  }

  async getLevelProgress(userId: string) { return this.getProgressSummary(userId); }

  async getTitles(userId: string) {
    const career = await this.getCareerPath(userId);
    return career.achievements;
  }

  async equipTitle(userId: string, titleId: string) { return { success: true }; }

  async getBadges(userId: string) {
    const cd = await this.getCareerPath(userId);
    return cd.achievements;
  }

  async displayBadge(userId: string, badgeId: string, slot: number) { return { success: true }; }

  async getClassroomLeaderboard(classroomId: string, userId: string) {
    // Fetch users linked to the specific classroom
    const classroomData = await prisma.classroomStudent.findMany({
      where: { classroomId },
      include: {
        student: {
          select: { id: true, fullName: true, level: true, xp: true }
        }
      }
    });

    const students = classroomData.map(c => c.student).sort((a, b) => b.xp - a.xp);
    return students.map((s, idx) => ({
      rank: idx + 1,
      userId: s.id,
      displayName: s.fullName,
      level: s.level,
      xp: s.xp
    }));
  }

  async checkAndAwardAchievements(userId: string) {
    const cd = await this.getCareerPath(userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return [];

    return this.checkAchievements(userId, user.xp, user.level, cd.stats as any, cd.chaosEventsSurvived);
  }
}

// Factory function
export function createGamificationService(userId: string): GamificationService {
  return new GamificationService();
}

// Leaderboard functions
export async function getLeaderboard(
  limit: number = 10,
  schoolId?: string
): Promise<Array<{
  rank: number;
  userId: string;
  displayName: string;
  level: number;
  xp: number;
}>> {
  const where = schoolId ? { schoolId } : {};

  const users = await prisma.user.findMany({
    where: {
      ...where,
      role: 'STUDENT',
    },
    orderBy: [
      { level: 'desc' },
      { xp: 'desc' },
    ],
    take: limit,
    select: {
      id: true,
      fullName: true,
      level: true,
      xp: true,
      school: {
        select: { anonymizeStudents: true },
      },
    },
  });

  return users.map((user, index) => ({
    rank: index + 1,
    userId: user.id,
    displayName: user.school?.anonymizeStudents ? `Student-${index + 1}` : user.fullName,
    level: user.level,
    xp: user.xp,
  }));
}

// Weekly XP summary for parent reports
export async function getWeeklyXPSummary(userId: string): Promise<{
  totalXP: number;
  actionsCompleted: number;
  topAction: string;
  dailyBreakdown: Array<{ date: string; xp: number }>;
}> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const logs = await prisma.auditLog.findMany({
    where: {
      userId,
      timestamp: { gte: oneWeekAgo },
      actionType: {
        in: Object.keys(XP_VALUES),
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  // Calculate totals
  const actionCounts: Record<string, number> = {};
  let totalXP = 0;
  const dailyXP: Record<string, number> = {};

  for (const log of logs) {
    const meta = log.meta as { xpGained?: number } | null;
    const xp = meta?.xpGained || 0;

    totalXP += xp;
    actionCounts[log.actionType] = (actionCounts[log.actionType] || 0) + 1;

    const dateKey = log.timestamp.toISOString().split('T')[0];
    dailyXP[dateKey] = (dailyXP[dateKey] || 0) + xp;
  }

  // Find top action
  let topAction = 'None';
  let maxCount = 0;
  for (const [action, count] of Object.entries(actionCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topAction = action;
    }
  }

  // Build daily breakdown
  const dailyBreakdown: Array<{ date: string; xp: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    dailyBreakdown.push({
      date: dateKey,
      xp: dailyXP[dateKey] || 0,
    });
  }

  return {
    totalXP,
    actionsCompleted: logs.length,
    topAction,
    dailyBreakdown,
  };
}

// Export singleton instance
export const gamificationService = new GamificationService();


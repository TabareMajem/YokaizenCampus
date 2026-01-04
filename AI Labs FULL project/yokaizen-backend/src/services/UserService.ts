import { Repository, In, Like } from 'typeorm';
import { AppDataSource } from '@config/database';
import { redisClient, invalidateCache } from '@config/redis';
import { logger } from '@config/logger';
import { User, UserTier } from '@entities/User';
import { Inventory, ItemType, ItemRarity } from '@entities/Inventory';
import { Skill, SkillCategory, SKILL_TREE } from '@entities/Skill';
import { ApiError } from '@utils/errors';
import { calculateLevel, calculateEnergyRegen } from '@utils/helpers';
import { UserStatsResponse } from '@types';

export class UserService {
  private userRepository: Repository<User>;
  private inventoryRepository: Repository<Inventory>;
  private skillRepository: Repository<Skill>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.inventoryRepository = AppDataSource.getRepository(Inventory);
    this.skillRepository = AppDataSource.getRepository(Skill);
  }

  /**
   * Get full user stats including inventory and skills
   */
  async getUserStats(userId: string): Promise<UserStatsResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['squad', 'inventory', 'skills'],
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Calculate current energy with regeneration
    const { currentEnergy, lastEnergyUpdate } = calculateEnergyRegen(
      user.energy,
      user.maxEnergy,
      user.lastEnergyUpdate
    );

    // Update if energy changed
    if (currentEnergy !== user.energy) {
      user.energy = currentEnergy;
      user.lastEnergyUpdate = lastEnergyUpdate;
      await this.userRepository.save(user);
    }

    // Calculate level and progress
    const level = calculateLevel(Number(user.xp));
    const currentLevelXP = level * level * 100;
    const nextLevelXP = (level + 1) * (level + 1) * 100;
    const xpProgress = ((Number(user.xp) - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

    // Get skill points (1 per level, minus used)
    const usedSkillPoints = user.skills?.length || 0;
    const availableSkillPoints = level - usedSkillPoints;

    // Get active items (equipped)
    const activeItems = user.inventory?.filter(item => item.isEquipped) || [];

    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      tier: user.tier,
      role: user.role,
      credits: user.credits,
      xp: Number(user.xp),
      level,
      xpProgress: Math.round(xpProgress),
      xpToNextLevel: nextLevelXP - Number(user.xp),
      energy: currentEnergy,
      maxEnergy: user.maxEnergy,
      streak: user.streak,
      language: user.language,
      squad: user.squad ? {
        id: user.squad.id,
        name: user.squad.name,
        icon: user.squad.icon,
        tier: user.squad.tier,
      } : null,
      inventory: user.inventory?.map(item => ({
        id: item.id,
        itemId: item.itemId,
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        isEquipped: item.isEquipped,
        acquiredAt: item.acquiredAt,
      })) || [],
      skills: user.skills?.map(skill => ({
        id: skill.id,
        nodeId: skill.nodeId,
        name: skill.name,
        category: skill.category,
        level: skill.level,
        unlockedAt: skill.unlockedAt,
      })) || [],
      availableSkillPoints,
      activeItems: activeItems.map(item => item.itemId),
      settings: user.settings,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: {
      username?: string;
      avatarUrl?: string;
      language?: string;
      settings?: Record<string, any>;
    }
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Check username uniqueness
    if (updates.username && updates.username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updates.username },
      });
      if (existingUser) {
        throw ApiError.conflict('Username already taken');
      }
      user.username = updates.username;
    }

    if (updates.avatarUrl !== undefined) {
      user.avatarUrl = updates.avatarUrl;
    }

    if (updates.language) {
      user.language = updates.language;
    }

    if (updates.settings) {
      user.settings = { ...user.settings, ...updates.settings };
    }

    await this.userRepository.save(user);
    await invalidateCache(`user:${userId}`);

    logger.info('User profile updated', { userId, updates: Object.keys(updates) });
    return user;
  }

  /**
   * Update user API keys for BYO feature
   */
  async updateApiKeys(
    userId: string,
    keys: {
      google?: string;
      openai?: string;
      anthropic?: string;
      deepseek?: string;
    }
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Initialize if null
    if (!user.apiKeys) {
      user.apiKeys = {};
    }

    // Update keys
    if (keys.google !== undefined) user.apiKeys.google = keys.google;
    if (keys.openai !== undefined) user.apiKeys.openai = keys.openai;
    if (keys.anthropic !== undefined) user.apiKeys.anthropic = keys.anthropic;
    if (keys.deepseek !== undefined) user.apiKeys.deepseek = keys.deepseek;

    await this.userRepository.save(user);
    await invalidateCache(`user:${userId}`);

    logger.info('User API keys updated', { userId });
    return user;
  }

  /**
   * Unlock a skill from the skill tree
   */
  async unlockSkill(userId: string, nodeId: string): Promise<Skill> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['skills'],
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Find skill definition in tree
    const skillDef = this.findSkillInTree(nodeId);
    if (!skillDef) {
      throw ApiError.notFound('Skill not found in skill tree');
    }

    // Check if already unlocked
    const existingSkill = user.skills?.find(s => s.nodeId === nodeId);
    if (existingSkill) {
      throw ApiError.conflict('Skill already unlocked');
    }

    // Check prerequisites
    if (skillDef.prerequisites && skillDef.prerequisites.length > 0) {
      const unlockedNodeIds = user.skills?.map(s => s.nodeId) || [];
      const missingPrereqs = skillDef.prerequisites.filter(
        prereq => !unlockedNodeIds.includes(prereq)
      );
      if (missingPrereqs.length > 0) {
        throw ApiError.badRequest(`Missing prerequisites: ${missingPrereqs.join(', ')}`);
      }
    }

    // Check skill points
    const level = calculateLevel(Number(user.xp));
    const usedPoints = user.skills?.length || 0;
    const availablePoints = level - usedPoints;

    const cost = skillDef.cost || 1;
    if (availablePoints < cost) {
      throw ApiError.badRequest(`Not enough skill points. Need ${cost}, have ${availablePoints}`);
    }

    // Create skill
    const skill = this.skillRepository.create({
      user,
      nodeId,
      name: skillDef.name,
      description: skillDef.description,
      category: skillDef.category as SkillCategory,
      level: 1,
      maxLevel: skillDef.maxLevel || 1,
      bonuses: skillDef.bonuses || {},
    });

    await this.skillRepository.save(skill);
    await invalidateCache(`user:${userId}`);

    logger.info('Skill unlocked', { userId, nodeId, skillName: skill.name });
    return skill;
  }

  /**
   * Upgrade an existing skill
   */
  async upgradeSkill(userId: string, skillId: string): Promise<Skill> {
    const skill = await this.skillRepository.findOne({
      where: { id: skillId, user: { id: userId } },
      relations: ['user'],
    });

    if (!skill) {
      throw ApiError.notFound('Skill not found');
    }

    if (skill.level >= skill.maxLevel) {
      throw ApiError.badRequest('Skill already at max level');
    }

    // Check skill points
    const user = skill.user;
    const level = calculateLevel(Number(user.xp));
    const usedPoints = await this.skillRepository.count({ where: { user: { id: userId } } });
    const availablePoints = level - usedPoints;

    if (availablePoints < 1) {
      throw ApiError.badRequest('Not enough skill points');
    }

    skill.level += 1;
    await this.skillRepository.save(skill);
    await invalidateCache(`user:${userId}`);

    logger.info('Skill upgraded', { userId, skillId, newLevel: skill.level });
    return skill;
  }

  /**
   * Get user inventory
   */
  async getInventory(userId: string, filters?: {
    type?: ItemType;
    rarity?: ItemRarity;
    equipped?: boolean;
  }): Promise<Inventory[]> {
    const where: any = { user: { id: userId } };

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.rarity) {
      where.rarity = filters.rarity;
    }
    if (filters?.equipped !== undefined) {
      where.isEquipped = filters.equipped;
    }

    return this.inventoryRepository.find({
      where,
      order: { acquiredAt: 'DESC' },
    });
  }

  /**
   * Add item to user inventory
   */
  async addToInventory(
    userId: string,
    item: {
      itemId: string;
      name: string;
      description?: string;
      type: ItemType;
      rarity: ItemRarity;
      metadata?: Record<string, any>;
      expiresAt?: Date;
    }
  ): Promise<Inventory> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Check if user already has this item (for non-stackable items)
    const existing = await this.inventoryRepository.findOne({
      where: { user: { id: userId }, itemId: item.itemId },
    });

    if (existing && !item.metadata?.stackable) {
      throw ApiError.conflict('Item already in inventory');
    }

    const inventoryItem = this.inventoryRepository.create({
      user,
      ...item,
    });

    await this.inventoryRepository.save(inventoryItem);
    await invalidateCache(`user:${userId}`);

    logger.info('Item added to inventory', { userId, itemId: item.itemId });
    return inventoryItem;
  }

  /**
   * Equip/unequip an item
   */
  async toggleEquipItem(userId: string, inventoryId: string): Promise<Inventory> {
    const item = await this.inventoryRepository.findOne({
      where: { id: inventoryId, user: { id: userId } },
    });

    if (!item) {
      throw ApiError.notFound('Item not found in inventory');
    }

    // If equipping, unequip other items of same type
    if (!item.isEquipped) {
      await this.inventoryRepository.update(
        { user: { id: userId }, type: item.type, isEquipped: true },
        { isEquipped: false }
      );
    }

    item.isEquipped = !item.isEquipped;
    await this.inventoryRepository.save(item);
    await invalidateCache(`user:${userId}`);

    return item;
  }

  /**
   * Use a consumable item
   */
  async useItem(userId: string, inventoryId: string): Promise<{ success: boolean; effect: any }> {
    const item = await this.inventoryRepository.findOne({
      where: { id: inventoryId, user: { id: userId } },
      relations: ['user'],
    });

    if (!item) {
      throw ApiError.notFound('Item not found in inventory');
    }

    if (item.type !== ItemType.BOOST) {
      throw ApiError.badRequest('Only boost items can be used');
    }

    // Check expiration
    if (item.expiresAt && item.expiresAt < new Date()) {
      await this.inventoryRepository.remove(item);
      throw ApiError.badRequest('Item has expired');
    }

    // Apply boost effect
    const user = item.user;
    const effect = item.metadata?.effect || {};

    if (effect.energy) {
      user.energy = Math.min(user.energy + effect.energy, user.maxEnergy);
    }
    if (effect.credits) {
      user.credits += effect.credits;
    }
    if (effect.xp) {
      user.xp = BigInt(Number(user.xp) + effect.xp);
    }

    await this.userRepository.save(user);

    // Remove consumable item
    await this.inventoryRepository.remove(item);
    await invalidateCache(`user:${userId}`);

    logger.info('Item used', { userId, itemId: item.itemId, effect });
    return { success: true, effect };
  }

  /**
   * Add credits to user
   */
  async addCredits(userId: string, amount: number, reason: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    user.credits += amount;
    await this.userRepository.save(user);
    await invalidateCache(`user:${userId}`);

    logger.info('Credits added', { userId, amount, reason, newBalance: user.credits });
    return user;
  }

  /**
   * Deduct credits from user
   */
  async deductCredits(userId: string, amount: number, reason: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.credits < amount) {
      throw ApiError.badRequest('Insufficient credits');
    }

    user.credits -= amount;
    await this.userRepository.save(user);
    await invalidateCache(`user:${userId}`);

    logger.info('Credits deducted', { userId, amount, reason, newBalance: user.credits });
    return user;
  }

  /**
   * Add XP to user
   */
  async addXP(userId: string, amount: number, source: string): Promise<{
    user: User;
    leveledUp: boolean;
    newLevel: number;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const oldLevel = calculateLevel(Number(user.xp));
    user.xp = BigInt(Number(user.xp) + amount);
    const newLevel = calculateLevel(Number(user.xp));

    await this.userRepository.save(user);
    await invalidateCache(`user:${userId}`);

    const leveledUp = newLevel > oldLevel;
    if (leveledUp) {
      logger.info('User leveled up!', { userId, oldLevel, newLevel, totalXP: Number(user.xp) });
    }

    return { user, leveledUp, newLevel };
  }

  /**
   * Consume energy
   */
  async consumeEnergy(userId: string, amount: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Calculate current energy with regen
    const { currentEnergy, lastEnergyUpdate } = calculateEnergyRegen(
      user.energy,
      user.maxEnergy,
      user.lastEnergyUpdate
    );

    if (currentEnergy < amount) {
      throw ApiError.badRequest('Insufficient energy');
    }

    user.energy = currentEnergy - amount;
    user.lastEnergyUpdate = lastEnergyUpdate;
    await this.userRepository.save(user);
    await invalidateCache(`user:${userId}`);

    return user;
  }

  /**
   * Get skill tree with user progress
   */
  async getSkillTree(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['skills'],
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const unlockedNodeIds = user.skills?.map(s => s.nodeId) || [];
    const level = calculateLevel(Number(user.xp));
    const usedPoints = user.skills?.length || 0;
    const availablePoints = level - usedPoints;

    // Annotate skill tree with user progress
    const annotatedTree = Object.entries(SKILL_TREE).map(([category, skills]) => ({
      category,
      skills: (skills as any[]).map(skill => ({
        ...skill,
        unlocked: unlockedNodeIds.includes(skill.nodeId),
        canUnlock: this.canUnlockSkill(skill, unlockedNodeIds, availablePoints),
        userLevel: user.skills?.find(s => s.nodeId === skill.nodeId)?.level || 0,
      })),
    }));

    return {
      tree: annotatedTree,
      availablePoints,
      totalUnlocked: unlockedNodeIds.length,
    };
  }

  /**
   * Search users by username
   */
  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    return this.userRepository.find({
      where: { username: Like(`%${query}%`) },
      take: limit,
      select: ['id', 'username', 'avatarUrl', 'tier', 'level', 'xp'],
    });
  }

  // Private methods

  private findSkillInTree(nodeId: string): any {
    for (const [category, skills] of Object.entries(SKILL_TREE)) {
      const skill = (skills as any[]).find(s => s.nodeId === nodeId);
      if (skill) {
        return { ...skill, category };
      }
    }
    return null;
  }

  private canUnlockSkill(
    skill: any,
    unlockedNodeIds: string[],
    availablePoints: number
  ): boolean {
    // Already unlocked
    if (unlockedNodeIds.includes(skill.nodeId)) {
      return false;
    }

    // Check skill points
    const cost = skill.cost || 1;
    if (availablePoints < cost) {
      return false;
    }

    // Check prerequisites
    if (skill.prerequisites && skill.prerequisites.length > 0) {
      return skill.prerequisites.every((prereq: string) => unlockedNodeIds.includes(prereq));
    }

    return true;
  }

  // --- STUBS & ALIASES FOR USERCONTROLLER COMPATIBILITY ---

  async getFullProfile(userId: string): Promise<UserStatsResponse> {
    return this.getUserStats(userId);
  }

  async getStats(userId: string): Promise<any> {
    const stats = await this.getUserStats(userId);
    return {
      xp: stats.xp,
      level: stats.level,
      credits: stats.credits,
      streak: stats.streak,
      energy: stats.energy
    };
  }

  async getSkills(userId: string): Promise<any> {
    return this.getSkillTree(userId);
  }

  async getAgents(userId: string): Promise<any[]> {
    // Stub: return empty array for now
    return [];
  }

  async getAchievements(userId: string): Promise<any[]> {
    // Stub: return empty array for now
    return [];
  }

  async refreshEnergy(userId: string): Promise<number> {
    const stats = await this.getUserStats(userId);
    return stats.energy;
  }

  async claimDailyStreak(userId: string): Promise<any> {
    // Stub: return success
    return { success: true, message: 'Streak claimed' };
  }

  async getNotifications(userId: string, unreadOnly: boolean): Promise<any[]> {
    // Stub: return empty array
    return [];
  }

  async requestAccountDeletion(userId: string): Promise<void> {
    logger.info('Account deletion requested', { userId });
  }
}

export const userService = new UserService();

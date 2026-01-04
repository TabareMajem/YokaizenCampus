import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { Squad, SquadRole } from './Squad';
import { Inventory } from './Inventory';
import { Skill } from './Skill';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
}

export enum UserTier {
  FREE = 'FREE',
  OPERATIVE = 'OPERATIVE',
  PRO_CREATOR = 'PRO_CREATOR',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, name: 'firebase_uid' })
  @Index('idx_users_firebase_uid')
  firebaseUid: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true, unique: true })
  @Index('idx_users_username')
  username: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserTier,
    default: UserTier.FREE,
  })
  tier: UserTier;

  @Column({ type: 'int', default: 100 })
  credits: number;

  @Column({ type: 'bigint', default: 0 })
  xp: number;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'int', default: 0 })
  streak: number;

  @Column({ type: 'int', default: 0, name: 'skill_points' })
  skillPoints: number;

  @Column({ type: 'int', default: 100, name: 'max_energy' })
  maxEnergy: number;

  @Column({ type: 'int', default: 100, name: 'current_energy' })
  energy: number;

  @Column({ type: 'timestamp', nullable: true, name: 'energy_last_updated' })
  lastEnergyUpdate: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_login' })
  lastLogin: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_daily_reward' })
  lastDailyReward: Date;

  @Column({ default: 'EN', length: 5 })
  language: string;

  @Column({ nullable: true })
  region: string;

  @Column({ nullable: true, name: 'stripe_customer_id' })
  @Index('idx_users_stripe_customer_id')
  stripeCustomerId: string;

  @Column({ nullable: true, name: 'stripe_subscription_id' })
  stripeSubscriptionId: string;

  @Column({ type: 'timestamp', nullable: true, name: 'subscription_expires_at' })
  subscriptionExpiresAt: Date;

  // Cross-product subscription fields for sharing between Campus and AI Labs
  @Column({ type: 'boolean', default: false, name: 'campus_access' })
  campusAccess: boolean;

  @Column({ type: 'boolean', default: false, name: 'ai_labs_access' })
  aiLabsAccess: boolean;

  @Column({ nullable: true, name: 'subscription_product' })
  subscriptionProduct: string; // 'campus_only' | 'ai_labs_only' | 'campus_plus_labs'

  @Column({ nullable: true, name: 'auth_provider' })
  authProvider: string; // 'phone' | 'google' | 'email'

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    notifications: boolean;
    soundEffects: boolean;
    darkMode: boolean;
    language: string;
    timezone: string;
  };

  @Column({ type: 'jsonb', nullable: true, name: 'api_keys' })
  apiKeys: {
    google?: string;
    openai?: string;
    anthropic?: string;
    deepseek?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  stats: {
    totalGamesPlayed: number;
    totalWins: number;
    totalLosses: number;
    highestScore: number;
    favoriteGame: string;
    totalPlayTime: number;
  };

  @Column({ nullable: true, name: 'squad_id' })
  squadId: string;

  @ManyToOne(() => Squad, squad => squad.members)
  @JoinColumn({ name: 'squad_id' })
  squad: Squad;

  @Column({
    type: 'enum',
    enum: SquadRole,
    nullable: true,
  })
  squadRole: SquadRole;

  @Column({ type: 'int', default: 0, name: 'squad_contributions' })
  squadContributions: number;

  @Column({ type: 'timestamp', nullable: true, name: 'squad_joined_at' })
  squadJoinedAt: Date;

  @OneToMany(() => Inventory, inventory => inventory.user)
  inventory: Inventory[];

  @OneToMany(() => Skill, skill => skill.user)
  skills: Skill[];

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_banned' })
  isBanned: boolean;

  @Column({ type: 'text', nullable: true, name: 'ban_reason' })
  banReason: string;

  @Column({ type: 'int', default: 0, name: 'warning_count' })
  warningCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'int', default: 0, name: 'monthly_tokens_used' })
  monthlyTokensUsed: number;

  @Column({ type: 'int', default: 100000, name: 'monthly_token_quota' })
  monthlyTokenQuota: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_quota_reset' })
  lastQuotaReset: Date;

  // XP to Level calculation
  static calculateLevel(xp: number): number {
    // Level formula: level = floor(sqrt(xp / 100))
    return Math.max(1, Math.floor(Math.sqrt(xp / 100)));
  }

  // XP needed for next level
  static xpForNextLevel(currentLevel: number): number {
    return Math.pow(currentLevel + 1, 2) * 100;
  }

  // Calculate skill points gained per level
  static skillPointsForLevel(level: number): number {
    return level;
  }

  // Energy regeneration (1 energy per 5 minutes)
  calculateEnergy(): number {
    if (!this.lastEnergyUpdate) {
      return this.energy;
    }

    const now = new Date();
    const minutesPassed = Math.floor(
      (now.getTime() - this.lastEnergyUpdate.getTime()) / (1000 * 60)
    );
    const energyGained = Math.floor(minutesPassed / 5);

    return Math.min(this.maxEnergy, this.energy + energyGained);
  }

  // Check if user can perform action requiring energy
  hasEnergy(required: number): boolean {
    return this.calculateEnergy() >= required;
  }

  // Check daily streak
  shouldUpdateStreak(): boolean {
    if (!this.lastLogin) return true;

    const now = new Date();
    const lastLogin = new Date(this.lastLogin);
    const daysDiff = Math.floor(
      (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysDiff === 1;
  }

  // Check if streak is broken
  isStreakBroken(): boolean {
    if (!this.lastLogin) return false;

    const now = new Date();
    const lastLogin = new Date(this.lastLogin);
    const daysDiff = Math.floor(
      (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysDiff > 1;
  }

  // Rate limit tier
  getRateLimitTier(): number {
    switch (this.tier) {
      case UserTier.PRO_CREATOR:
        return 50;
      case UserTier.OPERATIVE:
        return 20;
      default:
        return 5;
    }
  }

  // Check if user has premium features
  isPremium(): boolean {
    return this.tier !== UserTier.FREE;
  }

  // Check if user has Pro features
  isPro(): boolean {
    return this.tier === UserTier.PRO_CREATOR;
  }
}

export default User;

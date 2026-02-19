import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { SquadMission } from './SquadMission';

export enum SquadTier {
  ROOKIE = 'ROOKIE',
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
  ELITE = 'ELITE',
}

export enum SquadRole {
  OWNER = 'OWNER',
  OFFICER = 'OFFICER',
  MEMBER = 'MEMBER',
}

@Entity('squads')
export class Squad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, length: 50 })
  @Index('idx_squads_name')
  name: string;

  @Column({ type: 'varchar', nullable: true, length: 200 })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  icon: string;

  @Column({ type: 'varchar', nullable: true, name: 'banner_url' })
  bannerUrl: string;

  @Column({
    type: 'enum',
    enum: SquadTier,
    default: SquadTier.ROOKIE,
  })
  tier: SquadTier;

  @Column({ type: 'bigint', default: 0, name: 'total_xp' })
  totalXp: number;

  @Column({ type: 'bigint', default: 0, name: 'weekly_xp' })
  weeklyXp: number;

  @Column({ type: 'int', default: 0, name: 'weekly_progress' })
  weeklyProgress: number;

  @Column({ type: 'int', default: 0, name: 'war_wins' })
  warWins: number;

  @Column({ type: 'int', default: 0, name: 'war_losses' })
  warLosses: number;

  @Column({ type: 'int', default: 0, name: 'current_war_streak' })
  currentWarStreak: number;

  @Column({ type: 'int', default: 0, name: 'best_war_streak' })
  bestWarStreak: number;

  @Column({ type: 'uuid', name: 'owner_id' })
  @Index('idx_squads_owner_id')
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => User, user => user.squad)
  members: User[];

  @OneToMany(() => SquadMission, mission => mission.squad)
  missions: SquadMission[];

  @Column({ type: 'int', default: 1, name: 'member_count' })
  memberCount: number;

  @Column({ type: 'int', default: 20, name: 'max_members' })
  maxMembers: number;

  @Column({ type: 'int', default: 0, name: 'treasury' })
  treasury: number;

  @Column({ type: 'boolean', default: false, name: 'is_public' })
  isPublic: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_recruiting' })
  isRecruiting: boolean;

  @Column({ type: 'int', default: 1, name: 'min_level_requirement' })
  minLevelRequirement: number;

  @Column({ type: 'jsonb', nullable: true })
  perks: {
    xpBoost: number;
    creditBoost: number;
    energyBoost: number;
    bonusSlots: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    autoAcceptMembers: boolean;
    requireApproval: boolean;
    chatEnabled: boolean;
    missionNotifications: boolean;
  };

  @Column({ type: 'simple-array', nullable: true, name: 'officer_ids' })
  officerIds: string[];

  // RAID BOSS PERSISTENCE
  @Column({ type: 'int', default: 1000000, name: 'boss_hp' })
  bossHp: number;

  @Column({ type: 'int', default: 1000000, name: 'max_boss_hp' })
  maxBossHp: number;

  @Column({ type: 'int', default: 1, name: 'boss_level' })
  bossLevel: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_mission_at' })
  lastMissionAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'weekly_reset_at' })
  weeklyResetAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Calculate squad tier based on total XP
  static calculateTier(totalXp: number): SquadTier {
    if (totalXp >= 1000000) return SquadTier.ELITE;
    if (totalXp >= 500000) return SquadTier.DIAMOND;
    if (totalXp >= 250000) return SquadTier.PLATINUM;
    if (totalXp >= 100000) return SquadTier.GOLD;
    if (totalXp >= 50000) return SquadTier.SILVER;
    if (totalXp >= 10000) return SquadTier.BRONZE;
    return SquadTier.ROOKIE;
  }

  // Calculate max members based on tier
  static maxMembersForTier(tier: SquadTier): number {
    switch (tier) {
      case SquadTier.ELITE:
        return 100;
      case SquadTier.DIAMOND:
        return 75;
      case SquadTier.PLATINUM:
        return 50;
      case SquadTier.GOLD:
        return 40;
      case SquadTier.SILVER:
        return 30;
      case SquadTier.BRONZE:
        return 25;
      default:
        return 20;
    }
  }

  // Calculate perks based on tier
  static perksForTier(tier: SquadTier): {
    xpBoost: number;
    creditBoost: number;
    energyBoost: number;
    bonusSlots: number;
  } {
    switch (tier) {
      case SquadTier.ELITE:
        return { xpBoost: 25, creditBoost: 25, energyBoost: 25, bonusSlots: 5 };
      case SquadTier.DIAMOND:
        return { xpBoost: 20, creditBoost: 20, energyBoost: 20, bonusSlots: 4 };
      case SquadTier.PLATINUM:
        return { xpBoost: 15, creditBoost: 15, energyBoost: 15, bonusSlots: 3 };
      case SquadTier.GOLD:
        return { xpBoost: 10, creditBoost: 10, energyBoost: 10, bonusSlots: 2 };
      case SquadTier.SILVER:
        return { xpBoost: 7, creditBoost: 7, energyBoost: 7, bonusSlots: 1 };
      case SquadTier.BRONZE:
        return { xpBoost: 5, creditBoost: 5, energyBoost: 5, bonusSlots: 0 };
      default:
        return { xpBoost: 0, creditBoost: 0, energyBoost: 0, bonusSlots: 0 };
    }
  }

  // Check if user is owner
  isOwner(userId: string): boolean {
    return this.ownerId === userId;
  }

  // Check if user is officer
  isOfficer(userId: string): boolean {
    return this.officerIds?.includes(userId) || this.isOwner(userId);
  }

  // Check if squad can accept new members
  canAcceptMembers(): boolean {
    return this.memberCount < this.maxMembers;
  }

  // Calculate war rating
  getWarRating(): number {
    const total = this.warWins + this.warLosses;
    if (total === 0) return 1000;
    return 1000 + (this.warWins - this.warLosses) * 20;
  }
}

export default Squad;

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MissionType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  SPECIAL = 'SPECIAL',
  WAR = 'WAR',
  RAID = 'RAID',
  CHALLENGE = 'CHALLENGE',
}

export enum MissionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

@Entity('squad_missions')
export class SquadMission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'squad_id' })
  @Index('idx_squad_missions_squad_id')
  squadId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: MissionType,
    default: MissionType.DAILY,
  })
  type: MissionType;

  @Column({
    type: 'enum',
    enum: MissionStatus,
    default: MissionStatus.PENDING,
  })
  status: MissionStatus;

  @Column({ type: 'jsonb' })
  objectives: Array<{
    id: string;
    description: string;
    targetType: 'games_played' | 'total_score' | 'members_active' | 'xp_earned' | 'custom';
    targetValue: number;
    currentValue: number;
    completed: boolean;
  }>;

  @Column({ type: 'int', default: 0, name: 'xp_reward' })
  xpReward: number;

  @Column({ type: 'int', default: 0, name: 'credit_reward' })
  creditReward: number;

  @Column({ type: 'jsonb', nullable: true, name: 'bonus_rewards' })
  bonusRewards: {
    items?: Array<{
      itemId: string;
      quantity: number;
    }>;
    badges?: string[];
    unlocks?: string[];
  };

  @Column({ type: 'uuid', nullable: true, name: 'initiated_by' })
  initiatedBy: string;

  @Column({ type: 'simple-array', nullable: true, name: 'participant_ids' })
  participantIds: string[];

  @Column({ type: 'jsonb', nullable: true, name: 'participant_contributions' })
  participantContributions: Record<
    string,
    {
      xpContributed: number;
      gamesPlayed: number;
      score: number;
    }
  >;

  @Column({ type: 'int', default: 1, name: 'min_participants' })
  minParticipants: number;

  @Column({ type: 'int', nullable: true, name: 'max_participants' })
  maxParticipants: number;

  @Column({ type: 'int', default: 0, name: 'difficulty_level' })
  difficultyLevel: number;

  @Column({ type: 'float', default: 0 })
  progress: number;

  @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'uuid', nullable: true, name: 'opponent_squad_id' })
  @Index('idx_squad_missions_opponent')
  opponentSquadId: string;

  @Column({ type: 'int', default: 0, name: 'our_score' })
  ourScore: number;

  @Column({ type: 'int', default: 0, name: 'opponent_score' })
  opponentScore: number;

  @Column({ type: 'boolean', default: false, name: 'is_victory' })
  isVictory: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Calculate overall progress
  calculateProgress(): number {
    if (!this.objectives || this.objectives.length === 0) return 0;

    const totalProgress = this.objectives.reduce((sum, obj) => {
      const objProgress = Math.min(100, (obj.currentValue / obj.targetValue) * 100);
      return sum + objProgress;
    }, 0);

    return totalProgress / this.objectives.length;
  }

  // Check if all objectives are complete
  isComplete(): boolean {
    return this.objectives.every((obj) => obj.completed);
  }

  // Check if mission is expired
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  // Check if mission can be joined
  canJoin(userId: string): boolean {
    if (this.status !== MissionStatus.PENDING && this.status !== MissionStatus.ACTIVE) {
      return false;
    }
    if (this.participantIds?.includes(userId)) {
      return false;
    }
    if (this.maxParticipants && this.participantIds?.length >= this.maxParticipants) {
      return false;
    }
    return true;
  }

  // Check if mission can start
  canStart(): boolean {
    return (
      this.status === MissionStatus.PENDING &&
      (this.participantIds?.length || 0) >= this.minParticipants
    );
  }

  // Calculate reward multiplier based on participation
  getRewardMultiplier(userId: string): number {
    const contributions = this.participantContributions?.[userId];
    if (!contributions) return 0;

    const totalContributions = Object.values(this.participantContributions || {}).reduce(
      (sum, c) => sum + c.xpContributed,
      0
    );

    if (totalContributions === 0) return 1 / (this.participantIds?.length || 1);

    return contributions.xpContributed / totalContributions;
  }

  // Get time remaining
  getTimeRemaining(): number {
    if (!this.expiresAt) return Infinity;
    return Math.max(0, this.expiresAt.getTime() - Date.now());
  }
}

export default SquadMission;

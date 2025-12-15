import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum GameType {
  BRAIN_BOOST = 'BRAIN_BOOST',
  MEMORY_MATRIX = 'MEMORY_MATRIX',
  WORD_WEAVER = 'WORD_WEAVER',
  PATTERN_PULSE = 'PATTERN_PULSE',
  EMOTION_QUEST = 'EMOTION_QUEST',
  ANXIETY_ARENA = 'ANXIETY_ARENA',
  CONFIDENCE_CLIMB = 'CONFIDENCE_CLIMB',
  SOCIAL_SIM = 'SOCIAL_SIM',
  CUSTOM_QUEST = 'CUSTOM_QUEST',
  AI_CHALLENGE = 'AI_CHALLENGE',
  SQUAD_WAR = 'SQUAD_WAR',
  DAILY_CHALLENGE = 'DAILY_CHALLENGE',
  WEEKLY_TOURNAMENT = 'WEEKLY_TOURNAMENT',
  QUICK_FIRE = 'QUICK_FIRE',
  DEEP_DIVE = 'DEEP_DIVE',
  CHALLENGE = 'CHALLENGE',
  CREATIVE = 'CREATIVE',
  SQUAD_MISSION = 'SQUAD_MISSION',
  AI_GENERATED = 'AI_GENERATED',
}

export enum GameDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  EXTREME = 'EXTREME',
  ADAPTIVE = 'ADAPTIVE',
}

export enum GameResult {
  WIN = 'WIN',
  LOSS = 'LOSS',
  DRAW = 'DRAW',
  TIMEOUT = 'TIMEOUT',
  ABANDONED = 'ABANDONED',
}

@Entity('game_history')
export class GameHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index('idx_game_history_user_id')
  userId: string;

  @Column({
    type: 'enum',
    enum: GameType,
    name: 'game_type',
  })
  @Index('idx_game_history_game_type')
  gameType: GameType;

  @Column({ nullable: true, name: 'custom_game_id' })
  customGameId: string;

  @Column({
    type: 'enum',
    enum: GameDifficulty,
    default: GameDifficulty.MEDIUM,
  })
  difficulty: GameDifficulty;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'int', nullable: true, name: 'high_score' })
  highScore: number;

  @Column({
    type: 'enum',
    enum: GameResult,
    default: GameResult.WIN,
  })
  result: GameResult;

  @Column({ type: 'int', default: 0, name: 'xp_earned' })
  xpEarned: number;

  @Column({ type: 'int', default: 0, name: 'credits_earned' })
  creditsEarned: number;

  @Column({ type: 'int', default: 0, name: 'duration_seconds' })
  durationSeconds: number;

  @Column({ type: 'int', default: 1, name: 'moves_count' })
  movesCount: number;

  @Column({ type: 'float', nullable: true })
  accuracy: number;

  @Column({ type: 'int', default: 0 })
  combo: number;

  @Column({ type: 'int', default: 0, name: 'max_combo' })
  maxCombo: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    moves?: Array<{ action: string; timestamp: number; data?: unknown }>;
    answers?: Array<{ question: string; answer: string; correct: boolean }>;
    powerUpsUsed?: string[];
    achievements?: string[];
    feedback?: { rating: number; comment?: string };
    sessionData?: Record<string, unknown>;
  };

  @Column({ type: 'jsonb', nullable: true, name: 'performance_metrics' })
  performanceMetrics: {
    reactionTime?: number;
    consistencyScore?: number;
    improvementRate?: number;
    difficultyAdjustment?: number;
  };

  @Column({ type: 'uuid', nullable: true, name: 'squad_id' })
  squadId: string;

  @Column({ type: 'boolean', default: false, name: 'is_practice' })
  isPractice: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_ranked' })
  isRanked: boolean;

  @Column({ nullable: true, name: 'session_token' })
  sessionToken: string;

  @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @CreateDateColumn({ name: 'played_at' })
  playedAt: Date;

  // XP calculation based on game parameters
  static calculateXp(
    score: number,
    difficulty: GameDifficulty,
    combo: number,
    accuracy: number | null
  ): number {
    const baseXp = Math.floor(score / 10);

    let difficultyMultiplier = 1;
    switch (difficulty) {
      case GameDifficulty.EASY:
        difficultyMultiplier = 0.5;
        break;
      case GameDifficulty.MEDIUM:
        difficultyMultiplier = 1;
        break;
      case GameDifficulty.HARD:
        difficultyMultiplier = 1.5;
        break;
      case GameDifficulty.EXTREME:
        difficultyMultiplier = 2;
        break;
      default:
        difficultyMultiplier = 1;
    }

    const comboBonus = Math.floor(combo * 0.1);
    const accuracyBonus = accuracy ? Math.floor(accuracy * 0.5) : 0;

    return Math.floor(baseXp * difficultyMultiplier + comboBonus + accuracyBonus);
  }

  // Credits calculation
  static calculateCredits(
    score: number,
    difficulty: GameDifficulty,
    isFirstTime: boolean
  ): number {
    let baseCredits = Math.floor(score / 100);

    switch (difficulty) {
      case GameDifficulty.HARD:
        baseCredits *= 1.25;
        break;
      case GameDifficulty.EXTREME:
        baseCredits *= 1.5;
        break;
    }

    if (isFirstTime) {
      baseCredits *= 2;
    }

    return Math.floor(baseCredits);
  }

  // Anti-cheat: Validate game duration
  isValidDuration(expectedMinSeconds: number, expectedMaxSeconds: number): boolean {
    return (
      this.durationSeconds >= expectedMinSeconds &&
      this.durationSeconds <= expectedMaxSeconds
    );
  }

  // Anti-cheat: Validate score for difficulty
  isValidScore(maxPossibleScore: number): boolean {
    return this.score >= 0 && this.score <= maxPossibleScore;
  }
}

export default GameHistory;

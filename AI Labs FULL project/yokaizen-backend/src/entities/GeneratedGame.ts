import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum GeneratedGameType {
  QUIZ = 'QUIZ',
  STORY = 'STORY',
  PUZZLE = 'PUZZLE',
  SIMULATION = 'SIMULATION',
  CHOICE_BASED = 'CHOICE_BASED',
  MINI_GAME = 'MINI_GAME',
  THERAPEUTIC = 'THERAPEUTIC',
}

export enum GameStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  FLAGGED = 'FLAGGED',
}

export interface GameScene {
  id: string;
  type: 'intro' | 'dialogue' | 'choice' | 'quiz' | 'action' | 'outcome' | 'end';
  title?: string;
  content: string;
  characterName?: string;
  characterAvatar?: string;
  backgroundImage?: string;
  music?: string;
  choices?: Array<{
    id: string;
    text: string;
    nextSceneId: string;
    effect?: {
      stat: string;
      value: number;
    };
  }>;
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  };
  action?: {
    type: string;
    data: Record<string, unknown>;
  };
  timer?: number;
  xpReward?: number;
  creditReward?: number;
  nextSceneId?: string;
  conditions?: Array<{
    stat: string;
    operator: '>' | '<' | '==' | '>=' | '<=';
    value: number;
    nextSceneId: string;
  }>;
}

@Entity('generated_games')
export class GeneratedGame {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'creator_id' })
  @Index('idx_generated_games_creator_id')
  creatorId: string;

  @Column({ length: 200 })
  @Index('idx_generated_games_title')
  title: string;

  @Column({ nullable: true, length: 1000 })
  description: string;

  @Column({ type: 'text', name: 'intro_text' })
  introText: string;

  @Column({ nullable: true, name: 'cover_image' })
  coverImage: string;

  @Column({
    type: 'enum',
    enum: GeneratedGameType,
    default: GeneratedGameType.CHOICE_BASED,
    name: 'game_type',
  })
  gameType: GeneratedGameType;

  @Column({
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.DRAFT,
  })
  status: GameStatus;

  @Column({ type: 'jsonb', name: 'scenes_json' })
  scenesJson: GameScene[];

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ nullable: true })
  topic: string;

  @Column({ type: 'int', default: 0, name: 'plays_count' })
  playsCount: number;

  @Column({ type: 'int', default: 0, name: 'completions_count' })
  completionsCount: number;

  @Column({ type: 'int', default: 0, name: 'likes_count' })
  likesCount: number;

  @Column({ type: 'float', default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0, name: 'rating_count' })
  ratingCount: number;

  @Column({ type: 'int', default: 0, name: 'fork_count' })
  forkCount: number;

  @Column({ type: 'uuid', nullable: true, name: 'forked_from' })
  forkedFrom: string;

  @Column({ type: 'int', default: 5, name: 'estimated_duration' })
  estimatedDuration: number; // in minutes

  @Column({ type: 'int', default: 0, name: 'total_xp_reward' })
  totalXpReward: number;

  @Column({ type: 'int', default: 0, name: 'total_credit_reward' })
  totalCreditReward: number;

  @Column({ type: 'boolean', default: false, name: 'is_public' })
  @Index('idx_generated_games_is_public')
  isPublic: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_featured' })
  isFeatured: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_premium' })
  isPremium: boolean;

  @Column({ type: 'jsonb', nullable: true })
  config: {
    allowRetry?: boolean;
    showHints?: boolean;
    adaptiveDifficulty?: boolean;
    trackStats?: boolean;
    requiredLevel?: number;
  };

  @Column({ type: 'jsonb', nullable: true, name: 'game_stats' })
  gameStats: {
    stats: Array<{
      id: string;
      name: string;
      initial: number;
      min: number;
      max: number;
    }>;
  };

  @Column({ type: 'jsonb', nullable: true })
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    condition: {
      type: 'complete' | 'score' | 'time' | 'choice';
      value: number | string;
    };
    reward?: {
      xp?: number;
      credits?: number;
      badge?: string;
    };
  }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Check if user is creator
  isCreator(userId: string): boolean {
    return this.creatorId === userId;
  }

  // Check if game can be played
  canBePlayed(userId: string): boolean {
    if (this.isCreator(userId)) return true;
    return this.status === GameStatus.PUBLISHED && this.isPublic;
  }

  // Get scene by ID
  getScene(sceneId: string): GameScene | undefined {
    return this.scenesJson.find((scene) => scene.id === sceneId);
  }

  // Get first scene
  getFirstScene(): GameScene | undefined {
    return this.scenesJson[0];
  }

  // Calculate completion rate
  getCompletionRate(): number {
    if (this.playsCount === 0) return 0;
    return (this.completionsCount / this.playsCount) * 100;
  }

  // Get average rating
  getAverageRating(): number {
    return this.ratingCount > 0 ? this.rating / this.ratingCount : 0;
  }

  // Validate scenes structure
  validateScenes(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const sceneIds = new Set(this.scenesJson.map((s) => s.id));

    for (const scene of this.scenesJson) {
      // Check next scene references
      if (scene.nextSceneId && !sceneIds.has(scene.nextSceneId)) {
        errors.push(`Scene ${scene.id} references non-existent scene ${scene.nextSceneId}`);
      }

      // Check choice references
      if (scene.choices) {
        for (const choice of scene.choices) {
          if (!sceneIds.has(choice.nextSceneId)) {
            errors.push(
              `Scene ${scene.id} choice "${choice.text}" references non-existent scene ${choice.nextSceneId}`
            );
          }
        }
      }

      // Check conditions
      if (scene.conditions) {
        for (const condition of scene.conditions) {
          if (!sceneIds.has(condition.nextSceneId)) {
            errors.push(
              `Scene ${scene.id} condition references non-existent scene ${condition.nextSceneId}`
            );
          }
        }
      }
    }

    // Check for end scene
    const hasEndScene = this.scenesJson.some((s) => s.type === 'end');
    if (!hasEndScene) {
      errors.push('Game must have at least one end scene');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default GeneratedGame;

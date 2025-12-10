import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AgentModel {
  GEMINI_PRO = 'GEMINI_PRO',
  GEMINI_FLASH = 'GEMINI_FLASH',
  GPT4 = 'GPT4',
  DEEPSEEK = 'DEEPSEEK',
}

export enum AgentCategory {
  COACH = 'COACH',
  COMPANION = 'COMPANION',
  TUTOR = 'TUTOR',
  THERAPIST = 'THERAPIST',
  MENTOR = 'MENTOR',
  ASSISTANT = 'ASSISTANT',
  CREATIVE = 'CREATIVE',
  GAMING = 'GAMING',
  CUSTOM = 'CUSTOM',
}

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'creator_id' })
  @Index('idx_agents_creator_id')
  creatorId: string;

  @Column({ length: 100 })
  @Index('idx_agents_name')
  name: string;

  @Column({ nullable: true, length: 500 })
  description: string;

  @Column({ nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  @Column({ type: 'text' })
  persona: string;

  @Column({ type: 'text', name: 'system_instruction' })
  systemInstruction: string;

  @Column({
    type: 'enum',
    enum: AgentModel,
    default: AgentModel.GEMINI_FLASH,
    name: 'model_pref',
  })
  modelPref: AgentModel;

  @Column({
    type: 'enum',
    enum: AgentCategory,
    default: AgentCategory.CUSTOM,
  })
  category: AgentCategory;

  @Column({ nullable: true, name: 'knowledge_base_url' })
  knowledgeBaseUrl: string;

  @Column({ type: 'boolean', default: false, name: 'has_knowledge_base' })
  hasKnowledgeBase: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_public' })
  @Index('idx_agents_is_public')
  isPublic: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'int', default: 0, name: 'total_conversations' })
  totalConversations: number;

  @Column({ type: 'int', default: 0, name: 'total_messages' })
  totalMessages: number;

  @Column({ type: 'float', default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0, name: 'rating_count' })
  ratingCount: number;

  @Column({ type: 'int', default: 0, name: 'fork_count' })
  forkCount: number;

  @Column({ type: 'uuid', nullable: true, name: 'forked_from' })
  forkedFrom: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  config: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
    safetySettings?: {
      category: string;
      threshold: string;
    }[];
  };

  @Column({ type: 'jsonb', nullable: true })
  capabilities: {
    canGenerateImages?: boolean;
    canSearchWeb?: boolean;
    canUseTools?: boolean;
    canAccessKnowledge?: boolean;
    canPlayGames?: boolean;
    customTools?: string[];
  };

  @Column({ type: 'jsonb', nullable: true, name: 'voice_settings' })
  voiceSettings: {
    voiceId?: string;
    pitch?: number;
    speed?: number;
    language?: string;
  };

  @Column({ type: 'jsonb', nullable: true, name: 'conversation_starters' })
  conversationStarters: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Get full system prompt
  getFullSystemPrompt(): string {
    return `${this.persona}\n\n${this.systemInstruction}`;
  }

  // Calculate average rating
  getAverageRating(): number {
    return this.ratingCount > 0 ? this.rating / this.ratingCount : 0;
  }

  // Check if user is creator
  isCreator(userId: string): boolean {
    return this.creatorId === userId;
  }

  // Check if agent can be used
  canBeUsed(userId: string): boolean {
    return this.isActive && (this.isPublic || this.isCreator(userId));
  }

  // Get model config for API calls
  getModelConfig(): {
    model: string;
    temperature: number;
    maxTokens: number;
  } {
    return {
      model: this.getModelString(),
      temperature: this.config?.temperature ?? 0.7,
      maxTokens: this.config?.maxTokens ?? 2048,
    };
  }

  // Get model string for API
  private getModelString(): string {
    switch (this.modelPref) {
      case AgentModel.GEMINI_PRO:
        return 'gemini-1.5-pro';
      case AgentModel.GEMINI_FLASH:
        return 'gemini-1.5-flash';
      case AgentModel.GPT4:
        return 'gpt-4-turbo-preview';
      case AgentModel.DEEPSEEK:
        return 'deepseek-chat';
      default:
        return 'gemini-1.5-flash';
    }
  }
}

export default Agent;

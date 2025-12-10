import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum SkillCategory {
  COGNITIVE = 'COGNITIVE',
  CREATIVE = 'CREATIVE',
  SOCIAL = 'SOCIAL',
  TECHNICAL = 'TECHNICAL',
  LEADERSHIP = 'LEADERSHIP',
  WELLNESS = 'WELLNESS',
}

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index('idx_skills_user_id')
  userId: string;

  @Column({ name: 'skill_tree_node_id' })
  @Index('idx_skills_node_id')
  skillTreeNodeId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true, length: 500 })
  description: string;

  @Column({
    type: 'enum',
    enum: SkillCategory,
  })
  category: SkillCategory;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'int', default: 5, name: 'max_level' })
  maxLevel: number;

  @Column({ type: 'int', default: 0, name: 'current_progress' })
  currentProgress: number;

  @Column({ type: 'int', default: 100, name: 'progress_required' })
  progressRequired: number;

  @Column({ type: 'int', default: 1, name: 'unlock_cost' })
  unlockCost: number;

  @Column({ type: 'simple-array', nullable: true, name: 'prerequisite_nodes' })
  prerequisiteNodes: string[];

  @Column({ type: 'jsonb', nullable: true })
  bonuses: {
    xpBoost?: number;
    creditBoost?: number;
    energyRegen?: number;
    cooldownReduction?: number;
    specialAbility?: string;
  };

  @Column({ type: 'boolean', default: false, name: 'is_mastered' })
  isMastered: boolean;

  @CreateDateColumn({ name: 'unlocked_at' })
  unlockedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'mastered_at' })
  masteredAt: Date;

  // Calculate progress percentage
  getProgressPercentage(): number {
    return Math.min(100, (this.currentProgress / this.progressRequired) * 100);
  }

  // Check if can level up
  canLevelUp(): boolean {
    return this.currentProgress >= this.progressRequired && this.level < this.maxLevel;
  }

  // Calculate XP required for next level
  static xpRequiredForLevel(currentLevel: number): number {
    return Math.floor(100 * Math.pow(1.5, currentLevel - 1));
  }
}

// Predefined skill tree structure
export const SkillTree = {
  COGNITIVE: [
    {
      nodeId: 'cog_focus_1',
      name: 'Enhanced Focus',
      description: 'Improve concentration and task completion',
      category: SkillCategory.COGNITIVE,
      cost: 1,
      bonuses: { xpBoost: 5 },
      prerequisites: [],
    },
    {
      nodeId: 'cog_memory_1',
      name: 'Memory Palace',
      description: 'Better retention and recall',
      category: SkillCategory.COGNITIVE,
      cost: 2,
      bonuses: { xpBoost: 10 },
      prerequisites: ['cog_focus_1'],
    },
    {
      nodeId: 'cog_analysis_1',
      name: 'Critical Analysis',
      description: 'Enhanced problem-solving abilities',
      category: SkillCategory.COGNITIVE,
      cost: 3,
      bonuses: { xpBoost: 15, specialAbility: 'hint_master' },
      prerequisites: ['cog_memory_1'],
    },
  ],
  CREATIVE: [
    {
      nodeId: 'cre_imagination_1',
      name: 'Creative Spark',
      description: 'Unlock creative thinking patterns',
      category: SkillCategory.CREATIVE,
      cost: 1,
      bonuses: { creditBoost: 5 },
      prerequisites: [],
    },
    {
      nodeId: 'cre_innovation_1',
      name: 'Innovation Engine',
      description: 'Generate unique solutions',
      category: SkillCategory.CREATIVE,
      cost: 2,
      bonuses: { creditBoost: 10 },
      prerequisites: ['cre_imagination_1'],
    },
  ],
  SOCIAL: [
    {
      nodeId: 'soc_empathy_1',
      name: 'Empathic Connection',
      description: 'Better understand others',
      category: SkillCategory.SOCIAL,
      cost: 1,
      bonuses: { xpBoost: 3, creditBoost: 3 },
      prerequisites: [],
    },
    {
      nodeId: 'soc_leadership_1',
      name: 'Natural Leader',
      description: 'Inspire and guide your squad',
      category: SkillCategory.SOCIAL,
      cost: 3,
      bonuses: { specialAbility: 'squad_rally' },
      prerequisites: ['soc_empathy_1'],
    },
  ],
  WELLNESS: [
    {
      nodeId: 'wel_resilience_1',
      name: 'Mental Resilience',
      description: 'Bounce back stronger from setbacks',
      category: SkillCategory.WELLNESS,
      cost: 1,
      bonuses: { energyRegen: 5 },
      prerequisites: [],
    },
    {
      nodeId: 'wel_balance_1',
      name: 'Life Balance',
      description: 'Maintain equilibrium in challenges',
      category: SkillCategory.WELLNESS,
      cost: 2,
      bonuses: { energyRegen: 10, cooldownReduction: 10 },
      prerequisites: ['wel_resilience_1'],
    },
  ],
};

export default Skill;

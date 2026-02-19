import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToMany,
} from 'typeorm';
import { Agent } from './Agent';

export enum SkillCategory {
    SEARCH = 'SEARCH',
    PRODUCTIVITY = 'PRODUCTIVITY',
    COMMUNICATION = 'COMMUNICATION',
    DATA = 'DATA',
    CREATIVE = 'CREATIVE',
    UTILITY = 'UTILITY',
}

@Entity('agent_skills')
export class AgentSkill {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    @Index('idx_skills_name')
    name: string;

    @Column({ unique: true })
    @Index('idx_skills_key')
    key: string; // e.g. "web_search", "send_email"

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    icon: string;

    @Column({
        type: 'enum',
        enum: SkillCategory,
        default: SkillCategory.UTILITY,
    })
    category: SkillCategory;

    @Column({ type: 'jsonb', nullable: true })
    parameters: {
        name: string;
        type: string;
        description: string;
        required: boolean;
    }[];

    @Column({ type: 'boolean', default: true })
    isEnabled: boolean;

    @Column({ type: 'boolean', default: false })
    isPremium: boolean;

    @ManyToMany(() => Agent, (agent) => agent.skills)
    agents: Agent[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

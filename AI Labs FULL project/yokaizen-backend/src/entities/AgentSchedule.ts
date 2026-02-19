import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Agent } from './Agent';

@Entity('agent_schedules')
export class AgentSchedule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'agent_id' })
    @Index('idx_schedules_agent_id')
    agentId: string;

    @Column({ type: 'varchar', length: 100, name: 'cron_expression' })
    cronExpression: string;

    @Column({ type: 'varchar', length: 255 })
    description: string;

    @Column({ type: 'boolean', default: true, name: 'is_active' })
    isActive: boolean;

    @Column({ type: 'jsonb', nullable: true })
    input: any; // The prompt or input to send to the agent

    @ManyToOne(() => Agent, (agent) => agent.schedules)
    @JoinColumn({ name: 'agent_id' })
    agent: Agent;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

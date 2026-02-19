import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Agent } from './Agent';

export enum TaskType {
    SCHEDULED = 'SCHEDULED', // Cron-based
    TRIGGERED = 'TRIGGERED', // Event-based
    MANUAL = 'MANUAL', // User-invoked
    REACTIVE = 'REACTIVE', // Agent decision
}

export enum TaskStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
}

@Entity('agent_tasks')
export class AgentTask {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'agent_id' })
    @Index('idx_tasks_agent_id')
    agentId: string;

    @Column({
        type: 'enum',
        enum: TaskType,
        default: TaskType.MANUAL,
    })
    type: TaskType;

    @Column({
        type: 'enum',
        enum: TaskStatus,
        default: TaskStatus.PENDING,
    })
    @Index('idx_tasks_status')
    status: TaskStatus;

    @Column({ nullable: true })
    name: string; // Brief description of what this task is doing

    @Column({ type: 'jsonb', nullable: true })
    input: any; // Prompt or triggering data

    @Column({ type: 'jsonb', nullable: true })
    output: any; // Result of the task

    @Column({ type: 'text', nullable: true })
    error: string;

    @Column({ type: 'int', default: 0, name: 'execution_time_ms' })
    executionTimeMs: number;

    @Column({ type: 'timestamp', nullable: true, name: 'scheduled_at' })
    scheduledAt: Date;

    @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
    startedAt: Date;

    @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
    completedAt: Date;

    @ManyToOne(() => Agent, (agent) => agent.tasks)
    @JoinColumn({ name: 'agent_id' })
    agent: Agent;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

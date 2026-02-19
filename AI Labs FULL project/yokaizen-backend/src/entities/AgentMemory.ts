import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
    UpdateDateColumn
} from 'typeorm';
import { Agent } from './Agent';

export enum MemoryType {
    EPHEMERAL = 'EPHEMERAL', // Short-term context
    SEMANTIC = 'SEMANTIC', // Vector search knowledge
    EPISODIC = 'EPISODIC', // Past interactions/events
    PROCEDURAL = 'PROCEDURAL', // How-to knowledge
}

@Entity('agent_memories')
export class AgentMemory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'agent_id' })
    @Index('idx_memories_agent_id')
    agentId: string;

    @Column({
        type: 'enum',
        enum: MemoryType,
        default: MemoryType.EPISODIC,
    })
    type: MemoryType;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: any; // Source, confidence, original query

    @Column({ type: 'simple-array', nullable: true })
    keywords: string[];

    // Note: For real vector search, we'd use pgvector column type 'vector'
    // using "type: 'float', array: true" as a fallback or actual implementation depending on DB setup
    @Column({ type: 'jsonb', nullable: true })
    embedding: number[];

    @ManyToOne(() => Agent, (agent) => agent.memories)
    @JoinColumn({ name: 'agent_id' })
    agent: Agent;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

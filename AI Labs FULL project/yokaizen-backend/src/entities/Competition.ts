import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum CompetitionStatus {
    UPCOMING = 'UPCOMING',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

@Entity('competitions')
export class Competition {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 150 })
    @Index('idx_competitions_title')
    title: string;

    @Column({ length: 1000, nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: CompetitionStatus,
        default: CompetitionStatus.UPCOMING,
    })
    @Index('idx_competitions_status')
    status: CompetitionStatus;

    @Column({ type: 'timestamp', name: 'start_date' })
    startDate: Date;

    @Column({ type: 'timestamp', name: 'end_date' })
    endDate: Date;

    @Column({ length: 255, nullable: true })
    prize: string;

    @Column({ type: 'int', default: 1, name: 'min_level' })
    minLevel: number;

    @Column({ type: 'int', default: 0 })
    participants: number;

    @Column({ nullable: true, name: 'image_url' })
    imageUrl: string;

    @Column({ type: 'jsonb', nullable: true })
    tasks: string[];

    @Column({ type: 'jsonb', nullable: true, name: 'game_types' })
    gameTypes: string[];

    @Column({ type: 'jsonb', nullable: true, name: 'leaderboard' })
    leaderboard: { userId: string; username: string; score: number }[];

    @Column({ type: 'boolean', default: true, name: 'is_active' })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Calculate time left
    getTimeLeft(): string {
        const now = new Date();
        const end = new Date(this.endDate);
        const diff = end.getTime() - now.getTime();

        if (diff <= 0) return 'Ended';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        return `${hours}h`;
    }
}

export default Competition;

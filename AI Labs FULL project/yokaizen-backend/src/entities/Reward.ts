import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum RewardType {
    BADGE = 'BADGE',
    SKIN = 'SKIN',
    CONSUMABLE = 'CONSUMABLE',
    REAL_PRIZE = 'REAL_PRIZE',
    CREDITS = 'CREDITS',
}

export enum RewardRarity {
    COMMON = 'COMMON',
    UNCOMMON = 'UNCOMMON',
    RARE = 'RARE',
    EPIC = 'EPIC',
    LEGENDARY = 'LEGENDARY',
    MYTHIC = 'MYTHIC',
}

@Entity('rewards')
export class Reward {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 100 })
    @Index('idx_rewards_name')
    name: string;

    @Column({ length: 500, nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: RewardType,
    })
    type: RewardType;

    @Column({
        type: 'enum',
        enum: RewardRarity,
        default: RewardRarity.COMMON,
    })
    rarity: RewardRarity;

    @Column({ nullable: true })
    icon: string;

    @Column({ nullable: true, name: 'image_url' })
    imageUrl: string;

    @Column({ type: 'int', nullable: true })
    cost: number;

    @Column({ type: 'int', nullable: true })
    stock: number;

    @Column({ nullable: true })
    code: string;

    @Column({ nullable: true })
    link: string;

    @Column({ nullable: true, length: 255 })
    criteria: string;

    @Column({ type: 'boolean', default: true, name: 'is_active' })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

export default Reward;

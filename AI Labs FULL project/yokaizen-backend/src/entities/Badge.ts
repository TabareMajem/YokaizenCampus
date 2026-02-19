
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class Badge {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ unique: true })
    slug: string; // e.g. "rank_gold"

    @Column()
    name: string;

    @Column()
    description: string;

    @Column()
    icon: string; // e.g. "badge_rank_gold.png"

    @Column({ type: "enum", enum: ["COMMON", "RARE", "EPIC", "LEGENDARY"], default: "COMMON" })
    rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

    @Column({ default: 0 })
    xpReward: number;

    // Condition logic can be stored as JSON or simplified string
    // For now, we'll keep logic in code/service but store metadata here
    @Column({ type: "simple-json", nullable: true })
    condition: any;

    @ManyToMany(() => User, (user) => user.badges)
    users: User[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

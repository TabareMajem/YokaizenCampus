import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export enum ItemType {
  BADGE = 'BADGE',
  SKIN = 'SKIN',
  TOOL = 'TOOL',
  AVATAR_FRAME = 'AVATAR_FRAME',
  BOOST = 'BOOST',
  EMOTE = 'EMOTE',
  TITLE = 'TITLE',
  BACKGROUND = 'BACKGROUND',
}

export enum ItemRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
  MYTHIC = 'MYTHIC',
}

@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index('idx_inventory_user_id')
  userId: string;

  @Column({ name: 'item_id' })
  @Index('idx_inventory_item_id')
  itemId: string;

  @Column({
    type: 'enum',
    enum: ItemType,
  })
  type: ItemType;

  @Column({
    type: 'enum',
    enum: ItemRarity,
    default: ItemRarity.COMMON,
  })
  rarity: ItemRarity;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true, length: 500 })
  description: string;

  @Column({ nullable: true, name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'boolean', default: false, name: 'is_equipped' })
  isEquipped: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_tradeable' })
  isTradeable: boolean;

  @Column({ type: 'jsonb', nullable: true })
  attributes: {
    effect?: string;
    duration?: number;
    value?: number;
    stackable?: boolean;
    maxStack?: number;
  };

  @Column({ nullable: true, name: 'source' })
  source: string; // 'PURCHASE', 'REWARD', 'ACHIEVEMENT', 'GIFT', 'CRAFT'

  @Column({ type: 'int', nullable: true, name: 'purchase_price' })
  purchasePrice: number;

  @CreateDateColumn({ name: 'acquired_at' })
  acquiredAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt: Date;

  // Check if item is expired
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  // Check if item can be stacked
  canStack(): boolean {
    return this.attributes?.stackable === true;
  }

  // Get max stack size
  getMaxStack(): number {
    return this.attributes?.maxStack || 1;
  }
}

export default Inventory;

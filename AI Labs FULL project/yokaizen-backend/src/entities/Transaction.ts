import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum TransactionType {
  CREDIT_PURCHASE = 'CREDIT_PURCHASE',
  CREDIT_EARN = 'CREDIT_EARN',
  CREDIT_SPEND = 'CREDIT_SPEND',
  CREDIT_GIFT = 'CREDIT_GIFT',
  CREDIT_REFUND = 'CREDIT_REFUND',
  SUBSCRIPTION_START = 'SUBSCRIPTION_START',
  SUBSCRIPTION_RENEW = 'SUBSCRIPTION_RENEW',
  SUBSCRIPTION_CANCEL = 'SUBSCRIPTION_CANCEL',
  SUBSCRIPTION_UPGRADE = 'SUBSCRIPTION_UPGRADE',
  SUBSCRIPTION_DOWNGRADE = 'SUBSCRIPTION_DOWNGRADE',
  SQUAD_CONTRIBUTION = 'SQUAD_CONTRIBUTION',
  SQUAD_WITHDRAWAL = 'SQUAD_WITHDRAWAL',
  REWARD = 'REWARD',
  ACHIEVEMENT = 'ACHIEVEMENT',
  DAILY_BONUS = 'DAILY_BONUS',
  STREAK_BONUS = 'STREAK_BONUS',
  REFERRAL_BONUS = 'REFERRAL_BONUS',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum Currency {
  CREDITS = 'CREDITS',
  USD = 'USD',
  JPY = 'JPY',
  EUR = 'EUR',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index('idx_transactions_user_id')
  userId: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  @Index('idx_transactions_type')
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'int' })
  amount: number;

  @Column({
    type: 'enum',
    enum: Currency,
    default: Currency.CREDITS,
  })
  currency: Currency;

  @Column({ type: 'int', name: 'balance_before' })
  balanceBefore: number;

  @Column({ type: 'int', name: 'balance_after' })
  balanceAfter: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true, name: 'reference_id' })
  @Index('idx_transactions_reference_id')
  referenceId: string; // Stripe payment ID, game ID, etc.

  @Column({ nullable: true, name: 'reference_type' })
  referenceType: string; // 'stripe_payment', 'game', 'squad', etc.

  @Column({ type: 'uuid', nullable: true, name: 'related_user_id' })
  relatedUserId: string; // For gifts, referrals

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    stripePaymentId?: string;
    stripeInvoiceId?: string;
    subscriptionPlan?: string;
    gameType?: string;
    gameId?: string;
    squadId?: string;
    achievementId?: string;
    source?: string;
    ipAddress?: string;
    userAgent?: string;
  };

  @Column({ nullable: true, name: 'failure_reason' })
  failureReason: string;

  @Column({ type: 'uuid', nullable: true, name: 'processed_by' })
  processedBy: string; // Admin user ID for manual adjustments

  @CreateDateColumn({ name: 'created_at' })
  @Index('idx_transactions_created_at')
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'processed_at' })
  processedAt: Date;

  // Check if transaction is credit change
  isCreditTransaction(): boolean {
    return [
      TransactionType.CREDIT_PURCHASE,
      TransactionType.CREDIT_EARN,
      TransactionType.CREDIT_SPEND,
      TransactionType.CREDIT_GIFT,
      TransactionType.CREDIT_REFUND,
      TransactionType.REWARD,
      TransactionType.ACHIEVEMENT,
      TransactionType.DAILY_BONUS,
      TransactionType.STREAK_BONUS,
      TransactionType.REFERRAL_BONUS,
      TransactionType.ADMIN_ADJUSTMENT,
    ].includes(this.type);
  }

  // Check if transaction is positive (adds credits)
  isPositive(): boolean {
    return [
      TransactionType.CREDIT_PURCHASE,
      TransactionType.CREDIT_EARN,
      TransactionType.CREDIT_REFUND,
      TransactionType.REWARD,
      TransactionType.ACHIEVEMENT,
      TransactionType.DAILY_BONUS,
      TransactionType.STREAK_BONUS,
      TransactionType.REFERRAL_BONUS,
      TransactionType.SQUAD_WITHDRAWAL,
    ].includes(this.type);
  }

  // Get display string
  getDisplayString(): string {
    const sign = this.isPositive() ? '+' : '-';
    return `${sign}${Math.abs(this.amount)} ${this.currency}`;
  }
}

export default Transaction;

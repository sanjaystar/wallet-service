import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  HasMany,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { LedgerEntry } from './ledger-entry.model';
import { User } from './user.model';

export enum TransactionType {
  TOPUP = 'TOPUP',
  BONUS = 'BONUS',
  SPEND = 'SPEND',
}

@Table({
  tableName: 'transactions',
  timestamps: false,
})
export class Transaction extends Model<Transaction> {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    field: 'user_id',
  })
  userId: number;

  @Column({
    type: DataType.ENUM('TOPUP', 'BONUS', 'SPEND'),
    allowNull: false,
  })
  type: TransactionType;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    field: 'idempotency_key',
  })
  idempotencyKey: string;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    field: 'created_at',
  })
  createdAt: Date;

  @BelongsTo(() => User)
  user: User;

  @HasMany(() => LedgerEntry)
  ledgerEntries: LedgerEntry[];
}

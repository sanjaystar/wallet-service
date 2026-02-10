import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { Transaction } from './transaction.model';
import { Wallet } from './wallet.model';

export enum LedgerDirection {
  IN = 'IN',
  OUT = 'OUT',
}

@Table({
  tableName: 'ledger_entries',
  timestamps: false,
})
export class LedgerEntry extends Model<LedgerEntry> {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => Transaction)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    field: 'transaction_id',
  })
  transactionId: number;

  @ForeignKey(() => Wallet)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    field: 'wallet_id',
  })
  walletId: number;

  @Column({
    type: DataType.ENUM('IN', 'OUT'),
    allowNull: false,
  })
  direction: LedgerDirection;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  amount: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    field: 'balance_after',
  })
  balanceAfter: number;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    field: 'created_at',
  })
  createdAt: Date;

  @BelongsTo(() => Transaction)
  transaction: Transaction;

  @BelongsTo(() => Wallet)
  wallet: Wallet;
}

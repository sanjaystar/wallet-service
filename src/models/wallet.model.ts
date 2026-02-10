import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  BelongsTo,
  HasMany,
  ForeignKey,
} from 'sequelize-typescript';
import { User } from './user.model';
import { LedgerEntry } from './ledger-entry.model';
import { AssetType } from './asset-type.model';

export enum WalletType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
}

@Table({
  tableName: 'wallets',
  timestamps: true,
})
export class Wallet extends Model<Wallet> {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    field: 'user_id',
  })
  userId: number;

  @ForeignKey(() => AssetType)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 1,
    field: 'asset_type_id',
  })
  assetTypeId: number;

  @Column({
    type: DataType.ENUM('USER', 'SYSTEM'),
    allowNull: false,
  })
  type: WalletType;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  name: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
  })
  balance: number;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    field: 'created_at',
  })
  createdAt: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    field: 'updated_at',
  })
  updatedAt: Date;

  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => AssetType)
  assetType: AssetType;

  @HasMany(() => LedgerEntry)
  ledgerEntries: LedgerEntry[];
}

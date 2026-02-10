import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  HasMany,
} from 'sequelize-typescript';
import { Wallet } from './wallet.model';

@Table({
  tableName: 'users',
  timestamps: false,
})
export class User extends Model<User> {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  phone: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  name: string;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    field: 'created_at',
  })
  createdAt: Date;

  @HasMany(() => Wallet)
  wallets: Wallet[];
}

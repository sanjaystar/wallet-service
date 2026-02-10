import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { User } from '../models/user.model';
import { Wallet } from '../models/wallet.model';
import { Transaction } from '../models/transaction.model';
import { LedgerEntry } from '../models/ledger-entry.model';
import { AssetType } from '../models/asset-type.model';

@Module({
  imports: [
    SequelizeModule.forFeature([User, Wallet, Transaction, LedgerEntry, AssetType]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}

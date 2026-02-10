import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './models/user.model';
import { Wallet } from './models/wallet.model';
import { Transaction } from './models/transaction.model';
import { LedgerEntry } from './models/ledger-entry.model';
import { AssetType } from './models/asset-type.model';
import { WalletModule } from './wallet/wallet.module';
import { WalletService } from './wallet/wallet.service';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SequelizeModule.forRoot({
      dialect: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'wallet_db',
      autoLoadModels: true,
      synchronize: false, // Set to false in production, use migrations
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      models: [User, Wallet, Transaction, LedgerEntry, AssetType],
    }),
    WalletModule,
  ],
  controllers: [AppController],
})
export class AppModule implements OnModuleInit {
  constructor(private walletService: WalletService) {}

  async onModuleInit() {
    // Initialize system wallets on startup
    try {
      await this.walletService.initializeSystemWallets();
      console.log('System wallets initialized successfully');
    } catch (error) {
      console.error('Failed to initialize system wallets:', error);
    }
  }
}

import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { WalletModule } from './wallet/wallet.module';
import { WalletService } from './wallet/wallet.service';
import { AppController } from './app.controller';

function getDatabaseUri(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (DB_HOST && DB_USER != null && DB_PASSWORD != null && DB_NAME) {
    const port = DB_PORT ?? '3306';
    return `mysql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${port}/${DB_NAME}`;
  }
  throw new Error('Database config: set DATABASE_URL (e.g. Railway) or DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SequelizeModule.forRoot({
      dialect: 'mysql',
      uri: getDatabaseUri(),
      autoLoadModels: true,
      synchronize: false,
      logging: false,
    }),
    WalletModule,
  ],
  controllers: [AppController],
})
export class AppModule implements OnModuleInit {
  constructor(private walletService: WalletService) {}

  async onModuleInit() {
    try {
      await this.walletService.initializeSystemWallets();
      console.log('System wallets initialized successfully');
    } catch (error) {
      console.error('Failed to initialize system wallets:', error);
    }
  }
}


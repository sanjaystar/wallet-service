import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction as SequelizeTransaction } from 'sequelize';
import { User } from '../models/user.model';
import { Wallet, WalletType } from '../models/wallet.model';
import {
  Transaction,
  TransactionType,
} from '../models/transaction.model';
import {
  LedgerEntry,
  LedgerDirection,
} from '../models/ledger-entry.model';
import { AssetType } from '../models/asset-type.model';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(Wallet)
    private walletModel: typeof Wallet,
    @InjectModel(Transaction)
    private transactionModel: typeof Transaction,
    @InjectModel(LedgerEntry)
    private ledgerEntryModel: typeof LedgerEntry,
    @InjectModel(AssetType)
    private assetTypeModel: typeof AssetType,
    private sequelize: Sequelize,
  ) {}

  /**
   * Lock multiple wallets in ascending ID order to prevent deadlocks
   */
  private async lockWalletsInOrder(
    walletIds: number[],
    transaction: SequelizeTransaction,
  ): Promise<Wallet[]> {
    const sortedIds = [...walletIds].sort((a, b) => a - b);
    return await this.walletModel.findAll({
      where: { id: sortedIds },
      lock: 'UPDATE' as any,
      transaction,
      order: [['id', 'ASC']],
    });
  }

  /**
   * Top-up: User purchases credits
   * DEBIT: SYSTEM_TREASURY, CREDIT: USER_WALLET
   * @param assetTypeId - Asset type ID (defaults to 1 for Credits)
   */
  async topUp(
    userId: string,
    amount: number,
    idempotencyKey: string,
    assetTypeId: number = 1,
  ): Promise<Transaction> {
    return this.sequelize.transaction(async (t) => {
      // Check idempotency
      const existingTransaction = await this.transactionModel.findOne({
        where: { idempotencyKey },
        transaction: t,
      });

      if (existingTransaction) {
        return existingTransaction;
      }

      // Find or create user wallet for this asset type
      const [userWallet] = await this.walletModel.findOrCreate({
        where: {
          userId: parseInt(userId),
          type: WalletType.USER,
          assetTypeId,
        },
        defaults: {
          userId: parseInt(userId),
          type: WalletType.USER,
          assetTypeId,
          name: 'Main Wallet',
          balance: 0,
        },
        transaction: t,
      });

      // Find system treasury wallet for this asset type
      const treasuryWallet = await this.walletModel.findOne({
        where: { name: 'TREASURY', type: WalletType.SYSTEM, assetTypeId },
        transaction: t,
      });

      if (!treasuryWallet) {
        throw new NotFoundException(
          `System treasury wallet not found for asset type ${assetTypeId}`,
        );
      }

      // Lock wallets in ascending ID order to prevent deadlocks
      const lockedWallets = await this.lockWalletsInOrder(
        [userWallet.id, treasuryWallet.id],
        t,
      );

      const lockedUserWallet = lockedWallets.find((w) => w.id === userWallet.id);
      const lockedTreasuryWallet = lockedWallets.find(
        (w) => w.id === treasuryWallet.id,
      );

      // Create transaction record with duplicate key handling
      let transaction: Transaction;
      try {
        transaction = await this.transactionModel.create(
          {
            userId: parseInt(userId),
            type: TransactionType.TOPUP,
            idempotencyKey,
          },
          { transaction: t },
        );
      } catch (error) {
        // Handle race condition where another request created the transaction
        if (error.name === 'SequelizeUniqueConstraintError') {
          const existing = await this.transactionModel.findOne({
            where: { idempotencyKey },
            transaction: t,
          });
          return existing;
        }
        throw error;
      }

      // Update treasury wallet (DEBIT)
      lockedTreasuryWallet.balance -= amount;
      if (lockedTreasuryWallet.balance < 0) {
        throw new BadRequestException('Insufficient treasury balance');
      }
      await lockedTreasuryWallet.save({ transaction: t });

      // Create ledger entry for treasury (OUT)
      await this.ledgerEntryModel.create(
        {
          transactionId: transaction.id,
          walletId: lockedTreasuryWallet.id,
          direction: LedgerDirection.OUT,
          amount,
          balanceAfter: lockedTreasuryWallet.balance,
        },
        { transaction: t },
      );

      // Update user wallet (CREDIT)
      lockedUserWallet.balance += amount;
      await lockedUserWallet.save({ transaction: t });

      // Create ledger entry for user (IN)
      await this.ledgerEntryModel.create(
        {
          transactionId: transaction.id,
          walletId: lockedUserWallet.id,
          direction: LedgerDirection.IN,
          amount,
          balanceAfter: lockedUserWallet.balance,
        },
        { transaction: t },
      );

      return transaction;
    });
  }

  /**
   * Bonus: System issues free credits to user
   * DEBIT: SYSTEM_REWARDS, CREDIT: USER_WALLET
   * @param assetTypeId - Asset type ID (defaults to 1 for Credits)
   */
  async bonus(
    userId: string,
    amount: number,
    idempotencyKey: string,
    assetTypeId: number = 1,
  ): Promise<Transaction> {
    return this.sequelize.transaction(async (t) => {
      // Check idempotency
      const existingTransaction = await this.transactionModel.findOne({
        where: { idempotencyKey },
        transaction: t,
      });

      if (existingTransaction) {
        return existingTransaction;
      }

      // Find or create user wallet for this asset type
      const [userWallet] = await this.walletModel.findOrCreate({
        where: {
          userId: parseInt(userId),
          type: WalletType.USER,
          assetTypeId,
        },
        defaults: {
          userId: parseInt(userId),
          type: WalletType.USER,
          assetTypeId,
          name: 'Main Wallet',
          balance: 0,
        },
        transaction: t,
      });

      // Find system rewards wallet for this asset type
      const rewardsWallet = await this.walletModel.findOne({
        where: { name: 'REWARDS', type: WalletType.SYSTEM, assetTypeId },
        transaction: t,
      });

      if (!rewardsWallet) {
        throw new NotFoundException(
          `System rewards wallet not found for asset type ${assetTypeId}`,
        );
      }

      // Lock wallets in ascending ID order to prevent deadlocks
      const lockedWallets = await this.lockWalletsInOrder(
        [userWallet.id, rewardsWallet.id],
        t,
      );

      const lockedUserWallet = lockedWallets.find((w) => w.id === userWallet.id);
      const lockedRewardsWallet = lockedWallets.find(
        (w) => w.id === rewardsWallet.id,
      );

      // Create transaction record with duplicate key handling
      let transaction: Transaction;
      try {
        transaction = await this.transactionModel.create(
          {
            userId: parseInt(userId),
            type: TransactionType.BONUS,
            idempotencyKey,
          },
          { transaction: t },
        );
      } catch (error) {
        // Handle race condition where another request created the transaction
        if (error.name === 'SequelizeUniqueConstraintError') {
          const existing = await this.transactionModel.findOne({
            where: { idempotencyKey },
            transaction: t,
          });
          return existing;
        }
        throw error;
      }

      // Update rewards wallet (DEBIT)
      lockedRewardsWallet.balance -= amount;
      if (lockedRewardsWallet.balance < 0) {
        throw new BadRequestException('Insufficient rewards balance');
      }
      await lockedRewardsWallet.save({ transaction: t });

      // Create ledger entry for rewards (OUT)
      await this.ledgerEntryModel.create(
        {
          transactionId: transaction.id,
          walletId: lockedRewardsWallet.id,
          direction: LedgerDirection.OUT,
          amount,
          balanceAfter: lockedRewardsWallet.balance,
        },
        { transaction: t },
      );

      // Update user wallet (CREDIT)
      lockedUserWallet.balance += amount;
      await lockedUserWallet.save({ transaction: t });

      // Create ledger entry for user (IN)
      await this.ledgerEntryModel.create(
        {
          transactionId: transaction.id,
          walletId: lockedUserWallet.id,
          direction: LedgerDirection.IN,
          amount,
          balanceAfter: lockedUserWallet.balance,
        },
        { transaction: t },
      );

      return transaction;
    });
  }

  /**
   * Spend: User spends credits
   * DEBIT: USER_WALLET, CREDIT: SYSTEM_REVENUE
   * @param assetTypeId - Asset type ID (defaults to 1 for Credits)
   */
  async spend(
    userId: string,
    amount: number,
    idempotencyKey: string,
    assetTypeId: number = 1,
  ): Promise<Transaction> {
    return this.sequelize.transaction(async (t) => {
      // Check idempotency
      const existingTransaction = await this.transactionModel.findOne({
        where: { idempotencyKey },
        transaction: t,
      });

      if (existingTransaction) {
        return existingTransaction;
      }

      // Find user wallet for this asset type
      const userWallet = await this.walletModel.findOne({
        where: {
          userId: parseInt(userId),
          type: WalletType.USER,
          assetTypeId,
        },
        transaction: t,
      });

      if (!userWallet) {
        throw new NotFoundException(
          `User wallet not found for user ${userId} and asset type ${assetTypeId}`,
        );
      }

      // Find system revenue wallet for this asset type
      const revenueWallet = await this.walletModel.findOne({
        where: { name: 'REVENUE', type: WalletType.SYSTEM, assetTypeId },
        transaction: t,
      });

      if (!revenueWallet) {
        throw new NotFoundException(
          `System revenue wallet not found for asset type ${assetTypeId}`,
        );
      }

      // Lock wallets in ascending ID order to prevent deadlocks
      const lockedWallets = await this.lockWalletsInOrder(
        [userWallet.id, revenueWallet.id],
        t,
      );

      const lockedUserWallet = lockedWallets.find((w) => w.id === userWallet.id);
      const lockedRevenueWallet = lockedWallets.find(
        (w) => w.id === revenueWallet.id,
      );

      // Check sufficient balance after locking
      if (lockedUserWallet.balance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // Create transaction record with duplicate key handling
      let transaction: Transaction;
      try {
        transaction = await this.transactionModel.create(
          {
            userId: parseInt(userId),
            type: TransactionType.SPEND,
            idempotencyKey,
          },
          { transaction: t },
        );
      } catch (error) {
        // Handle race condition where another request created the transaction
        if (error.name === 'SequelizeUniqueConstraintError') {
          const existing = await this.transactionModel.findOne({
            where: { idempotencyKey },
            transaction: t,
          });
          return existing;
        }
        throw error;
      }

      // Update user wallet (DEBIT)
      lockedUserWallet.balance -= amount;
      await lockedUserWallet.save({ transaction: t });

      // Create ledger entry for user (OUT)
      await this.ledgerEntryModel.create(
        {
          transactionId: transaction.id,
          walletId: lockedUserWallet.id,
          direction: LedgerDirection.OUT,
          amount,
          balanceAfter: lockedUserWallet.balance,
        },
        { transaction: t },
      );

      // Update revenue wallet (CREDIT)
      lockedRevenueWallet.balance += amount;
      await lockedRevenueWallet.save({ transaction: t });

      // Create ledger entry for revenue (IN)
      await this.ledgerEntryModel.create(
        {
          transactionId: transaction.id,
          walletId: lockedRevenueWallet.id,
          direction: LedgerDirection.IN,
          amount,
          balanceAfter: lockedRevenueWallet.balance,
        },
        { transaction: t },
      );

      return transaction;
    });
  }

  /**
   * Get user wallet balance for a specific asset type
   * @param assetTypeId - Asset type ID
   */
  async getBalance(userId: string, assetTypeId: number): Promise<number> {
    const wallet = await this.walletModel.findOne({
      where: {
        userId: parseInt(userId),
        type: WalletType.USER,
        assetTypeId,
      },
    });

    if (!wallet) {
      // Return 0 if wallet doesn't exist (wallet will be created on first transaction)
      return 0;
    }

    return wallet.balance;
  }

  /**
   * Get all balances for a user across all asset types
   */
  async getAllBalances(userId: string): Promise<
    Array<{ asset: string; balance: number }>
  > {
    // Get all asset types
    const assetTypes = await this.assetTypeModel.findAll({
      order: [['id', 'ASC']],
    });

    // Get all user wallets
    const wallets = await this.walletModel.findAll({
      where: {
        userId: parseInt(userId),
        type: WalletType.USER,
      },
    });

    // Create a map of assetTypeId -> balance
    const balanceMap = new Map<number, number>();
    wallets.forEach((wallet) => {
      balanceMap.set(wallet.assetTypeId, wallet.balance);
    });

    // Build response with all asset types
    return assetTypes.map((assetType) => ({
      asset: assetType.code, // CREDITS, GOLD, DIAMOND, LOYALTY
      balance: balanceMap.get(assetType.id) || 0,
    }));
  }

  /**
   * Initialize system wallets (called on app startup)
   * Creates system wallets for all asset types
   * Only creates wallets if they don't exist, does not update existing balances
   */
  async initializeSystemWallets(): Promise<void> {
    // Asset types: 1=Credits, 2=Gold Coins, 3=Diamonds, 4=Loyalty Points
    const assetTypes = [1, 2, 3, 4];
    const systemWalletNames = ['TREASURY', 'REWARDS', 'REVENUE'];

    for (const assetTypeId of assetTypes) {
      for (const walletName of systemWalletNames) {
        const balance = walletName === 'REVENUE' ? 0 : 1000000;
        await this.walletModel.findOrCreate({
          where: {
            name: walletName,
            type: WalletType.SYSTEM,
            assetTypeId,
          },
          defaults: {
            name: walletName,
            type: WalletType.SYSTEM,
            assetTypeId,
            balance,
          },
        });
      }
    }
  }
}

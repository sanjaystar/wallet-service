import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { WalletService } from './wallet.service';
import { WalletTransactionDto } from './dto/wallet-transaction.dto';
import { AssetType } from '../models/asset-type.model';

@Controller('wallets')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    @InjectModel(AssetType)
    private assetTypeModel: typeof AssetType,
  ) {}

  @Post('topup')
  @HttpCode(HttpStatus.CREATED)
  async topUp(@Body() dto: WalletTransactionDto) {
    const assetTypeId = dto.assetTypeId || 1; // Default to Credits
    const idempotencyKey =
      dto.idempotencyKey ?? (await this.generateIdempotencyKey('topup', assetTypeId));
    const transaction = await this.walletService.topUp(
      dto.userId,
      dto.amount,
      idempotencyKey,
      assetTypeId,
    );
    return {
      success: true,
      transactionId: transaction.id,
      message: 'Top-up successful',
      assetTypeId,
    };
  }

  @Post('bonus')
  @HttpCode(HttpStatus.CREATED)
  async bonus(@Body() dto: WalletTransactionDto) {
    const assetTypeId = dto.assetTypeId || 1; // Default to Credits
    const idempotencyKey =
      dto.idempotencyKey ?? (await this.generateIdempotencyKey('bonus', assetTypeId));
    const transaction = await this.walletService.bonus(
      dto.userId,
      dto.amount,
      idempotencyKey,
      assetTypeId,
    );
    return {
      success: true,
      transactionId: transaction.id,
      message: 'Bonus credited successfully',
      assetTypeId,
    };
  }

  @Post('spend')
  @HttpCode(HttpStatus.CREATED)
  async spend(@Body() dto: WalletTransactionDto) {
    const assetTypeId = dto.assetTypeId || 1; // Default to Credits
    const idempotencyKey =
      dto.idempotencyKey ?? (await this.generateIdempotencyKey('spend', assetTypeId));
    const transaction = await this.walletService.spend(
      dto.userId,
      dto.amount,
      idempotencyKey,
      assetTypeId,
    );
    return {
      success: true,
      transactionId: transaction.id,
      message: 'Spend successful',
      assetTypeId,
    };
  }

  @Get(':userId')
  async getBalances(
    @Param('userId') userId: string,
    @Query('assetId') assetId?: string,
  ) {
    // If assetId is provided, return single balance
    if (assetId) {
      const assetTypeId = parseInt(assetId);
      const balance = await this.walletService.getBalance(userId, assetTypeId);
      
      // Get asset type info for response
      const assetType = await this.assetTypeModel.findByPk(assetTypeId);
      const assetCode = assetType ? assetType.code : 'UNKNOWN';

      return {
        userId: parseInt(userId),
        asset: assetCode,
        balance,
      };
    }

    // Otherwise, return all balances
    const balances = await this.walletService.getAllBalances(userId);
    return {
      userId: parseInt(userId),
      balances,
    };
  }

  /**
   * Generate idempotency key automatically
   * Format: {type}_{assetName}{5digitnumber}
   * Example: topup_credits29318
   */
  private async generateIdempotencyKey(
    type: string,
    assetTypeId: number,
  ): Promise<string> {
    // Get asset type name from database
    const assetType = await this.assetTypeModel.findByPk(assetTypeId);
    const assetName = assetType
      ? assetType.name.toLowerCase().replace(/\s+/g, '') // e.g., "Gold Coins" -> "goldcoins"
      : 'credits'; // fallback to credits if not found

    // Generate 5-digit random number (10000-99999)
    const fiveDigitNumber = Math.floor(10000 + Math.random() * 90000);

    return `${type}_${assetName}${fiveDigitNumber}`;
  }
}

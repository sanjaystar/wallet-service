import { IsString, IsNumber, IsPositive, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class WalletTransactionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsOptional()
  idempotencyKey?: string; // If provided, same key on retry returns same result (idempotent)

  @IsNumber()
  @IsOptional()
  @Min(1)
  assetTypeId?: number; // Defaults to 1 (Credits) if not provided
}

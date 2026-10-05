import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination.js';
import { CouponType } from '../../../generated/prisma/enums.js';

const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);
// Up to 6 decimal places, e.g. "0.65" or "1.090000"
const RATE = /^\d{1,6}(\.\d{1,6})?$/;

export class CreateCurrencyDto {
  // ISO 4217, e.g. "USD"
  @Transform(upper)
  @Matches(/^[A-Z]{3}$/, { message: 'Currency code must be 3 letters, e.g. USD' })
  code: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8)
  symbol: string;

  // How many units of this currency equal 1 AUD
  @Transform(({ value }: { value: unknown }) => (typeof value === 'number' ? String(value) : value))
  @Matches(RATE, { message: 'Exchange rate must be a positive number, e.g. 0.65' })
  rateFromAud: string;

  // Round converted prices up to a multiple of this many cents (100 = whole units)
  @IsInt()
  @Min(1)
  @Max(10_000)
  roundTo: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateCurrencyDto extends PartialType(CreateCurrencyDto) {}

export class CreateCouponDto {
  // Shoppers type this; stored uppercase
  @Transform(upper)
  @Matches(/^[A-Z0-9_-]{3,30}$/, { message: 'Codes are 3–30 letters, numbers, - or _' })
  code: string;

  @IsEnum(CouponType)
  type: CouponType;

  // PERCENTAGE: 1–100. FIXED_AMOUNT: AUD cents. FREE_SHIPPING: ignored.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  value: number = 0;

  // Minimum order (AUD cents, after GST, before shipping)
  @IsOptional()
  @IsInt()
  @Min(1)
  minOrderAmount?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCouponDto extends PartialType(CreateCouponDto) {}

export class CouponListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  q?: string;
}

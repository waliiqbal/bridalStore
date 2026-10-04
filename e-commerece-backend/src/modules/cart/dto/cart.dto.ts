import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { IsCountryCode } from '../../../common/countries.js';
import { MAX_QUANTITY_PER_LINE } from '../cart-rules.js';

// Every cart endpoint accepts these to price the response.
export class CartQueryDto {
  // ISO currency code; unknown or disabled → AUD
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  // Ship-to country (ISO 2-letter) for shipping and GST
  @IsOptional()
  @IsCountryCode()
  country?: string;

  // Chosen shipping rate; without it the cheapest rate is used as an estimate
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingRateId?: string;
}

export class AddCartItemDto {
  @IsString()
  @MaxLength(100)
  variantId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY_PER_LINE)
  quantity: number = 1;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1. Use remove to take an item out.' })
  @Max(MAX_QUANTITY_PER_LINE, { message: `You can add up to ${MAX_QUANTITY_PER_LINE} of each item` })
  quantity: number;
}

export class ApplyCouponDto {
  @IsString()
  @MinLength(1, { message: 'Please enter a code' })
  @MaxLength(50)
  code: string;
}

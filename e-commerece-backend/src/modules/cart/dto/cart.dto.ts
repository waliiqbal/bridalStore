import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MAX_QUANTITY_PER_LINE } from '../cart-rules.js';

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

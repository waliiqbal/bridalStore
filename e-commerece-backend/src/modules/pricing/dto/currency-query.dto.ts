import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CurrencyQueryDto {
  // ISO code like "USD". Unknown or disabled codes fall back to AUD.
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}

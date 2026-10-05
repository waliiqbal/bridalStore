import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { COUNTRY_CODES, IsCountryCode } from '../../../common/countries.js';

export class ShippingOptionsQueryDto {
  @IsCountryCode()
  country: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}

export class CreateZoneDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  // ISO 2-letter codes; each country may be in only one zone
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? [...new Set(value.map((v) => String(v).trim().toUpperCase()))] : value,
  )
  @IsArray()
  @ArrayMaxSize(250)
  @IsIn(COUNTRY_CODES as unknown as string[], { each: true, message: 'Each country must be a valid 2-letter code' })
  countryCodes?: string[];

  // "Rest of world": ships to every country not listed in another zone
  @IsOptional()
  @IsBoolean()
  isFallback?: boolean;

  // Australian GST applies to orders shipped to this zone
  @IsOptional()
  @IsBoolean()
  chargesGst?: boolean;
}

export class UpdateZoneDto extends PartialType(CreateZoneDto) {}

export class CreateRateDto {
  // e.g. "Standard", "Express"
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  // AUD cents
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  price: number;

  // Order subtotal (AUD cents, after discount) from which this rate is free
  @IsOptional()
  @IsInt()
  @Min(1)
  freeOverAmount?: number | null;

  // e.g. "3–7 business days"
  @IsOptional()
  @IsString()
  @MaxLength(60)
  estimatedDays?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateRateDto extends PartialType(CreateRateDto) {}

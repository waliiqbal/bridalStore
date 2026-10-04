import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsCountryCode } from '../../../common/countries.js';
import { PaginationQueryDto } from '../../../common/pagination/pagination.js';

const PHONE = /^\+?[0-9 ()-]{6,24}$/;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string | null;

  @IsOptional()
  @Matches(PHONE, { message: 'Please enter a valid phone number' })
  phone?: string | null;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;
}

export class CreateAddressDto {
  @IsString()
  @MinLength(1, { message: 'Please enter the full name' })
  @MaxLength(120)
  fullName: string;

  @IsOptional()
  @Matches(PHONE, { message: 'Please enter a valid phone number' })
  phone?: string | null;

  @IsString()
  @MinLength(1, { message: 'Please enter the street address' })
  @MaxLength(200)
  line1: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string | null;

  @IsString()
  @MinLength(1, { message: 'Please enter the city or suburb' })
  @MaxLength(100)
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string | null;

  @IsString()
  @MinLength(1, { message: 'Please enter the postcode' })
  @MaxLength(20)
  postcode: string;

  @IsCountryCode()
  countryCode: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}

export class WishlistQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}

export class AddWishlistItemDto {
  @IsString()
  @MaxLength(100)
  productId: string;
}

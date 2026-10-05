import { OmitType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateAddressDto } from '../../account/dto/account.dto.js';

export class CheckoutAddressDto extends OmitType(CreateAddressDto, ['isDefault'] as const) {}

/**
 * Same body for /checkout/preview (problems are reported, nothing created)
 * and /checkout (creates the order).
 */
export class CheckoutDto {
  // Guests: required. Signed-in customers: their account email is used.
  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @Matches(/^\+?[0-9 ()-]{6,24}$/, { message: 'Please enter a valid phone number' })
  phone?: string | null;

  // Either a new address...
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutAddressDto)
  shippingAddress?: CheckoutAddressDto;

  // ...or a saved address of the signed-in customer
  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingRateId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  // Omitted → the code saved on the cart; null → no code
  @IsOptional()
  @IsString()
  @MaxLength(50)
  couponCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNote?: string | null;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;
}

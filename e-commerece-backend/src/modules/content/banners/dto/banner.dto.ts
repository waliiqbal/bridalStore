import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsImageUrl, IsSafeLink } from '../../../../common/validation.js';

const PLACEMENT = /^[a-z0-9_]{1,40}$/;

export class CreateBannerDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtitle?: string | null;

  @IsString()
  @MaxLength(2000)
  @IsImageUrl()
  imageUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @IsImageUrl()
  mobileImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @IsSafeLink()
  linkUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  buttonText?: string | null;

  // Where it shows, e.g. "home_hero", "home_promo"
  @IsOptional()
  @Matches(PLACEMENT, { message: 'placement must be lowercase letters, numbers and _' })
  placement?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // ISO dates; empty = no limit
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date | null;
}

export class UpdateBannerDto extends PartialType(CreateBannerDto) {}

export class BannerQueryDto {
  @IsOptional()
  @Matches(PLACEMENT, { message: 'placement must be lowercase letters, numbers and _' })
  placement?: string;
}

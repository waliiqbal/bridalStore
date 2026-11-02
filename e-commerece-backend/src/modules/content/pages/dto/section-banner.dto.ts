import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsImageUrl, IsSafeLink } from '../../../../common/validation.js';

// One banner inside a "Side-by-side banners" block
export class SectionBannerDto {
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

  // A picture made for phones (empty = the main picture is used)
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

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

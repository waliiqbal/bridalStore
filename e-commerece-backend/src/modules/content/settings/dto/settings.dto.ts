import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const HTTPS_URL = /^https:\/\/\S+$/i;
const stripTags = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : value;

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  storeName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  contactEmail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string | null;

  // International format, e.g. +61 400 000 000
  @IsOptional()
  @Matches(/^\+?[0-9 ]{6,20}$/, { message: 'WhatsApp number must be digits, e.g. +61 400 000 000' })
  whatsappNumber?: string | null;

  // Plain text shown in the bar at the top of the shop
  @IsOptional()
  @Transform(stripTags)
  @IsString()
  @MaxLength(300)
  announcementBar?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  gstRatePercent?: number;

  @IsOptional()
  @Matches(HTTPS_URL, { message: 'instagramUrl must start with https://' })
  instagramUrl?: string | null;

  @IsOptional()
  @Matches(HTTPS_URL, { message: 'facebookUrl must start with https://' })
  facebookUrl?: string | null;

  @IsOptional()
  @Matches(HTTPS_URL, { message: 'tiktokUrl must start with https://' })
  tiktokUrl?: string | null;

  @IsOptional()
  @Matches(/^\d{5,20}$/, { message: 'Meta Pixel ID is a number, e.g. 123456789012345' })
  metaPixelId?: string | null;

  @IsOptional()
  @Matches(/^G-[A-Z0-9]{4,20}$/, { message: 'Google Analytics ID looks like G-XXXXXXX' })
  googleAnalyticsId?: string | null;
}

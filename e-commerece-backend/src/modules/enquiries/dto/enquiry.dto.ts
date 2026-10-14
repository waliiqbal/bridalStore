import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EnquiryStatus } from '../../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../../common/pagination/pagination.js';
import { BUDGET_CODES, OUTFIT_TYPE_CODES } from '../enquiry-options.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
// An empty box means "not filled in"
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class CreateEnquiryDto {
  @IsString()
  @MinLength(2, { message: 'Please enter your name' })
  @MaxLength(100)
  @Transform(trim)
  name: string;

  @IsString()
  @Matches(/^\+?[\d\s\-()]{6,20}$/, {
    message: 'Please enter a valid phone number',
  })
  @Transform(trim)
  phone: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @MaxLength(200)
  @Transform(emptyToNull)
  email?: string | null;

  @IsOptional()
  @IsIn(BUDGET_CODES, { message: 'Please choose a budget from the list' })
  @Transform(emptyToNull)
  budget?: string | null;

  // Date of the wedding or event, YYYY-MM-DD
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Please enter a valid date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Please enter a valid date' })
  @Transform(emptyToNull)
  eventDate?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(OUTFIT_TYPE_CODES.length)
  @IsIn(OUTFIT_TYPE_CODES, {
    each: true,
    message: 'Please choose outfit types from the list',
  })
  outfitTypes?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(emptyToNull)
  message?: string | null;

  // From the QR link (?source=window). Letters, numbers, - and _ only.
  @IsOptional()
  @Matches(/^[a-z0-9_-]{1,40}$/i, { message: 'Invalid source' })
  source?: string;

  // Honeypot: hidden on the page, so only robots fill it in
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

export class AdminEnquiryListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(EnquiryStatus)
  status?: EnquiryStatus;

  // Name, phone or email
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trim)
  q?: string;

  // "newest" (default) or "event" = the soonest wedding date first
  @IsOptional()
  @IsIn(['newest', 'event'])
  sort?: 'newest' | 'event';
}

export class UpdateEnquiryDto {
  @IsOptional()
  @IsEnum(EnquiryStatus)
  status?: EnquiryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  adminNote?: string | null;
}

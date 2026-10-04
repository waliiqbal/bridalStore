import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { SanitizeHtml } from '../../../../common/html/sanitize-html.js';
import { IsImageUrl, IsSafeLink } from '../../../../common/validation.js';
import { PageSectionType } from '../../../../generated/prisma/enums.js';
import { MAX_PRODUCT_LIMIT, MAX_TILES } from '../section-validation.js';

export class CreatePageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title: string;

  // Leave empty to generate from the title
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  // Simple body for text pages; richer layouts use sections
  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  @SanitizeHtml()
  content?: string | null;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsBoolean()
  showInFooter?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string | null;
}

export class UpdatePageDto extends PartialType(CreatePageDto) {}

export class CreateSectionDto {
  @IsEnum(PageSectionType)
  type: PageSectionType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtitle?: string | null;

  // RICH_TEXT / IMAGE_WITH_TEXT
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  @SanitizeHtml()
  body?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @IsImageUrl()
  imageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @IsSafeLink()
  linkUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  buttonText?: string | null;

  // COLLECTION_GRID / PRODUCT_CAROUSEL
  @IsOptional()
  @IsString()
  collectionId?: string | null;

  // COLLECTION_TILES
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_TILES)
  @ArrayUnique()
  @IsString({ each: true })
  collectionIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PRODUCT_LIMIT)
  productLimit?: number;

  // Extra layout options (colours, alignment) without new columns
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown> | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSectionDto extends PartialType(CreateSectionDto) {}

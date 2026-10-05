import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SanitizeHtml } from '../../../../common/html/sanitize-html.js';
import { PaginationQueryDto } from '../../../../common/pagination/pagination.js';
import { ProductStatus } from '../../../../generated/prisma/enums.js';

const MAX_CENTS = 100_000_000; // A$1,000,000

export class ProductImageInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  altText?: string | null;

  // Links the image to a colour so the gallery switches with the colour picker
  @IsOptional()
  @IsString()
  @MaxLength(60)
  colour?: string | null;
}

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  // Leave empty to generate from the name
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  @SanitizeHtml()
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  @SanitizeHtml()
  details?: string | null;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  // AUD cents, GST-inclusive
  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  price: number;

  // Original price shown crossed out; must be higher than price
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_CENTS)
  compareAtPrice?: number | null;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isNewArrival?: boolean;

  @IsOptional()
  @IsBoolean()
  isReadyToShip?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  deliveryDays?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  badge?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  sizeGuideId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string | null;

  // Replaces all images; array order = gallery order
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProductImageInputDto)
  images?: ProductImageInputDto[];

  // Replaces all filter values (Fabric, Occasion, Work...)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  attributeValueIds?: string[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class AdminProductListQueryDto extends PaginationQueryDto {
  // Matches name, URL or SKU
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  q?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  // Includes sub-categories
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class SearchQueryDto extends PaginationQueryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1, { message: 'Please enter something to search for' })
  @MaxLength(100)
  q: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}

export class GenerateVariantsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  sizes?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  colours?: string[];

  // Optional starting values for every new variant
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  stock?: number;
}

export class UpdateVariantDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sku?: string;

  // null = use the product price
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_CENTS)
  price?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

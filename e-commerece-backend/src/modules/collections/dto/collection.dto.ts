import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination.js';
import {
  CollectionSort,
  CollectionType,
  RuleField,
  RuleOperator,
} from '../../../generated/prisma/enums.js';

export class CollectionRuleDto {
  @IsEnum(RuleField)
  field: RuleField;

  @IsOptional()
  @IsEnum(RuleOperator)
  operator: RuleOperator = RuleOperator.EQUALS;

  // Category id, attribute value id, tag, colour, size, cents or days — depends on field
  @IsOptional()
  @IsString()
  @MaxLength(200)
  value: string = '';
}

export class CreateCollectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  // MANUAL = hand-picked, SMART = automatic by rules
  @IsOptional()
  @IsEnum(CollectionType)
  type?: CollectionType;

  @IsOptional()
  @IsBoolean()
  matchAllRules?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CollectionRuleDto)
  rules?: CollectionRuleDto[];

  @IsOptional()
  @IsEnum(CollectionSort)
  defaultSort?: CollectionSort;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  seoContent?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bannerImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mobileBannerImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  noticeText?: string | null;

  // Filters shown on this collection page; empty = all filterable attributes
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  filterAttributeIds?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string | null;
}

export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {}

export class CollectionProductIdsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsString({ each: true })
  productIds: string[];
}

export class PreviewRulesDto extends PaginationQueryDto {
  @IsOptional()
  @IsBoolean()
  matchAllRules?: boolean;

  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CollectionRuleDto)
  rules: CollectionRuleDto[];
}

// "a,b" or repeated params (?sizes=S&sizes=M) → ['a', 'b']
const toList = ({ value }: { value: unknown }) => {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim())
    .filter(Boolean);
};
const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

export class CollectionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(CollectionSort)
  sort?: CollectionSort;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  // Category slugs (sub-categories included)
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  category?: string[];

  // "attributeSlug.valueSlug", e.g. attr=fabric.chiffon,occasion.mehndi
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @ArrayMaxSize(50)
  @Matches(/^[a-z0-9-]+\.[a-z0-9-]+$/, {
    each: true,
    message: 'attr values must look like "fabric.chiffon"',
  })
  attr?: string[];

  @IsOptional()
  @Transform(toList)
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  sizes?: string[];

  @IsOptional()
  @Transform(toList)
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  colours?: string[];

  // In the selected currency's cents
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  maxPrice?: number;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  onSale?: boolean;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  readyToShip?: boolean;
}

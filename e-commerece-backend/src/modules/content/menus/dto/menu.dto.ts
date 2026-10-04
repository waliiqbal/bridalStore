import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsImageUrl } from '../../../../common/validation.js';
import { MenuItemType } from '../../../../generated/prisma/enums.js';

export class CreateMenuItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label: string;

  @IsEnum(MenuItemType)
  type: MenuItemType;

  @IsOptional()
  @IsString()
  collectionId?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  pageId?: string | null;

  // URL items only; checked against the safe-link rules
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string | null;

  // null = top level
  @IsOptional()
  @IsString()
  parentId?: string | null;

  // Promo tile image in the mega menu
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @IsImageUrl()
  imageUrl?: string | null;

  // Style hint, e.g. "red" for Sale
  @IsOptional()
  @IsString()
  @Matches(/^[a-z-]{1,20}$/, { message: 'highlight must be a simple style name like "red"' })
  highlight?: string | null;
}

export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {}

export class ReorderMenuItemsDto {
  // The parent whose children are being reordered (null/omitted = top level)
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  ids: string[];
}

import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAttributeDto {
  // Shown to shoppers as the filter title, e.g. "Fabric"
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  slug?: string;

  // Show this attribute as a filter on collection pages
  @IsOptional()
  @IsBoolean()
  isFilterable?: boolean;
}

export class UpdateAttributeDto extends PartialType(CreateAttributeDto) {}

export class CreateAttributeValueDto {
  // e.g. "Chiffon"
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  value: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;
}

export class UpdateAttributeValueDto extends PartialType(CreateAttributeValueDto) {}

import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { SanitizeHtml } from '../../../../common/html/sanitize-html.js';

export class CreateFaqDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  question: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  @SanitizeHtml()
  answer: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFaqDto extends PartialType(CreateFaqDto) {}

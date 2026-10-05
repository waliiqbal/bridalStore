import { PartialType } from '@nestjs/mapped-types';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { SanitizeHtml } from '../../../../common/html/sanitize-html.js';

export class CreateSizeGuideDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  // HTML/markdown table or an image URL
  @IsString()
  @MinLength(1)
  @MaxLength(50_000)
  @SanitizeHtml()
  content: string;
}

export class UpdateSizeGuideDto extends PartialType(CreateSizeGuideDto) {}

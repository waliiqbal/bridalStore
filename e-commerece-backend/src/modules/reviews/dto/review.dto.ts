import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination.js';
import { ReviewStatus } from '../../../generated/prisma/enums.js';

// Reviews are plain text: remove any tags and extra spaces
const plain = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : value;
const plainOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() || null : value;

export class CreateReviewDto {
  @Type(() => Number)
  @IsInt({ message: 'Please choose 1 to 5 stars' })
  @Min(1, { message: 'Please choose 1 to 5 stars' })
  @Max(5, { message: 'Please choose 1 to 5 stars' })
  rating: number;

  @IsOptional()
  @Transform(plainOrNull)
  @IsString()
  @MaxLength(100)
  title?: string | null;

  @Transform(plain)
  @IsString()
  @MinLength(10, { message: 'Please write at least a short sentence (10 letters)' })
  @MaxLength(2000)
  body: string;
}

export class ReviewListQueryDto extends PaginationQueryDto {}

export class AdminReviewListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  // Product name
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class UpdateReviewDto {
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  // The shop's public answer; null or empty removes it
  @IsOptional()
  @Transform(plainOrNull)
  @IsString()
  @MaxLength(1000)
  shopReply?: string | null;
}

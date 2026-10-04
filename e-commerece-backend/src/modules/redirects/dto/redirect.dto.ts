import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination.js';

export class CreateRedirectDto {
  // Old address, e.g. /products/old-name
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  fromPath: string;

  // New address, e.g. /products/new-name
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  toPath: string;
}

export class UpdateRedirectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  toPath: string;
}

export class RedirectListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}

export class ResolveRedirectQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  path: string;
}

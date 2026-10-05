import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination.js';

export class AdminCustomerListQueryDto extends PaginationQueryDto {
  // Name or email
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class UpdateCustomerDto {
  // false = the customer can no longer log in and is signed out
  @IsBoolean()
  isActive: boolean;
}

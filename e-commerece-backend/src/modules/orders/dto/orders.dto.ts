import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination.js';
import { OrderStatus } from '../../../generated/prisma/enums.js';

export class OrderLookupDto {
  // e.g. MBS-10001
  @IsString()
  @MaxLength(30)
  orderNumber: string;

  @IsEmail({}, { message: 'Please enter the email used for the order' })
  @MaxLength(254)
  email: string;
}

export class AdminOrderListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  // Orders created on or after this date
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  // Orders created before this date
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  // Only orders flagged for the owner (payment problems, automatic refunds)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  needsAttention?: boolean;

  // Order number, email or name
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  q?: string;
}

export class ChangeOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;

  // Required when marking as SHIPPED
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  trackingNumber?: string | null;

  @IsOptional()
  @Matches(/^https:\/\/\S+$/i, { message: 'Tracking link must start with https://' })
  @MaxLength(2000)
  trackingUrl?: string | null;
}

export class UpdateOrderDto {
  // Private note, never shown to the customer
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  adminNote?: string | null;

  // true = the problem in attentionNote has been dealt with
  @IsOptional()
  @IsBoolean()
  resolveAttention?: boolean;
}

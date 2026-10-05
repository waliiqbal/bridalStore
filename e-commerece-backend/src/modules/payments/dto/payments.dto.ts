import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class OrderNumberDto {
  // e.g. MBS-10001
  @IsString()
  @MaxLength(30)
  orderNumber: string;
}

export class SquarePaymentDto extends OrderNumberDto {
  // Card token from Square's Web Payments SDK (no card data ever reaches us)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  sourceId: string;

  // Buyer verification (3-D Secure) token, when Square asked for it
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  verificationToken?: string;
}

export class PayPalCaptureDto extends OrderNumberDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  paypalOrderId: string;
}

export class RefundDto {
  // Cents in the order currency; omitted = everything still refundable
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amount?: number;

  @IsString()
  @MinLength(3, { message: 'Please give a reason for the refund' })
  @MaxLength(500)
  reason: string;
}

export class CancelAndRefundDto {
  @IsString()
  @MinLength(3, { message: 'Please give a reason' })
  @MaxLength(500)
  reason: string;
}

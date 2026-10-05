import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

export const CUSTOMER_COOKIE = 'customer_token';
export const CUSTOMER_JWT = Symbol('CUSTOMER_JWT');

export interface CustomerJwtPayload {
  sub: string;
  // Customer.sessionVersion at sign-in; a password change bumps it
  sv: number;
  scope: 'customer';
}

export interface CustomerProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  marketingOptIn: boolean;
  createdAt: Date;
}

export const CUSTOMER_PROFILE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  marketingOptIn: true,
  createdAt: true,
} as const;

export type CustomerRequest = Request & { customer?: CustomerProfile };

export type CustomerAuthMode = 'required' | 'optional';
export const CUSTOMER_AUTH_KEY = 'customerAuth';

/**
 * 'required' → 401 unless a customer is signed in.
 * 'optional' → req.customer is set when signed in (e.g. the cart).
 * Controllers under /api/account are 'required' automatically.
 */
export const CustomerAuth = (mode: CustomerAuthMode = 'required') =>
  SetMetadata(CUSTOMER_AUTH_KEY, mode);

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CustomerProfile | undefined =>
    ctx.switchToHttp().getRequest<CustomerRequest>().customer,
);

// Cookie values, read in controllers so services stay HTTP-free.
export const Cookie = createParamDecorator((name: string, ctx: ExecutionContext): string | undefined => {
  const cookies = ctx.switchToHttp().getRequest<Request>().cookies as Record<string, string> | undefined;
  return cookies?.[name];
});

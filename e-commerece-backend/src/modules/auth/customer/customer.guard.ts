import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import { CustomerAuthService } from './customer-auth.service.js';
import {
  CUSTOMER_AUTH_KEY,
  CUSTOMER_COOKIE,
  type CustomerAuthMode,
  type CustomerRequest,
} from './customer-session.js';

/**
 * Registered globally. Controllers under "account" (/api/account/...) require
 * a signed-in customer; other routes opt in with @CustomerAuth(). Reads only
 * the customer cookie, which is signed with the customer secret, so an admin
 * cookie can never pass here (and AdminGuard rejects customer cookies).
 */
@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: CustomerAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const mode =
      this.reflector.getAllAndOverride<CustomerAuthMode>(CUSTOMER_AUTH_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? (isAccountController(context.getClass()) ? 'required' : undefined);
    if (!mode) return true;

    const req = context.switchToHttp().getRequest<CustomerRequest>();
    const token = (req.cookies as Record<string, string> | undefined)?.[CUSTOMER_COOKIE];
    const customer = token ? await this.auth.verifySession(token) : null;

    if (!customer && mode === 'required') {
      throw new UnauthorizedException(
        token ? 'Your session has expired. Please log in again.' : 'Please log in to continue',
      );
    }
    if (customer) req.customer = customer;
    return true;
  }
}

function isAccountController(target: object): boolean {
  const raw: unknown = Reflect.getMetadata(PATH_METADATA, target);
  const paths = Array.isArray(raw) ? raw : [raw];
  return paths.some((p) => typeof p === 'string' && /^\/?account(\/|$)/i.test(p.trim()));
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

export const CSRF_HEADER = 'x-requested-with';
const SKIP_CSRF = 'skipCsrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// For endpoints called by other servers, never by browsers (e.g. payment webhooks).
export const SkipCsrf = () => SetMetadata(SKIP_CSRF, true);

/**
 * Cookie auth CSRF protection: every state-changing request must send an
 * X-Requested-With header. A cross-site form cannot set custom headers, and
 * a cross-site fetch that does triggers a CORS preflight, which only allows
 * FRONTEND_URL. Registered globally.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    if (!req.get(CSRF_HEADER)) {
      throw new ForbiddenException(
        'This request is missing the X-Requested-With header. Please refresh the page and try again.',
      );
    }
    return true;
  }
}

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import { ADMIN_COOKIE } from './auth.types.js';
import { IS_PUBLIC_KEY, type AdminRequest } from './decorators.js';

// Registered globally. Protects every controller whose path starts with "admin"
// (served under /api/admin/...) unless the handler is marked @Public().
// Decided from controller metadata, not the URL, so path tricks can't bypass it.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    if (!isAdminController(context.getClass())) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AdminRequest>();
    const token = (req.cookies as Record<string, string> | undefined)?.[
      ADMIN_COOKIE
    ];
    if (!token) {
      throw new UnauthorizedException('Please log in to continue');
    }

    const admin = await this.auth.verifyToken(token);
    if (!admin) {
      throw new UnauthorizedException(
        'Your session has expired. Please log in again.',
      );
    }

    req.admin = admin;
    return true;
  }
}

function isAdminController(target: object): boolean {
  const raw: unknown = Reflect.getMetadata(PATH_METADATA, target);
  const paths = Array.isArray(raw) ? raw : [raw];
  return paths.some(
    (p) =>
      typeof p === 'string' &&
      /^\/?admin(\/|$)/i.test(p.trim()),
  );
}

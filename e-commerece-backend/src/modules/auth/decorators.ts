import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AdminProfile } from './auth.types.js';

export const IS_PUBLIC_KEY = 'isPublic';

// Skips AdminGuard on an /api/admin route (e.g. the login endpoint).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export type AdminRequest = Request & { admin?: AdminProfile };

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminProfile | undefined =>
    ctx.switchToHttp().getRequest<AdminRequest>().admin,
);

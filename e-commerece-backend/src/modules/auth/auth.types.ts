import type { AdminRole } from '../../generated/prisma/client.js';

export const ADMIN_COOKIE = 'admin_token';

export interface AdminJwtPayload {
  sub: string;
  role: AdminRole;
  scope: 'admin';
}

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  lastLoginAt: Date | null;
}

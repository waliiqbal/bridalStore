import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hashPassword, verifyPassword } from '../../common/password.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AdminJwtPayload, AdminProfile } from './auth.types.js';

const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  lastLoginAt: true,
} as const;

@Injectable()
export class AuthService {
  // Verified against for unknown emails so response time doesn't reveal which emails exist.
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; admin: AdminProfile }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!admin) {
      this.dummyHash ??= hashPassword('dummy-password-for-timing');
      await verifyPassword(await this.dummyHash, password).catch(() => false);
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordOk = await verifyPassword(admin.passwordHash, password);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!admin.isActive) {
      throw new ForbiddenException(
        'This account has been disabled. Please contact the store owner.',
      );
    }

    const updated = await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
      select: PROFILE_SELECT,
    });

    const payload: AdminJwtPayload = {
      sub: admin.id,
      role: admin.role,
      scope: 'admin',
    };
    const token = await this.jwt.signAsync(payload);

    return { token, admin: updated };
  }

  async verifyToken(token: string): Promise<AdminProfile | null> {
    let payload: AdminJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<AdminJwtPayload>(token);
    } catch {
      return null;
    }
    if (payload.scope !== 'admin') return null;

    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { ...PROFILE_SELECT, isActive: true },
    });
    if (!admin?.isActive) return null;

    const { isActive: _, ...profile } = admin;
    return profile;
  }
}

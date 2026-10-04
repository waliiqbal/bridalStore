import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

const PASSWORD = 'correct-horse-battery-staple';

describe('AuthService.login', () => {
  let passwordHash: string;
  let findUnique: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let signAsync: ReturnType<typeof vi.fn>;
  let service: AuthService;

  const adminRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'admin_1',
    email: 'owner@example.com',
    name: 'Owner',
    role: 'OWNER',
    isActive: true,
    lastLoginAt: null,
    passwordHash,
    ...overrides,
  });

  beforeAll(async () => {
    passwordHash = await argon2.hash(PASSWORD);
  });

  beforeEach(() => {
    findUnique = vi.fn();
    update = vi.fn(({ where }: { where: { id: string } }) => ({
      id: where.id,
      email: 'owner@example.com',
      name: 'Owner',
      role: 'OWNER',
      lastLoginAt: new Date(),
    }));
    signAsync = vi.fn().mockResolvedValue('signed.jwt.token');

    const prisma = { adminUser: { findUnique, update } };
    const jwt = { signAsync };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
    );
  });

  it('logs in with the correct password, updates lastLoginAt and returns a token', async () => {
    findUnique.mockResolvedValue(adminRow());

    const result = await service.login('  Owner@Example.com ', PASSWORD);

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'owner@example.com' },
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'admin_1' },
        data: { lastLoginAt: expect.any(Date) },
      }),
    );
    expect(signAsync).toHaveBeenCalledWith({
      sub: 'admin_1',
      role: 'OWNER',
      scope: 'admin',
    });
    expect(result.token).toBe('signed.jwt.token');
    expect(result.admin).not.toHaveProperty('passwordHash');
  });

  it('rejects a wrong password without updating lastLoginAt', async () => {
    findUnique.mockResolvedValue(adminRow());

    await expect(service.login('owner@example.com', 'wrong')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(update).not.toHaveBeenCalled();
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('rejects an unknown email with the same message as a wrong password', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      service.login('nobody@example.com', PASSWORD),
    ).rejects.toThrow('Invalid email or password');
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('rejects an inactive admin even with the correct password', async () => {
    findUnique.mockResolvedValue(adminRow({ isActive: false }));

    await expect(service.login('owner@example.com', PASSWORD)).rejects.toThrow(
      ForbiddenException,
    );
    expect(update).not.toHaveBeenCalled();
    expect(signAsync).not.toHaveBeenCalled();
  });
});

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { Env } from '../../../config/env.validation.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { MAIL_SERVICE, type MailService } from '../../mail/mail.service.js';
import {
  CUSTOMER_JWT,
  CUSTOMER_PROFILE_SELECT,
  type CustomerJwtPayload,
  type CustomerProfile,
} from './customer-session.js';
import type { RegisterDto } from './dto/customer-auth.dto.js';
import {
  generateResetToken,
  hashResetToken,
  looksLikeResetToken,
  resetTokenExpiry,
  resetTokenState,
} from './reset-token.js';

const INVALID_LINK = 'This link is invalid or has expired. Please request a new one.';

export type RegisterResult =
  | { status: 'CREATED'; customer: CustomerProfile; token: string }
  | { status: 'CHECK_EMAIL' };

@Injectable()
export class CustomerAuthService {
  private readonly logger = new Logger(CustomerAuthService.name);
  // Verified against for unknown emails so response time doesn't reveal which emails exist.
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CUSTOMER_JWT) private readonly jwt: JwtService,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * New email → account created and signed in.
   * Email used by a guest checkout (no password yet) → we email a link to
   * finish the account instead, so nobody can claim someone else's orders
   * just by typing their email address.
   */
  async register(dto: RegisterDto): Promise<RegisterResult> {
    const email = normalizeEmail(dto.email);
    const existing = await this.prisma.customer.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    if (existing?.passwordHash) {
      throw new ConflictException(
        'An account with this email already exists. Please log in, or reset your password if you have forgotten it.',
      );
    }
    if (existing) {
      this.requestPasswordReset(email);
      return { status: 'CHECK_EMAIL' };
    }

    const customer = await this.prisma.customer.create({
      data: {
        email,
        passwordHash: await argon2.hash(dto.password),
        firstName: dto.firstName?.trim() || null,
        lastName: dto.lastName?.trim() || null,
        marketingOptIn: dto.marketingOptIn ?? false,
      },
      select: { ...CUSTOMER_PROFILE_SELECT, sessionVersion: true },
    });
    const { sessionVersion, ...profile } = customer;
    return { status: 'CREATED', customer: profile, token: await this.issueSession(customer.id, sessionVersion) };
  }

  async login(email: string, password: string): Promise<{ customer: CustomerProfile; token: string }> {
    const customer = await this.prisma.customer.findUnique({
      where: { email: normalizeEmail(email) },
      select: { ...CUSTOMER_PROFILE_SELECT, passwordHash: true, isActive: true, sessionVersion: true },
    });

    // Guest customers (no password yet) are treated like unknown emails.
    if (!customer?.passwordHash) {
      this.dummyHash ??= argon2.hash('dummy-password-for-timing');
      await argon2.verify(await this.dummyHash, password).catch(() => false);
      throw new UnauthorizedException('Invalid email or password');
    }
    const ok = await argon2.verify(customer.passwordHash, password).catch(() => false);
    if (!ok) throw new UnauthorizedException('Invalid email or password');
    if (!customer.isActive) {
      throw new ForbiddenException('This account has been disabled. Please contact us for help.');
    }

    const { passwordHash: _h, isActive: _a, sessionVersion, ...profile } = customer;
    return { customer: profile, token: await this.issueSession(customer.id, sessionVersion) };
  }

  issueSession(customerId: string, sessionVersion: number): Promise<string> {
    const payload: CustomerJwtPayload = { sub: customerId, sv: sessionVersion, scope: 'customer' };
    return this.jwt.signAsync(payload);
  }

  // Signed by the customer secret, customer scope, active, same session version.
  async verifySession(token: string): Promise<CustomerProfile | null> {
    let payload: CustomerJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<CustomerJwtPayload>(token);
    } catch {
      return null;
    }
    if (payload.scope !== 'customer' || typeof payload.sub !== 'string') return null;

    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.sub },
      select: { ...CUSTOMER_PROFILE_SELECT, isActive: true, sessionVersion: true },
    });
    if (!customer?.isActive || customer.sessionVersion !== payload.sv) return null;
    const { isActive: _a, sessionVersion: _v, ...profile } = customer;
    return profile;
  }

  /**
   * Always returns immediately with no result, so the response is identical
   * (content and timing) whether or not the email has an account.
   */
  requestPasswordReset(email: string): void {
    void this.sendResetLink(normalizeEmail(email)).catch((error: unknown) =>
      this.logger.error(`Could not send password reset email: ${String(error)}`),
    );
  }

  async resetPassword(token: string, password: string): Promise<void> {
    if (!looksLikeResetToken(token)) throw new BadRequestException(INVALID_LINK);

    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(token) },
      select: { id: true, expiresAt: true, usedAt: true, customerId: true, customer: { select: { isActive: true } } },
    });
    if (resetTokenState(row) !== 'VALID' || !row?.customer.isActive) {
      throw new BadRequestException(INVALID_LINK);
    }

    const passwordHash = await argon2.hash(password);
    await this.prisma.$transaction(async (tx) => {
      // Marking it used only if still unused makes the token single-use under races.
      const { count } = await tx.passwordResetToken.updateMany({
        where: { id: row.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (count !== 1) throw new BadRequestException(INVALID_LINK);

      await tx.customer.update({
        where: { id: row.customerId },
        // New sessionVersion signs out every existing session
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      await tx.passwordResetToken.deleteMany({
        where: { customerId: row.customerId, id: { not: row.id } },
      });
    });
  }

  /** Returns a fresh session token for the current device; other sessions are signed out. */
  async changePassword(customerId: string, currentPassword: string, newPassword: string): Promise<string> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { passwordHash: true },
    });
    const ok = customer?.passwordHash
      ? await argon2.verify(customer.passwordHash, currentPassword).catch(() => false)
      : false;
    if (!ok) throw new BadRequestException('Your current password is not correct');

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: { passwordHash: await argon2.hash(newPassword), sessionVersion: { increment: 1 } },
      select: { sessionVersion: true },
    });
    return this.issueSession(customerId, updated.sessionVersion);
  }

  private async sendResetLink(email: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { email },
      select: { id: true, isActive: true, passwordHash: true, firstName: true },
    });
    if (!customer?.isActive) return;

    const { token, tokenHash } = generateResetToken();
    await this.prisma.$transaction([
      // A new link replaces any older unused ones
      this.prisma.passwordResetToken.deleteMany({ where: { customerId: customer.id, usedAt: null } }),
      this.prisma.passwordResetToken.create({
        data: { customerId: customer.id, tokenHash, expiresAt: resetTokenExpiry() },
      }),
    ]);

    const storefront = this.config.get('STOREFRONT_URL', { infer: true });
    const greeting = customer.firstName ? `Hi ${customer.firstName},` : 'Hi,';
    const isNewAccount = !customer.passwordHash;
    const link = `${storefront}/account/${isNewAccount ? 'set-password' : 'reset-password'}?token=${token}`;

    await this.mail.send({
      to: email,
      subject: isNewAccount ? 'Finish creating your account' : 'Reset your password',
      text: [
        greeting,
        '',
        isNewAccount
          ? 'Someone (hopefully you) asked to create an account with this email. Your past orders will be kept. Choose a password here:'
          : 'We received a request to reset your password. Choose a new one here:',
        link,
        '',
        'This link works once and expires in 1 hour. If you did not ask for this, you can ignore this email.',
      ].join('\n'),
    });
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

import { Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import type { SmtpEnv } from '../../config/env.validation.js';

export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailService {
  send(message: MailMessage): Promise<void>;
}

/**
 * Development driver: prints each email (with its links) to the server log
 * and keeps the most recent ones in memory so tests can read them.
 */
export class ConsoleMailService implements MailService {
  private readonly logger = new Logger('Mail');
  private readonly outbox: (MailMessage & { from: string; sentAt: Date })[] = [];

  constructor(private readonly from: string) {}

  send(message: MailMessage): Promise<void> {
    this.outbox.push({ ...message, from: this.from, sentAt: new Date() });
    if (this.outbox.length > 50) this.outbox.shift();
    this.logger.log(
      `\n──── Email (console driver, not actually sent) ────\nFrom: ${this.from}\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n───────────────────────────────────────────────────`,
    );
    return Promise.resolve();
  }

  // Most recent email to `to` (newest first), for tests and local debugging.
  lastTo(to: string) {
    return [...this.outbox].reverse().find((m) => m.to === to.toLowerCase());
  }
}

// Real emails through any SMTP server (Gmail, Zoho, cPanel mail, Mailgun, ...).
export class SmtpMailService implements MailService {
  private readonly transport: Transporter;

  constructor(
    private readonly from: string,
    smtp: SmtpEnv,
  ) {
    this.transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
      connectionTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}

// Real emails through Resend's HTTP API (no extra package needed).
export class ProviderMailService implements MailService {
  constructor(
    private readonly from: string,
    private readonly apiKey: string,
  ) {}

  async send(message: MailMessage): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(
        `Email provider refused the message (${response.status}): ${(await response.text()).slice(0, 200)}`,
      );
    }
  }
}

import { Logger } from '@nestjs/common';

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

// Placeholder for the real email provider (templates + provider in phase 7).
export class ProviderMailService implements MailService {
  send(): Promise<void> {
    return Promise.reject(
      new Error('MAIL_DRIVER=provider is not available yet (added in phase 7). Use MAIL_DRIVER=console.'),
    );
  }
}

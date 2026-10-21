import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation.js';
import {
  ConsoleMailService,
  MAIL_SERVICE,
  ProviderMailService,
  SmtpMailService,
  type MailService,
} from './mail.service.js';

@Global()
@Module({
  providers: [
    {
      provide: MAIL_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): MailService => {
        if (config.get('MAIL_DRIVER', { infer: true }) === 'smtp') {
          return new SmtpMailService(
            config.get('MAIL_FROM', { infer: true }),
            config.getOrThrow('SMTP', { infer: true }),
          );
        }
        if (config.get('MAIL_DRIVER', { infer: true }) === 'provider') {
          return new ProviderMailService(
            config.get('MAIL_FROM', { infer: true }),
            config.getOrThrow('RESEND_API_KEY', { infer: true }),
          );
        }
        if (config.get('NODE_ENV', { infer: true }) === 'production') {
          new Logger('Mail').warn(
            'MAIL_DRIVER=console in production: customers will NOT receive emails (password resets, orders).',
          );
        }
        return new ConsoleMailService(config.get('MAIL_FROM', { infer: true }));
      },
    },
  ],
  exports: [MAIL_SERVICE],
})
export class MailModule {}

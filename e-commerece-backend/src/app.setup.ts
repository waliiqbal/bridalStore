import { resolve } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import type { Env } from './config/env.validation.js';

// Shared by main.ts and e2e tests so tests run against the real HTTP setup.
export function configureApp(app: INestApplication): INestApplication {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({
    origin: config.get('FRONTEND_URL', { infer: true }).split(','),
    credentials: true,
  });

  // Local storage driver: uploaded images are served by the API itself.
  if (config.get('STORAGE_DRIVER', { infer: true }) === 'local') {
    (app as NestExpressApplication).useStaticAssets(
      resolve(config.get('UPLOADS_DIR', { infer: true })),
      {
        prefix: '/uploads/',
        index: false,
        dotfiles: 'deny',
        // Missing files fall through to Nest's normal JSON 404
        fallthrough: true,
        maxAge: '365d',
        immutable: true,
        setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
      },
    );
  }
  return app;
}

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  return app;
}

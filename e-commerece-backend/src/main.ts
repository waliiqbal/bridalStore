import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Env } from './config/env.validation.js';

async function bootstrap() {
  // rawBody: webhooks verify signatures over the exact bytes received
  const app = configureApp(await NestFactory.create(AppModule, { rawBody: true }));
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();

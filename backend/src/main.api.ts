import { ConfigService } from '@nestjs/config';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { exitOnBootstrapFailure } from './bootstrap-failure';
import { ApiModule } from './api.module';
import type { ApiEnv } from './config/env';
import { setupApiApp } from './setup-api-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    ApiModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
      // Errors before pino takes over (e.g. invalid env) are printed by this logger: JSON in production.
      logger: new ConsoleLogger({
        json: process.env.NODE_ENV === 'production',
      }),
    },
  );
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.enableShutdownHooks();
  await setupApiApp(app);

  const port = app
    .get<ConfigService<ApiEnv, true>>(ConfigService)
    .get('API_PORT', { infer: true });
  await app.listen({ port, host: '0.0.0.0' });
  logger.log(`API listening on port ${port}`);
}

bootstrap().catch(exitOnBootstrapFailure);

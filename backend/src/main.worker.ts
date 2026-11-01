import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { exitOnBootstrapFailure } from './bootstrap-failure';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
    // Errors before pino takes over (e.g. invalid env) are printed by this logger: JSON in production.
    logger: new ConsoleLogger({ json: process.env.NODE_ENV === 'production' }),
  });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.enableShutdownHooks();
  logger.log('Worker started');
}

bootstrap().catch(exitOnBootstrapFailure);

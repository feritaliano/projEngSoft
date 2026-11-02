import { Type } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { ApiModule } from '../../src/api.module';
import { setupApiApp } from '../../src/setup-api-app';

export interface ApiAppOptions {
  /** Replace providers (e.g. an unreachable database, a different rate limit). */
  override?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
  /** Test-only controllers mounted next to the real ones (e.g. a protected probe route). */
  controllers?: Type[];
}

/** The real ApiModule set up by the same function as main.api.ts, against the Testcontainers database. */
export async function createApiApp(
  options: ApiAppOptions = {},
): Promise<NestFastifyApplication> {
  const builder = Test.createTestingModule({
    imports: [ApiModule],
    controllers: options.controllers ?? [],
  });
  const moduleRef = await (options.override ?? ((b) => b))(builder).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
    { bufferLogs: true },
  );
  app.useLogger(app.get(Logger));
  await setupApiApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

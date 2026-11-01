import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { ApiModule } from '../../src/api.module';
import { setupApiApp } from '../../src/setup-api-app';

/** The real ApiModule set up by the same function as main.api.ts, against the Testcontainers database. */
export async function createApiApp(
  override: (builder: TestingModuleBuilder) => TestingModuleBuilder = (
    builder,
  ) => builder,
): Promise<NestFastifyApplication> {
  const moduleRef = await override(
    Test.createTestingModule({ imports: [ApiModule] }),
  ).compile();
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

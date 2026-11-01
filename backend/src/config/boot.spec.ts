import type { Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// The root modules validate the env while Nest builds them, so neither process boots with an invalid env (D52).
describe('boot of the root modules (D52)', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  function loadRootModule<T>(modulePath: string, exportName: string): T {
    let rootModule: T | undefined;
    jest.isolateModules(() => {
      rootModule =
        jest.requireActual<Record<string, T>>(modulePath)[exportName];
    });
    return rootModule as T;
  }

  it('api does not boot without CORS_ORIGIN', async () => {
    process.env = {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://u:p@localhost:5432/x',
    };
    const ApiModule = loadRootModule<Type>('../api.module', 'ApiModule');

    await expect(
      Test.createTestingModule({ imports: [ApiModule] }).compile(),
    ).rejects.toThrow(/CORS_ORIGIN/);
  });

  it('worker does not boot with an invalid DATABASE_URL', async () => {
    process.env = { NODE_ENV: 'test', DATABASE_URL: 'not-a-url' };
    const WorkerModule = loadRootModule<Type>(
      '../worker.module',
      'WorkerModule',
    );

    await expect(
      Test.createTestingModule({ imports: [WorkerModule] }).compile(),
    ).rejects.toThrow(/DATABASE_URL/);
  });

  it('worker boots with a valid env (no database needed) and shuts down cleanly', async () => {
    process.env = {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/x',
      LOG_LEVEL: 'silent',
    };
    // Same isolated registry for the module and @nestjs/core, so Nest sees a single set of framework classes.
    let loaded!: {
      NestFactory: typeof import('@nestjs/core').NestFactory;
      WorkerModule: Type;
      WorkerHeartbeat: Type;
      Logger: Type;
    };
    jest.isolateModules(() => {
      loaded = {
        NestFactory:
          jest.requireActual<typeof import('@nestjs/core')>('@nestjs/core')
            .NestFactory,
        WorkerModule:
          jest.requireActual<Record<string, Type>>('../worker.module')
            .WorkerModule,
        WorkerHeartbeat: jest.requireActual<Record<string, Type>>(
          '../worker/worker-heartbeat',
        ).WorkerHeartbeat,
        Logger: jest.requireActual<Record<string, Type>>('nestjs-pino').Logger,
      };
    });

    const app = await loaded.NestFactory.createApplicationContext(
      loaded.WorkerModule,
      {
        logger: false,
        abortOnError: false,
      },
    );
    try {
      expect(app.get(loaded.Logger)).toBeDefined();
      expect(app.get(loaded.WorkerHeartbeat)).toBeDefined();
    } finally {
      await app.close();
    }
  });
});

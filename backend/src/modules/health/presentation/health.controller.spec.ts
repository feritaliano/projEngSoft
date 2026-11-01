import { HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import {
  HealthCheckService,
  HealthIndicatorService,
  TerminusModule,
} from '@nestjs/terminus';
import { Test } from '@nestjs/testing';
import { ProblemException } from '../../../shared/presentation/problem-details';
import { DatabasePing } from '../application/database-ping';
import { HealthController } from './health.controller';

async function controllerWith(
  ping: DatabasePing['ping'],
): Promise<HealthController> {
  const moduleRef = await Test.createTestingModule({
    imports: [TerminusModule.forRoot({ logger: false })],
    controllers: [HealthController],
    providers: [{ provide: DatabasePing, useValue: { ping } }],
  }).compile();
  moduleRef.useLogger(false);
  return moduleRef.get(HealthController);
}

describe('HealthController (D52)', () => {
  it('reports ok when the database answers', async () => {
    const controller = await controllerWith(() => Promise.resolve());

    await expect(controller.check()).resolves.toMatchObject({
      status: 'ok',
      details: { database: { status: 'up' } },
    });
  });

  it('throws a 503 problem listing the failed check when the database does not answer', async () => {
    const controller = await controllerWith(() =>
      Promise.reject(new Error('ECONNREFUSED 127.0.0.1:5432')),
    );

    const error: unknown = await controller.check().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProblemException);
    const problem = error as ProblemException;
    expect(problem.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(problem.extensions).toEqual({ checks: { database: 'down' } });
    expect(JSON.stringify(problem.extensions)).not.toContain('ECONNREFUSED');
  });

  it('rethrows errors that are not a failed health check', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: { check: () => Promise.reject(new TypeError('bug')) },
        },
        { provide: HealthIndicatorService, useValue: {} },
        { provide: DatabasePing, useValue: { ping: jest.fn() } },
      ],
    }).compile();

    await expect(moduleRef.get(HealthController).check()).rejects.toThrow(
      TypeError,
    );
  });

  it('still answers 503 (without checks) when terminus fails with an unexpected body', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: () =>
              Promise.reject(new ServiceUnavailableException('shutting down')),
          },
        },
        { provide: HealthIndicatorService, useValue: {} },
        { provide: DatabasePing, useValue: { ping: jest.fn() } },
      ],
    }).compile();

    const error: unknown = await moduleRef
      .get(HealthController)
      .check()
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProblemException);
    expect((error as ProblemException).getStatus()).toBe(503);
    expect((error as ProblemException).extensions).toEqual({});
  });
});

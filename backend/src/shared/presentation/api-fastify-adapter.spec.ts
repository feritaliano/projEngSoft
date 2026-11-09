import { Controller, Get, Logger, Param } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import type { FastifyError } from 'fastify';
import { configureApiApp } from '../../configure-api-app';
import { ApiFastifyAdapter, routerErrorProblem } from './api-fastify-adapter';

const PROBLEM_JSON = 'application/problem+json; charset=utf-8';

@Controller('probe')
class ProbeController {
  @Get(':id')
  show(@Param('id') id: string) {
    return { id };
  }
}

async function createApp(
  adapter: ApiFastifyAdapter,
): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [ProbeController],
  }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(adapter, {
    logger: false,
  });
  await configureApiApp(app, {
    corsOrigin: 'http://localhost:4200',
    production: true,
  });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

describe('ApiFastifyAdapter: router errors and shutdown in problem+json (D52, K2 pending item)', () => {
  let adapter: ApiFastifyAdapter;
  let app: NestFastifyApplication;
  const securityHook = jest.fn(
    (_request: unknown, raw: { setHeader(n: string, v: string): unknown }) => {
      raw.setHeader('x-security-hook', 'ran');
      return undefined;
    },
  );

  beforeEach(async () => {
    securityHook.mockClear();
    adapter = new ApiFastifyAdapter();
    // Stands for Nest's security hook (app.useSecurityHeaders / CSRF), which the router errors must still run.
    adapter.registerSecurityHook(securityHook);
    app = await createApp(adapter);
  });

  afterEach(async () => {
    await app.close();
  });

  it('answers a malformed URL (FST_ERR_BAD_URL) with 400 problem+json, without echoing the URL', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/probe/%c0secret',
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toBe(PROBLEM_JSON);
    expect(response.json()).toEqual({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'The request URL is malformed.',
    });
    expect(response.body).not.toContain('secret');
  });

  it('answers an over-long path parameter with 414 problem+json', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/probe/${'a'.repeat(200)}`,
    });

    expect(response.statusCode).toBe(414);
    expect(response.headers['content-type']).toBe(PROBLEM_JSON);
    expect(response.json()).toEqual({
      type: 'about:blank',
      title: 'URI Too Long',
      status: 414,
      detail: 'A path parameter is too long.',
    });
  });

  it("keeps running Nest's security hook on router errors", async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/probe/%c0',
    });

    expect(securityHook).toHaveBeenCalledTimes(1);
    expect(response.headers['x-security-hook']).toBe('ran');
  });

  it('still answers the router error when the security hook throws', async () => {
    securityHook.mockImplementationOnce(() => {
      throw new Error('csrf exclude predicate failed');
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/probe/%c0',
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toBe(PROBLEM_JSON);
  });

  it('serves normal routes until shutdown starts', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/probe/abc',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: 'abc' });
  });

  it('keeps the CORS and security hook headers on the shutdown 503, so the browser can read it', async () => {
    adapter.beforeClose();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/probe/abc',
      headers: { origin: 'http://localhost:4200' },
    });

    expect(response.statusCode).toBe(503);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:4200',
    );
    expect(response.headers['x-security-hook']).toBe('ran');
  });

  it('answers 503 problem+json with Connection: close once shutdown starts', async () => {
    adapter.beforeClose();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/probe/abc',
    });

    expect(response.statusCode).toBe(503);
    expect(response.headers['content-type']).toBe(PROBLEM_JSON);
    expect(response.headers.connection).toBe('close');
    expect(response.json()).toEqual({
      type: 'about:blank',
      title: 'Service Unavailable',
      status: 503,
      detail: 'The server is shutting down. Try again.',
    });
  });
});

describe('routerErrorProblem (D52)', () => {
  function fastifyError(code: string, statusCode?: number): FastifyError {
    return Object.assign(new Error(`'/raw/url' failed`), {
      name: 'FastifyError',
      code,
      statusCode,
    });
  }

  it('hides any other router error behind a generic 500 and logs it', () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const problem = routerErrorProblem(
      fastifyError('FST_ERR_ASYNC_CONSTRAINT', 500),
    );

    expect(problem).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred.',
    });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'FST_ERR_ASYNC_CONSTRAINT' }),
      'Router error',
    );
    log.mockRestore();
  });

  it('treats a router error without status as a 500', () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    expect(routerErrorProblem(fastifyError('FST_ERR_UNKNOWN')).status).toBe(
      500,
    );
    log.mockRestore();
  });
});

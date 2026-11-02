import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Logger,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import { configureApiApp } from './configure-api-app';
import { ProblemException } from './shared/presentation/problem-details';

const FRONTEND_ORIGIN = 'http://localhost:4200';

class EchoDto {
  @IsString()
  name: string;
}

@Controller('probe')
class ProbeController {
  @Get()
  ok() {
    return { ok: true };
  }

  @Get('crash')
  crash(): never {
    throw new Error('database password is hunter2');
  }

  @Get('unavailable')
  unavailable(): never {
    throw new ProblemException(HttpStatus.SERVICE_UNAVAILABLE, 'maintenance');
  }

  @Get('library-5xx')
  library5xx(): never {
    throw new ServiceUnavailableException('pool exhausted at db-host:5432');
  }

  @Get('prisma-validation')
  prismaValidation(): never {
    const error = new Error(
      'Invalid prisma.user.create() invocation:\n  data: { email: "ana@example.com", passwordHash: "$argon2id$secret" }',
    );
    error.name = 'PrismaClientValidationError';
    throw error;
  }

  @Post()
  echo(@Body() body: EchoDto) {
    return body;
  }
}

async function createApp(production: boolean): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [ProbeController],
  }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
    { logger: false },
  );
  await configureApiApp(app, { corsOrigin: FRONTEND_ORIGIN, production });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

describe('configureApiApp (D52)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createApp(false);
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves routes under /api/v1', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/probe' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it('returns 404 as problem+json for an unknown route', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/nope?search=x',
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toBe(
      'application/problem+json; charset=utf-8',
    );
    expect(response.json()).toMatchObject({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      instance: '/api/v1/nope',
    });
  });

  it('does not serve routes without the prefix', async () => {
    const response = await app.inject({ method: 'GET', url: '/probe' });

    expect(response.statusCode).toBe(404);
  });

  it('rejects invalid and unknown body fields with 400 problem+json (ValidationPipe)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/probe',
      payload: { name: 1, extra: true },
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toBe(
      'application/problem+json; charset=utf-8',
    );
    expect(response.json()).toMatchObject({
      status: 400,
      detail: 'The request is invalid.',
      errors: expect.arrayContaining([
        'property extra should not exist',
        'name must be a string',
      ]) as unknown,
    });
  });

  it('hides unexpected errors behind a generic 500 without stack or message', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/probe/crash',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred.',
      instance: '/api/v1/probe/crash',
    });
    expect(response.body).not.toContain('hunter2');
  });

  it('logs unexpected errors at error level with the error object', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    try {
      await app.inject({ method: 'GET', url: '/api/v1/probe/crash' });
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error), status: 500 }),
        'Unhandled exception',
      );
    } finally {
      error.mockRestore();
    }
  });

  it('logs a deliberate 5xx ProblemException at warn level, keeping its detail', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/probe/unavailable',
      });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({ detail: 'maintenance' });
      expect(warn).toHaveBeenCalledWith(
        { status: 503, instance: '/api/v1/probe/unavailable' },
        'Request failed with a server error',
      );
      expect(error).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      error.mockRestore();
    }
  });

  it('hides the message of a 5xx HttpException from a library and logs its cause at error level', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/probe/library-5xx',
      });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({
        detail: 'The server could not complete the request.',
      });
      expect(response.body).not.toContain('db-host');
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.any(ServiceUnavailableException),
          status: 503,
        }),
        'Unhandled exception',
      );
    } finally {
      error.mockRestore();
    }
  });

  it('logs a Prisma validation error without its message, which quotes the call arguments (D52)', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/probe/prisma-validation',
      });

      expect(response.statusCode).toBe(500);
      const [logged] = error.mock.calls[0] as [
        { err: { name: string; stack: string } },
      ];
      expect(logged.err.name).toBe('PrismaClientValidationError');
      expect(logged.err.stack).toMatch(/^\s+at /);
      expect(JSON.stringify(logged)).not.toMatch(
        /ana@example\.com|argon2id|Invalid prisma/,
      );
    } finally {
      error.mockRestore();
    }
  });

  it('allows CORS with credentials only for the frontend origin', async () => {
    const allowed = await app.inject({
      method: 'GET',
      url: '/api/v1/probe',
      headers: { origin: FRONTEND_ORIGIN },
    });
    const denied = await app.inject({
      method: 'GET',
      url: '/api/v1/probe',
      headers: { origin: 'https://evil.example' },
    });

    expect(allowed.headers['access-control-allow-origin']).toBe(
      FRONTEND_ORIGIN,
    );
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers the CORS preflight for the frontend origin', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/probe',
      headers: {
        origin: FRONTEND_ORIGIN,
        'access-control-request-method': 'POST',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      FRONTEND_ORIGIN,
    );
  });

  it('sends helmet security headers, without CSP outside production (Swagger UI)', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/probe' });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['content-security-policy']).toBeUndefined();
  });

  it('sends the default CSP in production', async () => {
    const productionApp = await createApp(true);
    try {
      const response = await productionApp.inject({
        method: 'GET',
        url: '/api/v1/probe',
      });
      expect(response.headers['content-security-policy']).toContain(
        "default-src 'self'",
      );
    } finally {
      await productionApp.close();
    }
  });
});

import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { setupApiApp } from './setup-api-app';

@Controller('probe')
class ProbeController {
  @Get()
  ok() {
    return { ok: true };
  }
}

async function createApp(
  env: Record<string, string>,
): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [ProbeController],
    providers: [
      { provide: ConfigService, useValue: { get: (key: string) => env[key] } },
    ],
  }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
    { logger: false },
  );
  await setupApiApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

describe('setupApiApp (D52)', () => {
  it('serves the Swagger UI outside production and uses CORS_ORIGIN from the config', async () => {
    const app = await createApp({
      NODE_ENV: 'development',
      CORS_ORIGIN: 'http://localhost:4300',
    });
    try {
      const docs = await app.inject({ method: 'GET', url: '/api/docs' });
      const cors = await app.inject({
        method: 'GET',
        url: '/api/v1/probe',
        headers: { origin: 'http://localhost:4300' },
      });

      expect(docs.statusCode).toBe(200);
      expect(docs.headers['content-type']).toContain('text/html');
      expect(cors.headers['access-control-allow-origin']).toBe(
        'http://localhost:4300',
      );
    } finally {
      await app.close();
    }
  });

  it('hides the Swagger UI and enables the CSP in production', async () => {
    const app = await createApp({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://carteira.example',
    });
    try {
      const docs = await app.inject({ method: 'GET', url: '/api/docs' });
      const probe = await app.inject({ method: 'GET', url: '/api/v1/probe' });

      expect(docs.statusCode).toBe(404);
      expect(docs.headers['content-type']).toContain(
        'application/problem+json',
      );
      expect(probe.headers['content-security-policy']).toBeDefined();
    } finally {
      await app.close();
    }
  });
});

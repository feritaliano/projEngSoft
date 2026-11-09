import { Controller, Get, HttpStatus, Post } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ApiCookieAuth, ApiOkResponse } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { configureApiApp } from '../configure-api-app';
import { ApiFastifyAdapter } from '../shared/presentation/api-fastify-adapter';
import { REFRESH_TOKEN_SCHEME } from '../shared/presentation/api-security';
import { Public } from '../shared/presentation/auth-context';
import { ApiProblemResponse } from '../shared/presentation/problem-details.dto';
import { buildOpenApiDocument } from './openapi-document';

@Public()
@Controller('open')
class PublicController {
  @Get()
  list() {
    return [];
  }

  @Post('cookie')
  @ApiCookieAuth(REFRESH_TOKEN_SCHEME)
  cookie() {
    return {};
  }
}

@Controller('mixed')
class MixedController {
  @Get('protected')
  @ApiOkResponse()
  protectedRoute() {
    return {};
  }

  @Get('own-401')
  @ApiProblemResponse(HttpStatus.UNAUTHORIZED, 'Custom 401.')
  ownUnauthorized() {
    return {};
  }

  @Get('public')
  @Public()
  publicRoute() {
    return {};
  }
}

async function documentOf() {
  const moduleRef = await Test.createTestingModule({
    controllers: [PublicController, MixedController],
  }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new ApiFastifyAdapter(),
    { logger: false },
  );
  await configureApiApp(app, {
    corsOrigin: 'http://localhost',
    production: false,
  });
  try {
    return buildOpenApiDocument(app);
  } finally {
    await app.close();
  }
}

describe('buildOpenApiDocument (D52, audit of 09/11)', () => {
  let document: Awaited<ReturnType<typeof documentOf>>;

  beforeAll(async () => {
    document = await documentOf();
  });

  it('defines the bearer and refresh_token security schemes', () => {
    expect(document.components?.securitySchemes).toEqual({
      bearer: expect.objectContaining({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      }) as unknown,
      refresh_token: expect.objectContaining({
        type: 'apiKey',
        in: 'cookie',
        name: 'refresh_token',
      }) as unknown,
    });
  });

  it('requires the bearer scheme by default and documents the 401 of protected routes', () => {
    const operation = document.paths['/api/v1/mixed/protected'].get;

    expect(document.security).toEqual([{ bearer: [] }]);
    expect(operation?.security).toBeUndefined();
    expect(operation?.responses['401']).toEqual({
      description: 'Missing, malformed or expired access token.',
      content: {
        'application/problem+json': {
          schema: { $ref: '#/components/schemas/ProblemDetails' },
        },
      },
    });
  });

  it('keeps a 401 the route documents itself', () => {
    expect(
      document.paths['/api/v1/mixed/own-401'].get?.responses['401'],
    ).toMatchObject({ description: 'Custom 401.' });
  });

  it.each([
    ['a public controller', '/api/v1/open', 'get'],
    [
      'a public method of a protected controller',
      '/api/v1/mixed/public',
      'get',
    ],
  ] as const)(
    'clears the security of %s, without a 401 or the internal marker',
    (_case, path, method) => {
      const operation = document.paths[path][method];

      expect(operation?.security).toEqual([]);
      expect(operation?.responses).not.toHaveProperty('401');
      expect(operation).not.toHaveProperty('x-public-route');
    },
  );

  it('keeps the cookie requirement of a public route that declares it (refresh, logout)', () => {
    expect(document.paths['/api/v1/open/cookie'].post?.security).toEqual([
      { refresh_token: [] },
    ]);
  });

  it('registers the ProblemDetails schema with the field of each 400 error', () => {
    const schemas = document.components?.schemas ?? {};

    expect(schemas.ProblemDetails).toMatchObject({
      required: ['type', 'title', 'status'],
      properties: {
        errors: {
          type: 'array',
          items: { $ref: '#/components/schemas/FieldError' },
        },
        field: { type: 'string' },
      },
    });
    expect(schemas.FieldError).toMatchObject({
      required: ['field', 'message'],
    });
  });
});

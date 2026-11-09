import { HttpStatus, type INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  getSchemaPath,
  OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { REFRESH_COOKIE } from '../modules/auth/presentation/auth.controller';
import {
  BEARER_SCHEME,
  REFRESH_TOKEN_SCHEME,
} from '../shared/presentation/api-security';
import { OPENAPI_PUBLIC_ROUTE } from '../shared/presentation/auth-context';
import {
  PROBLEM_JSON_MEDIA_TYPE,
  ProblemDetailsDto,
} from '../shared/presentation/problem-details.dto';

export const SWAGGER_UI_PATH = 'api/docs';

type OperationObject = NonNullable<OpenAPIObject['paths'][string]['get']>;

const HTTP_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
] as const;

const UNAUTHORIZED_RESPONSE = {
  description: 'Missing, malformed or expired access token.',
  content: {
    [PROBLEM_JSON_MEDIA_TYPE]: {
      schema: { $ref: getSchemaPath(ProblemDetailsDto) },
    },
  },
};

/**
 * Public routes (@Public) override the document-wide bearer requirement with `security: []`, unless they declare
 * their own (the refresh cookie); every other route inherits the bearer requirement and documents its 401.
 */
function applyRouteSecurity(operation: OperationObject): void {
  const extensions = operation as unknown as Record<string, unknown>;
  if (extensions[OPENAPI_PUBLIC_ROUTE]) {
    delete extensions[OPENAPI_PUBLIC_ROUTE];
    operation.security ??= [];
    return;
  }
  operation.responses[HttpStatus.UNAUTHORIZED] ??= UNAUTHORIZED_RESPONSE;
}

/** The API contract (D52). Exported to backend/openapi/openapi.json, from which the frontend generates its client. */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Carteira B3 API')
    .setDescription(
      'API REST da Carteira B3. Erros em RFC 7807 (application/problem+json, schema ProblemDetails); decimais como string; datas ISO 8601. Rotas protegidas exigem o access token (Authorization: Bearer).',
    )
    .setVersion('1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Access token (accessToken) returned by /auth/register, /auth/login and /auth/refresh.',
      },
      BEARER_SCHEME,
    )
    .addCookieAuth(
      REFRESH_COOKIE,
      {
        type: 'apiKey',
        in: 'cookie',
        description:
          'httpOnly refresh token cookie set by /auth/register, /auth/login and /auth/refresh (Path=/api/v1/auth).',
      },
      REFRESH_TOKEN_SCHEME,
    )
    .addSecurityRequirements(BEARER_SCHEME)
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ProblemDetailsDto],
  });
  for (const path of Object.values(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = path[method];
      if (operation) {
        applyRouteSecurity(operation);
      }
    }
  }
  return document;
}

import { ConfigService } from '@nestjs/config';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule } from '@nestjs/swagger';
import type { ApiEnv } from './config/env';
import { configureApiApp } from './configure-api-app';
import {
  buildOpenApiDocument,
  SWAGGER_UI_PATH,
} from './openapi/openapi-document';

/**
 * Everything main.api.ts does before listen, reading the validated config: HTTP pipeline and, outside production
 * only, the Swagger UI (D52). The E2E suite uses the same function, so it cannot drift from the real bootstrap.
 */
export async function setupApiApp(app: NestFastifyApplication): Promise<void> {
  const config = app.get<ConfigService<ApiEnv, true>>(ConfigService);
  const production = config.get('NODE_ENV', { infer: true }) === 'production';

  await configureApiApp(app, {
    corsOrigin: config.get('CORS_ORIGIN', { infer: true }),
    production,
  });

  if (!production) {
    SwaggerModule.setup(SWAGGER_UI_PATH, app, () => buildOpenApiDocument(app));
  }
}

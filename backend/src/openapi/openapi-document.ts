import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_UI_PATH = 'api/docs';

/** The API contract (D52). Exported to backend/openapi/openapi.json, from which the frontend generates its client. */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Carteira B3 API')
    .setDescription(
      'API REST da Carteira B3. Erros em RFC 7807 (application/problem+json); decimais como string; datas ISO 8601.',
    )
    .setVersion('1')
    .build();
  return SwaggerModule.createDocument(app, config);
}

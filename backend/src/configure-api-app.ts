import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { ValidationPipe } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { API_PREFIX } from './shared/presentation/api-prefix';
import { ProblemDetailsFilter } from './shared/presentation/problem-details.filter';

export { API_PREFIX };

export interface ApiAppOptions {
  /** The only origin allowed by CORS: the frontend (D52). */
  corsOrigin: string;
  production: boolean;
}

/** HTTP pipeline shared by main.api.ts, the OpenAPI export and the tests. Must run before app.init(). */
export async function configureApiApp(
  app: NestFastifyApplication,
  options: ApiAppOptions,
): Promise<void> {
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());
  // A list (not a string) makes the CORS headers appear only when the request origin matches.
  app.enableCors({ origin: [options.corsOrigin], credentials: true });

  // The Swagger UI (non-production only) needs inline scripts and styles, which the default CSP blocks.
  await app.register(helmet, {
    contentSecurityPolicy: options.production ? undefined : false,
  });
  await app.register(fastifyCookie);
}

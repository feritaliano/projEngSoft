import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { ApiModule } from '../api.module';
import { configureApiApp } from '../configure-api-app';
import { buildOpenApiDocument } from './openapi-document';

const OUTPUT_FILE = resolve(__dirname, '..', '..', 'openapi', 'openapi.json');

/**
 * npm run openapi:generate — writes the contract to backend/openapi/openapi.json (versioned, checked in CI, D52).
 * Needs a valid env (same validation as the API) but no database: the Prisma pool connects lazily.
 */
async function exportOpenApi(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    ApiModule,
    new FastifyAdapter(),
    { logger: false, abortOnError: false },
  );
  try {
    // The OpenAPI document does not depend on these values; the prefix and pipeline must match the real app.
    await configureApiApp(app, {
      corsOrigin: 'http://localhost',
      production: false,
    });
    const document = buildOpenApiDocument(app);
    mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
    writeFileSync(OUTPUT_FILE, `${JSON.stringify(document, null, 2)}\n`);
    console.log(`OpenAPI written to ${OUTPUT_FILE}`);
  } finally {
    // A failure to close must not replace the original error.
    await app
      .close()
      .catch((closeError: unknown) =>
        console.error('Failed to close the app', closeError),
      );
  }
}

exportOpenApi().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

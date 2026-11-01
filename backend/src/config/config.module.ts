import { DynamicModule } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';
import { parseEnv, ROOT_ENV_FILE } from './env';

/**
 * Loads the root .env and validates it with the given zod schema at boot; with an invalid env the module rejects and
 * NestFactory.create fails, so the process does not start. Tests (NODE_ENV=test, set by Jest) never read the
 * developer's .env: they get their env from the test setup.
 */
export function validatedConfigModule(
  schema: z.ZodObject,
): Promise<DynamicModule> {
  const ignoreEnvFile = process.env.NODE_ENV === 'test';
  const hint =
    !ignoreEnvFile && !existsSync(ROOT_ENV_FILE)
      ? `no .env at ${ROOT_ENV_FILE}; copy .env.example`
      : undefined;
  return ConfigModule.forRoot({
    isGlobal: true,
    cache: true,
    envFilePath: ROOT_ENV_FILE,
    ignoreEnvFile,
    validate: (raw) => parseEnv(schema, raw, hint),
  });
}

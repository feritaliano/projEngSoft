import { resolve } from 'node:path';
import { z } from 'zod';

// Single .env at the repository root (D37). Resolved from this file, so it works from src/ (ts-node) and dist/ (build).
export const ROOT_ENV_FILE = resolve(__dirname, '..', '..', '..', '.env');

const LOG_LEVELS = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;

function isOrigin(value: string): boolean {
  return URL.canParse(value) && new URL(value).origin === value;
}

export const workerEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: 'must be a postgresql:// URL',
  }),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
});

export const apiEnvSchema = workerEnvSchema.extend({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  // Only the frontend origin may call the API (D52).
  CORS_ORIGIN: z
    .string()
    .refine(
      isOrigin,
      'must be an origin such as http://localhost:4200 (scheme, host and port; no path or trailing slash)',
    ),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;
export type ApiEnv = z.infer<typeof apiEnvSchema>;

export class InvalidEnvironmentError extends Error {
  override readonly name = 'InvalidEnvironmentError';
}

/**
 * Validates the raw environment. The error lists variable names and rules, never the values (they may be secrets);
 * the optional hint (e.g. a missing .env) is appended to it.
 */
export function parseEnv<S extends z.ZodType>(
  schema: S,
  raw: Record<string, unknown>,
  hint?: string,
): z.infer<S> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new InvalidEnvironmentError(
      `Invalid environment configuration: ${issues}${hint ? ` (${hint})` : ''}`,
    );
  }
  return result.data;
}

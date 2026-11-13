import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  apiEnvSchema,
  InvalidEnvironmentError,
  JWT_SECRET_PLACEHOLDER,
  parseEnv,
  ROOT_ENV_FILE,
  workerEnvSchema,
} from './env';

const validApiEnv = {
  DATABASE_URL: 'postgresql://user:secret-password@localhost:5432/carteira_dev',
  CORS_ORIGIN: 'http://localhost:4200',
  JWT_ACCESS_SECRET: 'test-secret-with-at-least-32-characters!',
};

describe('environment validation (zod, D52)', () => {
  it('accepts a minimal valid api env and applies defaults', () => {
    const env = parseEnv(apiEnvSchema, validApiEnv);

    expect(env).toEqual({
      ...validApiEnv,
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
      API_PORT: 3000,
      JWT_ACCESS_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 7,
      AUTH_RATE_LIMIT_MAX: 5,
    });
  });

  it('coerces API_PORT from string', () => {
    expect(
      parseEnv(apiEnvSchema, { ...validApiEnv, API_PORT: '8080' }).API_PORT,
    ).toBe(8080);
  });

  it('accepts the postgres:// scheme', () => {
    const env = parseEnv(workerEnvSchema, {
      DATABASE_URL: 'postgres://u:p@db:5432/x',
    });
    expect(env.DATABASE_URL).toBe('postgres://u:p@db:5432/x');
  });

  it('worker env does not require API variables', () => {
    expect(() =>
      parseEnv(workerEnvSchema, { DATABASE_URL: validApiEnv.DATABASE_URL }),
    ).not.toThrow();
  });

  it.each([
    [
      'missing DATABASE_URL',
      { CORS_ORIGIN: 'http://localhost:4200' },
      'DATABASE_URL',
    ],
    [
      'non-postgres DATABASE_URL',
      { ...validApiEnv, DATABASE_URL: 'mysql://u:p@h/db' },
      'DATABASE_URL',
    ],
    [
      'missing CORS_ORIGIN',
      { DATABASE_URL: validApiEnv.DATABASE_URL },
      'CORS_ORIGIN',
    ],
    [
      'CORS_ORIGIN with path',
      { ...validApiEnv, CORS_ORIGIN: 'http://localhost:4200/app' },
      'CORS_ORIGIN',
    ],
    [
      'CORS_ORIGIN with trailing slash',
      { ...validApiEnv, CORS_ORIGIN: 'http://localhost:4200/' },
      'CORS_ORIGIN',
    ],
    [
      'CORS_ORIGIN wildcard',
      { ...validApiEnv, CORS_ORIGIN: '*' },
      'CORS_ORIGIN',
    ],
    [
      'API_PORT out of range',
      { ...validApiEnv, API_PORT: '70000' },
      'API_PORT',
    ],
    ['unknown NODE_ENV', { ...validApiEnv, NODE_ENV: 'staging' }, 'NODE_ENV'],
    [
      'unknown LOG_LEVEL',
      { ...validApiEnv, LOG_LEVEL: 'verbose' },
      'LOG_LEVEL',
    ],
  ])('rejects %s', (_case, raw, variable) => {
    expect(() => parseEnv(apiEnvSchema, raw)).toThrow(InvalidEnvironmentError);
    expect(() => parseEnv(apiEnvSchema, raw)).toThrow(
      new RegExp(`${variable}:`),
    );
  });

  it.each([
    ['a short JWT secret', { JWT_ACCESS_SECRET: 'short' }],
    ['a missing JWT secret', { JWT_ACCESS_SECRET: undefined }],
    ['an access token TTL above 1 hour', { JWT_ACCESS_TTL_SECONDS: '3601' }],
    ['a refresh TTL above 30 days', { REFRESH_TOKEN_TTL_DAYS: '31' }],
  ])('rejects %s (K2)', (_case, override) => {
    expect(() =>
      parseEnv(apiEnvSchema, { ...validApiEnv, ...override }),
    ).toThrow(InvalidEnvironmentError);
  });

  it('accepts the .env.example JWT placeholder outside production only', () => {
    const withPlaceholder = {
      ...validApiEnv,
      JWT_ACCESS_SECRET: JWT_SECRET_PLACEHOLDER,
    };

    expect(() => parseEnv(apiEnvSchema, withPlaceholder)).not.toThrow();
    expect(() =>
      parseEnv(apiEnvSchema, { ...withPlaceholder, NODE_ENV: 'production' }),
    ).toThrow(
      'JWT_ACCESS_SECRET: must be replaced by a random secret in production',
    );
  });

  it.each(['1', '10000'])(
    'accepts AUTH_RATE_LIMIT_MAX=%s outside production (A2, BK-1)',
    (value) => {
      expect(
        parseEnv(apiEnvSchema, { ...validApiEnv, AUTH_RATE_LIMIT_MAX: value })
          .AUTH_RATE_LIMIT_MAX,
      ).toBe(Number(value));
    },
  );

  it.each(['0', '10001', '2.5', 'many'])(
    'rejects AUTH_RATE_LIMIT_MAX=%s (A2, BK-1)',
    (value) => {
      expect(() =>
        parseEnv(apiEnvSchema, { ...validApiEnv, AUTH_RATE_LIMIT_MAX: value }),
      ).toThrow(/AUTH_RATE_LIMIT_MAX:/);
    },
  );

  it('caps AUTH_RATE_LIMIT_MAX at 20 in production (A2, BK-1)', () => {
    const production = { ...validApiEnv, NODE_ENV: 'production' };

    expect(
      parseEnv(apiEnvSchema, { ...production, AUTH_RATE_LIMIT_MAX: '20' })
        .AUTH_RATE_LIMIT_MAX,
    ).toBe(20);
    expect(() =>
      parseEnv(apiEnvSchema, { ...production, AUTH_RATE_LIMIT_MAX: '21' }),
    ).toThrow('AUTH_RATE_LIMIT_MAX: must be at most 20 in production');
  });

  it('reports both production issues at once', () => {
    expect(() =>
      parseEnv(apiEnvSchema, {
        ...validApiEnv,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: JWT_SECRET_PLACEHOLDER,
        AUTH_RATE_LIMIT_MAX: '10000',
      }),
    ).toThrow(/JWT_ACCESS_SECRET: .*; AUTH_RATE_LIMIT_MAX: /);
  });

  it('never echoes values in the error message (they may be secrets)', () => {
    const raw = {
      DATABASE_URL: 'mysql://user:super-secret@host/db',
      CORS_ORIGIN: 'not an origin',
    };

    expect(() => parseEnv(apiEnvSchema, raw)).toThrow(
      /DATABASE_URL: .*; CORS_ORIGIN: /,
    );
    expect(() => parseEnv(apiEnvSchema, raw)).not.toThrow(
      /super-secret|not an origin/,
    );
  });

  it('appends the hint to the error', () => {
    expect(() =>
      parseEnv(apiEnvSchema, {}, 'no .env at /repo/.env; copy .env.example'),
    ).toThrow(
      /CORS_ORIGIN: .* \(no \.env at \/repo\/\.env; copy \.env\.example\)$/,
    );
  });

  it('looks for the single .env at the repository root (D37)', () => {
    const root = dirname(ROOT_ENV_FILE);
    expect(existsSync(join(root, '.env.example'))).toBe(true);
    expect(existsSync(join(root, 'prisma.config.ts'))).toBe(true);
  });
});

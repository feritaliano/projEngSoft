import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..', '..');
const PRISMA_CLI = join(
  REPO_ROOT,
  'node_modules',
  'prisma',
  'build',
  'index.js',
);

declare global {
  var __POSTGRES_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

/**
 * Starts a fresh PostgreSQL 16 for the whole run and applies the migrations with the root Prisma (D40):
 * never migrate dev nor db push, never carteira_dev or carteira_test. The env set here is inherited by the tests.
 */
export default async function globalSetup(): Promise<void> {
  if (!existsSync(PRISMA_CLI)) {
    throw new Error(
      `Prisma CLI not found at ${PRISMA_CLI}: run npm install at the repository root.`,
    );
  }

  const container = await new PostgreSqlContainer('postgres:16')
    .withDatabase('carteira_e2e')
    .withUsername('carteira')
    .withPassword('e2e-only-password')
    .start();
  globalThis.__POSTGRES_CONTAINER__ = container;

  const databaseUrl = container.getConnectionUri();
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: databaseUrl,
    CORS_ORIGIN: 'http://localhost:4200',
    // Silent by default; E2E_LOG_LEVEL=debug shows the app logs when a test fails.
    LOG_LEVEL: process.env.E2E_LOG_LEVEL ?? 'silent',
  });

  // prisma.config.ts also requires SHADOW_DATABASE_URL, distinct from the main one; migrate deploy never connects to
  // it. The variables set here take precedence over the developer's root .env (prisma.config.ts loads it without override).
  const shadowUrl = new URL(databaseUrl);
  shadowUrl.pathname = '/carteira_e2e_shadow';
  try {
    execFileSync(process.execPath, [PRISMA_CLI, 'migrate', 'deploy'], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        SHADOW_DATABASE_URL: shadowUrl.toString(),
      },
      stdio: 'inherit',
    });
  } catch (error) {
    // Jest skips globalTeardown when the setup fails: stop the container here.
    await container.stop();
    globalThis.__POSTGRES_CONTAINER__ = undefined;
    throw error;
  }
}

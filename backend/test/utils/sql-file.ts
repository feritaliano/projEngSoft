import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

const REPO_ROOT = resolve(__dirname, '..', '..', '..');

/**
 * Runs a SQL file of the repository (e.g. the seed) against the test database. The seed has several statements in one
 * transaction and a temp view: it needs one session and the simple query protocol, which pg uses for a query without
 * parameters ($executeRawUnsafe uses the extended one and fails).
 */
export async function runSqlFile(relativePath: string): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(readFileSync(resolve(REPO_ROOT, relativePath), 'utf8'));
  } finally {
    await client.end();
  }
}

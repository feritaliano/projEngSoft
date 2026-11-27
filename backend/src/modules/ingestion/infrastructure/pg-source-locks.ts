import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import type { WorkerEnv } from '../../../config/env';
import { DATABASE_CONNECTION_TIMEOUT_MS } from '../../../shared/infrastructure/prisma/prisma.service';
import {
  type IngestionSource,
  type SourceLock,
  SourceLocks,
} from '../domain/ingestion-run';

/** Advisory lock key of a source; namespaced so it never meets the catalog load's lock (K5). */
const lockKey = (source: IngestionSource) => `ingestion:${source}`;

/**
 * Session advisory lock per source (arquitetura 6.3, D24) on a connection of its own: the run spans many transactions
 * of the Prisma pool, so a transaction lock would not do. Ending the connection releases the lock, also when the worker
 * dies.
 */
@Injectable()
export class PgSourceLocks extends SourceLocks {
  private readonly logger = new Logger(PgSourceLocks.name);

  constructor(private readonly config: ConfigService<WorkerEnv, true>) {
    super();
  }

  async tryAcquire(source: IngestionSource): Promise<SourceLock | null> {
    const client = new Client({
      connectionString: this.config.get('DATABASE_URL', { infer: true }),
      connectionTimeoutMillis: DATABASE_CONNECTION_TIMEOUT_MS,
      // The connection sits idle for the whole load; keepalive stops NAT or firewalls from dropping it (and the lock).
      keepAlive: true,
    });
    // Without a listener, an error of an idle connection (database restart) would crash the worker.
    client.on('error', (err) =>
      this.logger.error({ err, source }, 'Lock connection error'),
    );
    let locked = false;
    try {
      await client.connect();
      const { rows } = await client.query<{ locked: boolean }>(
        'SELECT pg_try_advisory_lock(hashtext($1)) AS locked',
        [lockKey(source)],
      );
      locked = rows[0].locked;
    } finally {
      if (!locked) await this.close(client, source);
    }
    return locked ? { release: () => this.close(client, source) } : null;
  }

  /** Closing the session releases its advisory locks; a failure here only means the connection is already gone. */
  private async close(client: Client, source: IngestionSource): Promise<void> {
    try {
      await client.end();
    } catch (err) {
      this.logger.warn(
        { err, source },
        'Lock connection did not close cleanly',
      );
    }
  }
}

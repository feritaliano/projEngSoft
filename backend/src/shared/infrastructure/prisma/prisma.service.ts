import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { WorkerEnv } from '../../../config/env';
import { PrismaClient } from '../../../generated/prisma/client';

export const DATABASE_CONNECTION_TIMEOUT_MS = 5_000;

const logger = new Logger('PrismaService');

/**
 * Prisma Client (Prisma 7, pg driver adapter). The pool connects lazily on the first query, so the app (and the
 * OpenAPI export) starts without a database; the health check reports whether it is reachable.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<WorkerEnv, true>) {
    super({
      adapter: new PrismaPg(
        {
          connectionString: config.get('DATABASE_URL', { infer: true }),
          // Without a timeout (pg default 0), an unreachable host would hang requests and the health check.
          connectionTimeoutMillis: DATABASE_CONNECTION_TIMEOUT_MS,
        },
        {
          // The adapter swallows idle-client errors (DB restart, killed connection) unless these are set.
          onPoolError: (err) => logger.error({ err }, 'PostgreSQL pool error'),
          onConnectionError: (err) =>
            logger.error({ err }, 'PostgreSQL connection error'),
        },
      ),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

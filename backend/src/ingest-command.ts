import {
  ConsoleLogger,
  type INestApplicationContext,
  Logger,
  Module,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { resolve } from 'node:path';
import { validatedConfigModule } from './config/config.module';
import { workerEnvSchema } from './config/env';
import type { RunOutcome } from './modules/ingestion/application/ingestion-runner';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { InvalidValueError } from './shared/domain/domain-error';
import { LocalDate } from './shared/domain/local-date';
import { LoggingModule } from './shared/infrastructure/logging/logging.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';

@Module({
  imports: [
    validatedConfigModule(workerEnvSchema),
    LoggingModule,
    PrismaModule,
    IngestionModule,
  ],
})
class IngestCommandModule {}

export class UsageError extends Error {}

/** A path given to a command, relative to where npm was called (INIT_CWD), so `--file data/raw/...` works from the root. */
export function commandPath(path: string): string {
  return resolve(process.env.INIT_CWD ?? process.cwd(), path);
}

/** --from and --to as dates, from not after to. */
export function period(
  from: string | undefined,
  to: string | undefined,
): [LocalDate, LocalDate] {
  if (from === undefined || to === undefined) {
    throw new UsageError('--from and --to are required together');
  }
  try {
    const range: [LocalDate, LocalDate] = [
      LocalDate.parse(from, '--from'),
      LocalDate.parse(to, '--to'),
    ];
    if (range[0].isAfter(range[1])) {
      throw new UsageError('--from is after --to');
    }
    return range;
  } catch (error) {
    if (error instanceof InvalidValueError) {
      throw new UsageError(error.message);
    }
    throw error;
  }
}

/**
 * Runs an ingestion command (K6) in the worker's environment: logs each run of ops.ingestion_runs and a total, and exits
 * with 1 when a run FAILED or found the source busy (NO_FILE is not a failure), 2 on a usage error.
 */
export async function runIngestCommand<A>(
  name: string,
  usage: string,
  parse: () => A,
  work: (
    app: INestApplicationContext,
    args: A,
    logger: Logger,
  ) => Promise<RunOutcome[]>,
): Promise<void> {
  const logger = new Logger(name);
  let app: INestApplicationContext | undefined;
  try {
    // Arguments first: a usage error never boots the application.
    const args = parse();
    app = await NestFactory.createApplicationContext(IngestCommandModule, {
      bufferLogs: true,
      logger: new ConsoleLogger({
        json: process.env.NODE_ENV === 'production',
      }),
    });
    app.useLogger(app.get(PinoLogger));
    const started = performance.now();
    const outcomes = await work(app, args, logger);
    for (const outcome of outcomes) {
      const failed = outcome.status === 'FAILED' || outcome.status === 'BUSY';
      if (failed) process.exitCode = 1;
      logger[failed ? 'error' : 'log'](outcome, 'Ingestion run');
    }
    logger.log(
      {
        runs: outcomes.length,
        byStatus: Object.fromEntries(
          ['SUCCEEDED', 'NO_FILE', 'FAILED', 'BUSY'].map((status) => [
            status,
            outcomes.filter((o) => o.status === status).length,
          ]),
        ),
        rowsRead: outcomes.reduce((sum, o) => sum + o.rowsRead, 0),
        rowsWritten: outcomes.reduce((sum, o) => sum + o.rowsWritten, 0),
        rowsRejected: outcomes.reduce((sum, o) => sum + o.rowsRejected, 0),
        elapsedMs: Math.round(performance.now() - started),
      },
      'Ingestion finished',
    );
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`${error.message}\n${usage}`);
      process.exitCode = 2;
      return;
    }
    process.exitCode = 1;
    logger.error({ err: error }, 'Ingestion command failed');
  } finally {
    await app?.close();
  }
}

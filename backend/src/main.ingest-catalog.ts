import { ConsoleLogger, Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { validatedConfigModule } from './config/config.module';
import { workerEnvSchema } from './config/env';
import { LoadCatalog } from './modules/ingestion/application/load-catalog.use-case';
import {
  type RejectedLine,
  SourceFileError,
} from './modules/ingestion/domain/instruments-file';
import { readB3File } from './modules/ingestion/infrastructure/b3-file';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { LoggingModule } from './shared/infrastructure/logging/logging.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';

const USAGE =
  'Usage: npm run ingest:catalog -- --file <InstrumentsConsolidatedFile_AAAAMMDD.csv> --cotahist <COTAHIST_DDDMMAAAA.TXT>';
const EXAMPLES_PER_REASON = 10;

@Module({
  imports: [
    validatedConfigModule(workerEnvSchema),
    LoggingModule,
    PrismaModule,
    IngestionModule,
  ],
})
class IngestCatalogModule {}

/**
 * npm run ingest:catalog (K5, D59): one-off load of the B3 catalog in the worker's environment. Paths are relative to
 * where npm was called (INIT_CWD), so `--file data/raw/...` works from the repository root.
 */
async function ingestCatalog(): Promise<void> {
  const { values } = parseArgs({
    options: { file: { type: 'string' }, cotahist: { type: 'string' } },
  });
  if (values.file === undefined || values.cotahist === undefined) {
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }
  const base = process.env.INIT_CWD ?? process.cwd();
  const instruments = readB3File(resolve(base, values.file));
  const cotahist = readB3File(resolve(base, values.cotahist));

  const app = await NestFactory.createApplicationContext(IngestCatalogModule, {
    bufferLogs: true,
    logger: new ConsoleLogger({ json: process.env.NODE_ENV === 'production' }),
  });
  app.useLogger(app.get(PinoLogger));
  // With a context, the second argument of each call is the log message (msg), not the context.
  const logger = new Logger('IngestCatalog');
  try {
    const started = performance.now();
    const report = await app.get(LoadCatalog).execute(instruments, cotahist);
    const byReason = new Map<string, RejectedLine[]>();
    for (const line of report.rejected) {
      byReason.set(line.reason, [...(byReason.get(line.reason) ?? []), line]);
    }
    for (const [reason, lines] of byReason) {
      logger.warn(
        {
          reason,
          count: lines.length,
          examples: lines
            .slice(0, EXAMPLES_PER_REASON)
            .map((line) => `${line.line}:${line.ticker}`),
        },
        'Lines rejected',
      );
    }
    for (const conflict of report.conflicts) {
      logger.warn(conflict, 'ISIN already belongs to another ticker: skipped');
    }
    logger.log(
      {
        reportDate: report.reportDate,
        entriesByType: report.entriesByType,
        issuersCreated: report.issuersCreated,
        assetsWritten: report.assetsWritten,
        rejected: report.rejected.length,
        conflicts: report.conflicts.length,
        elapsedMs: Math.round(performance.now() - started),
      },
      'Catalog loaded',
    );
  } finally {
    await app.close();
  }
}

ingestCatalog().catch((error: unknown) => {
  process.exitCode = 1;
  // A refused file (partial, other day, truncated; F5, F7) is the operator's fix, not a crash: print just why.
  if (error instanceof SourceFileError) {
    console.error(error.message);
    return;
  }
  new Logger('IngestCatalog').error(
    { err: error },
    'Catalog load failed: batches before the error were committed; running the same files again is safe',
  );
});

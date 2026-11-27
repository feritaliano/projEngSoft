import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { ReferenceDataModule } from '../reference-data/reference-data.module';
import { DailyIngestion } from './application/daily-ingestion.use-case';
import { IngestIndexes } from './application/ingest-indexes.use-case';
import { IngestQuotes } from './application/ingest-quotes.use-case';
import { IngestionRunner } from './application/ingestion-runner';
import { LoadCatalog } from './application/load-catalog.use-case';
import { LoadQuotes } from './application/load-quotes.use-case';
import {
  IngestionRuns,
  MarketSources,
  RawFiles,
  SourceLocks,
} from './domain/ingestion-run';
import { FsRawFiles } from './infrastructure/fs-raw-files';
import { HttpMarketSources } from './infrastructure/http-market-sources';
import { PgSourceLocks } from './infrastructure/pg-source-locks';
import { PrismaIngestionRuns } from './infrastructure/prisma-ingestion-runs';

/**
 * Ingestion of external sources (arquitetura 6.3), run by the worker process and its commands: the one-off catalog load
 * (K5) and the quotes and indexes (K6) with locks, bronze and ops.ingestion_runs. Each source writes through the port of
 * the module that owns the table (CatalogWriter of reference-data; QuoteWriter and IndexValueWriter of market-data).
 */
@Module({
  imports: [ReferenceDataModule, MarketDataModule],
  providers: [
    LoadCatalog,
    LoadQuotes,
    IngestionRunner,
    IngestQuotes,
    IngestIndexes,
    DailyIngestion,
    { provide: IngestionRuns, useClass: PrismaIngestionRuns },
    { provide: SourceLocks, useClass: PgSourceLocks },
    { provide: RawFiles, useClass: FsRawFiles },
    { provide: MarketSources, useClass: HttpMarketSources },
  ],
  exports: [LoadCatalog, IngestQuotes, IngestIndexes, DailyIngestion],
})
export class IngestionModule {}

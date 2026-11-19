import { Module } from '@nestjs/common';
import { ReferenceDataModule } from '../reference-data/reference-data.module';
import { LoadCatalog } from './application/load-catalog.use-case';

/**
 * Ingestion of external sources (arquitetura 6.3), run by the worker process. S1 has only the one-off catalog load (K5);
 * schedule, locks, bronze and ingestion_runs come in S2. Each source writes through the port of the module that owns
 * the table (here CatalogWriter, of reference-data).
 */
@Module({
  imports: [ReferenceDataModule],
  providers: [LoadCatalog],
  exports: [LoadCatalog],
})
export class IngestionModule {}

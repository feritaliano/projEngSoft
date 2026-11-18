import { Injectable } from '@nestjs/common';
import {
  type CatalogConflict,
  type CatalogEntry,
  CatalogWriter,
} from '../../reference-data/domain/catalog-entry';
import { parseCotahistFiis } from '../domain/cotahist-file';
import {
  parseInstrumentsFile,
  type RejectedLine,
  SourceFileError,
} from '../domain/instruments-file';

/** Entries per transaction: a failure rolls back one batch, never leaves half of one. */
export const CATALOG_BATCH_SIZE = 500;

export interface CatalogLoadReport {
  readonly reportDate: string;
  /** Entries of the file by asset type, conflicts included. */
  readonly entriesByType: Readonly<Record<CatalogEntry['type'], number>>;
  readonly issuersCreated: number;
  readonly assetsWritten: number;
  readonly rejected: readonly RejectedLine[];
  readonly conflicts: readonly CatalogConflict[];
}

/**
 * K5 (D59): loads the B3 catalog (issuers and assets of the cash market) from the Cadastro de Instrumentos, with the
 * COTAHIST of the same day telling which funds are FIIs (F7). Running it again with the same files changes nothing.
 * No quotes, no deactivation of assets missing from the file and no ingestion_runs: all S2.
 */
@Injectable()
export class LoadCatalog {
  constructor(private readonly writer: CatalogWriter) {}

  async execute(
    instrumentsText: string,
    cotahistText: string,
  ): Promise<CatalogLoadReport> {
    const cotahist = parseCotahistFiis(cotahistText);
    const file = parseInstrumentsFile(instrumentsText, cotahist.fiiTickers);
    if (file.reportDate !== cotahist.date) {
      throw new SourceFileError(
        `The COTAHIST is of ${cotahist.date} and the Cadastro de Instrumentos of ${file.reportDate || 'no date'}: use files of the same day (F7)`,
      );
    }
    if (file.entries.length === 0) {
      // A renamed market or category in the B3 layout would otherwise end as a successful load of nothing.
      throw new SourceFileError(
        `The Cadastro de Instrumentos of ${file.reportDate} has no asset of the catalog classes: check the file layout`,
      );
    }

    const entriesByType = { STOCK: 0, FII: 0, ETF: 0, BDR: 0 };
    for (const entry of file.entries) entriesByType[entry.type]++;
    let issuersCreated = 0;
    let assetsWritten = 0;
    const conflicts: CatalogConflict[] = [];
    for (
      let start = 0;
      start < file.entries.length;
      start += CATALOG_BATCH_SIZE
    ) {
      const result = await this.writer.upsert(
        file.entries.slice(start, start + CATALOG_BATCH_SIZE),
      );
      issuersCreated += result.issuersCreated;
      assetsWritten += result.assetsWritten;
      conflicts.push(...result.conflicts);
    }
    return {
      reportDate: file.reportDate,
      entriesByType,
      issuersCreated,
      assetsWritten,
      rejected: file.rejected,
      conflicts,
    };
  }
}

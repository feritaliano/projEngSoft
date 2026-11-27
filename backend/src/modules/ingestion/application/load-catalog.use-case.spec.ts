import {
  cotahistOf,
  COTAHIST_SAMPLE,
  INSTRUMENTS_SAMPLE,
  instrumentLine,
  instrumentsFile,
} from '../../../../test/factories/catalog-files.factory';
import {
  type CatalogBatchResult,
  type CatalogEntry,
  CatalogWriter,
} from '../../reference-data/domain/catalog-entry';
import { SourceFileError } from '../domain/instruments-file';
import { CATALOG_BATCH_SIZE, LoadCatalog } from './load-catalog.use-case';

class RecordingWriter extends CatalogWriter {
  readonly batches: (readonly CatalogEntry[])[] = [];

  upsert(entries: readonly CatalogEntry[]): Promise<CatalogBatchResult> {
    this.batches.push(entries);
    return Promise.resolve({
      issuersCreated: 1,
      assetsWritten: entries.length,
      conflicts: entries
        .filter((e) => e.ticker === 'MGLU3')
        .map((e) => ({
          ticker: e.ticker,
          isin: e.isin,
          existingTicker: 'MGLU4',
        })),
    });
  }
}

describe('LoadCatalog (K5, D59)', () => {
  it('writes the entries of the files and reports them by type, with rejected lines and conflicts', async () => {
    const writer = new RecordingWriter();

    const report = await new LoadCatalog(writer).execute(
      INSTRUMENTS_SAMPLE,
      COTAHIST_SAMPLE,
    );

    expect(writer.batches).toHaveLength(1);
    expect(report).toEqual({
      reportDate: '2026-10-30',
      entriesByType: { STOCK: 9, FII: 2, ETF: 2, BDR: 5 },
      issuersCreated: 1,
      assetsWritten: 18,
      rejected: [expect.objectContaining({ ticker: 'RADL3' })],
      conflicts: [
        { ticker: 'MGLU3', isin: 'BRMGLUACNOR2', existingTicker: 'MGLU4' },
      ],
    });
  });

  it('writes one transaction per batch of CATALOG_BATCH_SIZE entries and sums the results', async () => {
    const writer = new RecordingWriter();
    const lines = Array.from({ length: CATALOG_BATCH_SIZE + 1 }, (_, i) => {
      const n = String(i).padStart(4, '0');
      return instrumentLine({ TckrSymb: `${n}3`, ISIN: `BRX${n}00000` });
    });

    const report = await new LoadCatalog(writer).execute(
      instrumentsFile(lines),
      cotahistOf('20261030'),
    );

    expect(writer.batches.map((batch) => batch.length)).toEqual([
      CATALOG_BATCH_SIZE,
      1,
    ]);
    expect(report).toMatchObject({
      issuersCreated: 2,
      assetsWritten: CATALOG_BATCH_SIZE + 1,
    });
  });

  it('refuses a file without any asset of the catalog classes instead of loading nothing', async () => {
    const writer = new RecordingWriter();

    await expect(
      new LoadCatalog(writer).execute(
        instrumentsFile([instrumentLine({ SctyCtgyNm: 'INDEX' })]),
        cotahistOf('20261030'),
      ),
    ).rejects.toThrow(
      'The Cadastro de Instrumentos of 2026-10-30 has no asset of the catalog classes: check the file layout',
    );
    expect(writer.batches).toEqual([]);
  });

  it('refuses files of different days without writing anything (F7)', async () => {
    const writer = new RecordingWriter();
    const load = new LoadCatalog(writer);

    await expect(
      load.execute(INSTRUMENTS_SAMPLE, cotahistOf('20261112')),
    ).rejects.toThrow(
      new SourceFileError(
        'The COTAHIST is of 2026-11-12 and the Cadastro de Instrumentos of 2026-10-30: use files of the same day (F7)',
      ),
    );
    await expect(
      load.execute(instrumentsFile([]), cotahistOf('20261030')),
    ).rejects.toThrow(/Cadastro de Instrumentos of no date/);
    expect(writer.batches).toEqual([]);
  });
});

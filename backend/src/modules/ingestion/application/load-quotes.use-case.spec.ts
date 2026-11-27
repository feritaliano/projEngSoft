import {
  COTAHIST_LINES,
  cotahistLine,
  linesOf,
} from '../../../../test/factories/market-files.factory';
import {
  EXCERPT_CATALOG,
  InMemoryQuoteWriter,
} from '../../../../test/fakes/ingestion-fakes';
import { LoadQuotes, QUOTES_BATCH_SIZE } from './load-quotes.use-case';

const [HEADER] = COTAHIST_LINES;
const TRAILER = COTAHIST_LINES[COTAHIST_LINES.length - 1];

describe('LoadQuotes (K6, D64)', () => {
  let writer: InMemoryQuoteWriter;
  let load: LoadQuotes;

  beforeEach(() => {
    writer = new InMemoryQuoteWriter(EXCERPT_CATALOG);
    load = new LoadQuotes(writer);
  });

  it('loads the cash-market quotes of catalog assets; other tickers are counted and ignored', async () => {
    const report = await load.execute(linesOf(COTAHIST_LINES), '2026-11-25');

    // Cash market: PETR4, KNRI11, BOVA11, AAPL34, MGLU3, IBOV11; PETR4F (odd lot) and the option are not read.
    expect(report).toEqual({
      headerDate: '2026-11-25',
      firstDate: '2026-11-25',
      lastDate: '2026-11-25',
      read: 6,
      written: 4,
      outsideCatalog: 2,
      rejected: 0,
      rejectedExamples: [],
    });
    expect(writer.rows.get('petr4|2026-11-25')).toEqual({
      assetId: 'petr4',
      date: '2026-11-25',
      open: '40.7',
      high: '41.51',
      low: '40.41',
      close: '41.36',
      volume: '2643622356',
      tradesCount: 96311,
    });
  });

  it('writes nothing the second time (idempotent, D27)', async () => {
    await load.execute(linesOf(COTAHIST_LINES));
    const again = await load.execute(linesOf(COTAHIST_LINES));

    expect(again.written).toBe(0);
  });

  it('rejects a catalog ticker with another ISIN and a quote the CHECKs refuse, with examples', async () => {
    writer = new InMemoryQuoteWriter({
      ...EXCERPT_CATALOG,
      KNRI11: { assetId: 'knri11', isin: 'BROTHERISIN0' },
    });
    load = new LoadQuotes(writer);
    const petr4 = cotahistLine('PETR4');
    // Open above the high.
    const badRange = `${petr4.slice(0, 56)}0000000009999${petr4.slice(69)}`;

    const report = await load.execute(
      linesOf([HEADER, badRange, cotahistLine('KNRI11'), TRAILER]),
    );

    expect(report.rejected).toBe(2);
    expect(report.written).toBe(0);
    expect(report.rejectedExamples).toEqual([
      { ticker: 'PETR4', date: '2026-11-25', reason: 'price outside low–high' },
      {
        ticker: 'KNRI11',
        date: '2026-11-25',
        reason: "ISIN BRKNRICTF007 is not the catalog's BROTHERISIN0",
      },
    ]);
  });

  it('keeps at most 10 rejection examples and names a catalog asset without ISIN', async () => {
    writer = new InMemoryQuoteWriter({
      PETR4: { assetId: 'petr4', isin: null },
    });
    load = new LoadQuotes(writer);
    const petr4 = cotahistLine('PETR4');
    const days = Array.from(
      { length: 12 },
      (_, i) =>
        `${petr4.slice(0, 2)}202610${String(i + 1).padStart(2, '0')}${petr4.slice(10)}`,
    );

    const report = await load.execute(linesOf([HEADER, ...days, TRAILER]));

    expect(report.rejected).toBe(12);
    expect(report.rejectedExamples).toHaveLength(10);
    expect(report.rejectedExamples[0].reason).toBe(
      "ISIN BRPETRACNPR6 is not the catalog's (none)",
    );
  });

  it('writes in batches, a repeated quote once, and tracks the first and last dates', async () => {
    const petr4 = cotahistLine('PETR4');
    const isoOf = (i: number) =>
      new Date(Date.UTC(2010, 0, 1 + i)).toISOString().slice(0, 10);
    const dayOf = (i: number) =>
      `${petr4.slice(0, 2)}${isoOf(i).replaceAll('-', '')}${petr4.slice(10)}`;
    const lines = Array.from({ length: QUOTES_BATCH_SIZE + 1 }, (_, i) =>
      dayOf(i),
    );

    const report = await load.execute(
      linesOf([HEADER, dayOf(3), ...lines.reverse(), TRAILER]),
    );

    expect(writer.batches).toEqual([QUOTES_BATCH_SIZE, 1]);
    expect(report.written).toBe(QUOTES_BATCH_SIZE + 1);
    expect(report.firstDate).toBe('2010-01-01');
    expect(report.lastDate).toBe(isoOf(QUOTES_BATCH_SIZE));
  });

  it('refuses a file of another trading day before writing anything', async () => {
    await expect(
      load.execute(linesOf(COTAHIST_LINES), '2026-11-24'),
    ).rejects.toThrow(
      'The COTAHIST of 2026-11-24 has the header of 2026-11-25',
    );
    expect(writer.batches).toEqual([]);
  });

  it('refuses a truncated file (no trailer)', async () => {
    await expect(
      load.execute(linesOf(COTAHIST_LINES.slice(0, -1))),
    ).rejects.toThrow(
      'The COTAHIST file has no 99COTAHIST trailer: it is truncated',
    );
  });

  it('refuses an empty file', async () => {
    await expect(load.execute(linesOf([]))).rejects.toThrow(
      'The COTAHIST file is empty',
    );
  });

  it('reports no dates for a file without catalog quotes', async () => {
    const report = await load.execute(linesOf([HEADER, TRAILER]));

    expect(report).toMatchObject({ read: 0, firstDate: null, lastDate: null });
  });

  it('writes the prices of a quote with FATCOT 100 already divided by the factor', async () => {
    writer = new InMemoryQuoteWriter({
      IBOV11: { assetId: 'ibov11', isin: 'BRIBOVINDM18' },
    });
    load = new LoadQuotes(writer);

    await load.execute(linesOf([HEADER, cotahistLine('IBOV11'), TRAILER]));

    expect(writer.rows.get('ibov11|2026-11-25')).toMatchObject({
      open: '1667.28',
      close: '1667.28',
    });
  });
});

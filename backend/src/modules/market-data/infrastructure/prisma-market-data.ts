import { Injectable } from '@nestjs/common';
import { LocalDate } from '../../../shared/domain/local-date';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import {
  type IndexPoint,
  IndexValueWriter,
  LatestCloseDate,
  type MarketIndexCode,
  type QuotedAsset,
  QuoteWriter,
  type QuoteRow,
} from '../domain/market-data';

/**
 * Upsert of quotes by natural key (asset, date; arquitetura 6.3) in one statement, so one transaction. A row equal to
 * the file is not updated (IS DISTINCT FROM on numeric compares values: 60.01 = 60.01000000), so loading the same file
 * again writes nothing.
 */
@Injectable()
export class PrismaQuoteWriter extends QuoteWriter {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async quotedAssets(): Promise<ReadonlyMap<string, QuotedAsset>> {
    const rows = await this.prisma.asset.findMany({
      where: {
        type: { in: ['STOCK', 'FII', 'ETF', 'BDR'] },
        ticker: { not: null },
      },
      select: { id: true, ticker: true, isin: true },
    });
    return new Map(
      rows.map((row) => [
        row.ticker as string,
        { assetId: row.id, isin: row.isin },
      ]),
    );
  }

  upsert(rows: readonly QuoteRow[]): Promise<number> {
    return this.prisma.$executeRaw`
      INSERT INTO quotes (asset_id, quote_date, open, high, low, close, volume, trades_count)
      SELECT * FROM unnest(
        ${rows.map((r) => r.assetId)}::uuid[],
        ${rows.map((r) => r.date)}::date[],
        ${rows.map((r) => r.open)}::numeric[],
        ${rows.map((r) => r.high)}::numeric[],
        ${rows.map((r) => r.low)}::numeric[],
        ${rows.map((r) => r.close)}::numeric[],
        ${rows.map((r) => r.volume)}::numeric[],
        ${rows.map((r) => r.tradesCount)}::int[]
      )
      ON CONFLICT (asset_id, quote_date) DO UPDATE SET
        open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close,
        volume = EXCLUDED.volume, trades_count = EXCLUDED.trades_count
      WHERE (quotes.open, quotes.high, quotes.low, quotes.close, quotes.volume, quotes.trades_count)
        IS DISTINCT FROM (EXCLUDED.open, EXCLUDED.high, EXCLUDED.low, EXCLUDED.close, EXCLUDED.volume, EXCLUDED.trades_count)`;
  }
}

/** Upsert of index values by (index, date); the index must exist in economic_indexes (seed, section 1.4). */
@Injectable()
export class PrismaIndexValueWriter extends IndexValueWriter {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async upsert(
    code: MarketIndexCode,
    points: readonly IndexPoint[],
  ): Promise<number> {
    const index = await this.prisma.economicIndex.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!index) {
      throw new Error(
        `Index ${code} is not in economic_indexes: load the seed first`,
      );
    }
    return this.prisma.$executeRaw`
      INSERT INTO index_values (economic_index_id, reference_date, value)
      SELECT ${index.id}::uuid, v.reference_date, v.value
      FROM unnest(${points.map((p) => p.date)}::date[], ${points.map((p) => p.value)}::numeric[])
        AS v(reference_date, value)
      ON CONFLICT (economic_index_id, reference_date) DO UPDATE SET value = EXCLUDED.value
      WHERE index_values.value IS DISTINCT FROM EXCLUDED.value`;
  }
}

/** The last trading day with a close in quotes (K7, K8). */
@Injectable()
export class PrismaLatestCloseDate extends LatestCloseDate {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async get(): Promise<LocalDate | null> {
    const { _max } = await this.prisma.quote.aggregate({
      _max: { quoteDate: true },
    });
    return _max.quoteDate
      ? LocalDate.parse(_max.quoteDate.toISOString().slice(0, 10))
      : null;
  }
}

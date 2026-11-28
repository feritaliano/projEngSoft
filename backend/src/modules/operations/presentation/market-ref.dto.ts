import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { MARKET_DATA_SOURCES } from '../../market-data/domain/market-data';
import type { MarketDataSource } from '../../market-data/domain/market-data';
import { UNAVAILABLE_REASONS } from '../domain/derived-value';

// Pieces of the S1+ (D64) market contract used by position.dto.ts and market.dto.ts (a separate file: no import cycle).

export const PERCENT =
  'In % as a decimal string ("9.84" = 9,84%), full precision (RN11).';

export const UNAVAILABLE_REASON_PROPERTY = {
  enum: UNAVAILABLE_REASONS,
  enumName: 'UnavailableReason',
  description:
    'Present only when the close or the return is null, and why: NO_QUOTE = no close for the asset up to the date (fixed income and crypto until S11, D55), it goes by its cost ("sem cotação"); SHORT_HISTORY = history shorter than the window. A day change (and its percentage) can also be null without a reason: units held on the previous trading day without any close up to it, or, for the percentage, a zero base (nothing held on the previous trading day and nothing bought).',
} as const;

@ApiSchema({
  name: 'MarketData',
  description:
    'Date and source of the close the market numbers used (D27, D59b): shown next to them.',
})
export class MarketDataDto {
  @ApiProperty({ enum: ['B3_COTAHIST'], example: 'B3_COTAHIST' })
  source: 'B3_COTAHIST';

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    example: '2026-11-12',
    description: 'Last trading day with closes loaded; null before any quote.',
  })
  closeDate: string | null;
}

@ApiSchema({
  name: 'ClosePrice',
  description:
    'A close as published (not derived): value, trading day and source (D27).',
})
export class ClosePriceDto {
  @ApiProperty({ example: '32.18', description: 'Decimal string (RN11).' })
  value: string;

  @ApiProperty({
    format: 'date',
    example: '2026-11-12',
    description:
      'Trading day of the close: the last one up to the date, so a day without trading uses the previous close.',
  })
  date: string;

  @ApiProperty({
    enum: MARKET_DATA_SOURCES,
    enumName: 'MarketDataSource',
    example: 'B3_COTAHIST',
  })
  source: MarketDataSource;
}

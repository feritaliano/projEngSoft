import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { MARKET_PERIODS } from '../../market-data/domain/market-data';
import type { MarketPeriod } from '../../market-data/domain/market-data';
import { ASSET_TYPES } from '../domain/asset-type';
import type { AssetType } from '../domain/asset-type';
import type { UnavailableReason } from '../domain/derived-value';
import {
  ClosePriceDto,
  MarketDataDto,
  PERCENT,
  UNAVAILABLE_REASON_PROPERTY,
} from './market-ref.dto';
import { DerivedValueDto } from './position.dto';

// S1+ (D64) contract: market numbers of the portfolio, filled by K7. Percentages are decimal strings in percentage
// points ("9.84" = 9,84%), full precision (RN11). Market data only for authenticated users, no file or download (D59b).

@ApiSchema({ name: 'ClassAllocation' })
export class ClassAllocationDto {
  @ApiProperty({ enum: ASSET_TYPES, enumName: 'AssetType', example: 'STOCK' })
  assetType: AssetType;

  @ApiProperty({
    type: DerivedValueDto,
    description:
      'ALLOCATION_VALUE: sum of the market value of the open positions of the class (at cost without quote).',
  })
  value: DerivedValueDto;

  @ApiProperty({
    type: DerivedValueDto,
    description: `ALLOCATION_PERCENT: value ÷ equity × 100. ${PERCENT}`,
  })
  percent: DerivedValueDto;
}

@ApiSchema({ name: 'SectorAllocation' })
export class SectorAllocationDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Petróleo, Gás e Biocombustíveis',
    description:
      'Sector name of the issuer, as in GET /assets; null groups the assets without sector (fixed income, crypto, issuers without one).',
  })
  sector: string | null;

  @ApiProperty({ type: DerivedValueDto, description: 'ALLOCATION_VALUE.' })
  value: DerivedValueDto;

  @ApiProperty({
    type: DerivedValueDto,
    description: `ALLOCATION_PERCENT. ${PERCENT}`,
  })
  percent: DerivedValueDto;
}

@ApiSchema({
  name: 'PortfolioAllocation',
  description:
    'B9: open positions grouped by asset class and by sector, over the equity. Classes in the order of GET positions (D63); sectors by value descending, the null group last.',
})
export class PortfolioAllocationDto {
  @ApiProperty({ type: [ClassAllocationDto] })
  byClass: ClassAllocationDto[];

  @ApiProperty({ type: [SectorAllocationDto] })
  bySector: SectorAllocationDto[];

  @ApiProperty({ type: MarketDataDto })
  marketData: MarketDataDto;
}

@ApiSchema({ name: 'EvolutionPoint' })
export class EvolutionPointDto {
  @ApiProperty({ format: 'date', example: '2026-10-30' })
  date: string;

  @ApiProperty({
    example: '17102.80',
    description:
      'Equity on the date, as PORTFOLIO_EQUITY: closes up to the date, at cost without quote.',
  })
  equity: string;

  @ApiProperty({
    example: '16151.27',
    description:
      'Invested value on the date, as PORTFOLIO_TOTAL_COST: cost of the positions open on the date.',
  })
  invested: string;
}

@ApiSchema({
  name: 'PortfolioEvolution',
  description:
    'B11: equity and invested value over time, one point per month on its last trading day, from the month of the first operation, plus the close date (marketData.closeDate). Empty without operations.',
})
export class PortfolioEvolutionDto {
  @ApiProperty({ type: [EvolutionPointDto] })
  points: EvolutionPointDto[];

  @ApiProperty({ type: MarketDataDto })
  marketData: MarketDataDto;
}

@ApiSchema({
  name: 'ReturnComparison',
  description:
    'A return over a window [from, to] next to CDI, Ibovespa and IPCA over the same window (D64). Without dividends until S6. CDI compounds its daily rates published in the window; Ibovespa goes close to close; IPCA compounds the monthly rates of the whole months inside the window, without pro rata, up to the last month published (its inputs show the first and the last month). CDI and IPCA show the compounded factors of the published rates as `startFactor` and `endFactor`; Ibovespa shows its points as `startValue` and `endValue`. A benchmark is null when none of its values falls in the window.',
})
export class ReturnComparisonDto {
  @ApiProperty({ format: 'date', example: '2025-02-12' })
  from: string;

  @ApiProperty({ format: 'date', example: '2026-11-12' })
  to: string;

  @ApiProperty({
    type: DerivedValueDto,
    description: `TWR of the portfolio (end quota ÷ start quota − 1, quotas with base 1) or ASSET_RETURN of the asset. ${PERCENT}`,
  })
  value: DerivedValueDto;

  @ApiProperty({
    type: DerivedValueDto,
    nullable: true,
    description: `CDI_RETURN. ${PERCENT}`,
  })
  cdi: DerivedValueDto | null;

  @ApiProperty({
    type: DerivedValueDto,
    nullable: true,
    description: `IBOV_RETURN. ${PERCENT}`,
  })
  ibov: DerivedValueDto | null;

  @ApiProperty({
    type: DerivedValueDto,
    nullable: true,
    description: `IPCA_RETURN. ${PERCENT}`,
  })
  ipca: DerivedValueDto | null;
}

@ApiSchema({
  name: 'ReturnPoint',
  description:
    'Cumulative return since the start of the series, in percentage points, for the chart. Null where the series has no value yet (IPCA of a month not published).',
})
export class ReturnPointDto {
  @ApiProperty({ format: 'date', example: '2026-10-30' })
  date: string;

  @ApiProperty({
    example: '9.84',
    description: 'The portfolio (TWR) or the asset (ASSET_RETURN).',
  })
  value: string;

  @ApiProperty({ type: String, nullable: true, example: '11.52' })
  cdi: string | null;

  @ApiProperty({ type: String, nullable: true, example: '12.10' })
  ibov: string | null;

  @ApiProperty({ type: String, nullable: true, example: '3.60' })
  ipca: string | null;
}

@ApiSchema({
  name: 'PortfolioPerformance',
  description:
    'B10: time-weighted return (TWR, daily quotas with the flows on the operation dates; while the portfolio is empty the quota stays) over the whole history and the last 12 months, compared with CDI, Ibovespa and IPCA. Price only: no dividends until S6.',
})
export class PortfolioPerformanceDto {
  @ApiProperty({
    type: ReturnComparisonDto,
    nullable: true,
    description:
      'From the first operation to the close date; null without operations.',
  })
  total: ReturnComparisonDto | null;

  @ApiProperty({
    type: ReturnComparisonDto,
    nullable: true,
    description:
      'The 12 months up to the close date; null with last12MonthsUnavailableReason when the history is shorter.',
  })
  last12Months: ReturnComparisonDto | null;

  @ApiPropertyOptional(UNAVAILABLE_REASON_PROPERTY)
  last12MonthsUnavailableReason?: UnavailableReason;

  @ApiProperty({
    type: [ReturnPointDto],
    description:
      'Chart of the total window: one point per month on its last trading day, plus the close date.',
  })
  series: ReturnPointDto[];

  @ApiProperty({ type: MarketDataDto })
  marketData: MarketDataDto;
}

// Asset page (C2, C3), filled by K8. Here and not in reference-data or market-data while DerivedValueDto lives in
// operations (BK-4 moves it to shared): a module imports only application and domain of another.

const PERIOD_PROPERTY = {
  enum: MARKET_PERIODS,
  enumName: 'MarketPeriod',
  example: 'P1Y',
  description:
    'Window up to the close date: P1M, P6M, P1Y, P2Y, P5Y (ISO 8601 durations) or MAX (the whole history loaded).',
} as const;

export class AssetPeriodQueryDto {
  @ApiPropertyOptional({ ...PERIOD_PROPERTY, default: 'P1Y' })
  @IsOptional()
  @IsIn(MARKET_PERIODS)
  period?: MarketPeriod;
}

@ApiSchema({ name: 'QuotePoint' })
export class QuotePointDto {
  @ApiProperty({ format: 'date', example: '2026-11-12' })
  date: string;

  @ApiProperty({ example: '32.18', description: 'Close (B3 COTAHIST).' })
  close: string;
}

@ApiSchema({
  name: 'AssetQuotes',
  description:
    'C2: last close, day change and the closes of a window, for the header and the chart of the asset page; no file or download (D59b). Closes are not adjusted for splits or reverse splits (D64b).',
})
export class AssetQuotesDto {
  @ApiProperty({
    type: ClosePriceDto,
    nullable: true,
    description: 'Null with unavailableReason NO_QUOTE.',
  })
  lastClose: ClosePriceDto | null;

  @ApiProperty({
    type: DerivedValueDto,
    nullable: true,
    description: `ASSET_DAY_CHANGE_PERCENT: (last close − previous close) ÷ previous close × 100; null without two closes. ${PERCENT}`,
  })
  dayChangePercent: DerivedValueDto | null;

  @ApiPropertyOptional(UNAVAILABLE_REASON_PROPERTY)
  unavailableReason?: UnavailableReason;

  @ApiProperty(PERIOD_PROPERTY)
  period: MarketPeriod;

  @ApiProperty({
    type: [QuotePointDto],
    description:
      'One close per trading day of the window, oldest first; a window longer than the history starts at the first close; empty with NO_QUOTE.',
  })
  series: QuotePointDto[];

  @ApiProperty({ type: MarketDataDto })
  marketData: MarketDataDto;
}

@ApiSchema({ name: 'AssetPeriodReturn' })
export class AssetPeriodReturnDto {
  @ApiProperty(PERIOD_PROPERTY)
  period: MarketPeriod;

  @ApiProperty({
    type: ReturnComparisonDto,
    nullable: true,
    description:
      'ASSET_RETURN next to CDI, Ibovespa and IPCA; null with unavailableReason.',
  })
  comparison: ReturnComparisonDto | null;

  @ApiPropertyOptional(UNAVAILABLE_REASON_PROPERTY)
  unavailableReason?: UnavailableReason;
}

@ApiSchema({
  name: 'AssetPerformance',
  description:
    'C3: return of the asset (close to close, without dividends until S6) by window, compared with CDI, Ibovespa and IPCA, and the chart of one window; no file or download (D59b).',
})
export class AssetPerformanceDto {
  @ApiProperty({
    type: [AssetPeriodReturnDto],
    description:
      'Every window of MarketPeriod but MAX, in its order; a window longer than the history has SHORT_HISTORY.',
  })
  periods: AssetPeriodReturnDto[];

  @ApiProperty(PERIOD_PROPERTY)
  period: MarketPeriod;

  @ApiProperty({
    type: [ReturnPointDto],
    description:
      'Chart of `period`: one point per trading day, cumulative since its start; a window longer than the history starts at the first close; empty with NO_QUOTE.',
  })
  series: ReturnPointDto[];

  @ApiPropertyOptional(UNAVAILABLE_REASON_PROPERTY)
  unavailableReason?: UnavailableReason;

  @ApiProperty({ type: MarketDataDto })
  marketData: MarketDataDto;
}

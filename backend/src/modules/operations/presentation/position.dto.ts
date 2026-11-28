import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { MARKET_DATA_SOURCES } from '../../market-data/domain/market-data';
import type { MarketDataSource } from '../../market-data/domain/market-data';
import {
  DERIVED_VALUE_SOURCES,
  FORMULA_CODES,
  POSITION_STATUSES,
} from '../domain/derived-value';
import type {
  DerivedValueSource,
  FormulaCode,
  PositionStatus,
  UnavailableReason,
} from '../domain/derived-value';
import { OPERATION_TYPES } from '../domain/timeline';
import type { OperationType } from '../domain/timeline';
import {
  ClosePriceDto,
  MarketDataDto,
  PERCENT,
  UNAVAILABLE_REASON_PROPERTY,
} from './market-ref.dto';
import { AssetRefDto, BrokerRefDto } from './operation.dto';

/** S1+ (D64): market fields, optional in the contract so the clients of W3 and W4 keep compiling. */
const S1_PLUS = 'S1+ (D64).';

const STATUS_PROPERTY = {
  enum: POSITION_STATUSES,
  enumName: 'PositionStatus',
  example: 'OPEN',
  description:
    'OPEN: quantity > 0. CLOSED: quantity 0 and realized profit ≠ 0 (D41).',
} as const;

@ApiSchema({ name: 'OperationRef' })
export class OperationRefDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description:
      'Null only for the operation of a preview, which is not saved yet (D42).',
  })
  id: string | null;

  @ApiProperty({
    enum: OPERATION_TYPES,
    enumName: 'OperationType',
    example: 'SELL',
  })
  type: OperationType;

  @ApiProperty({ type: BrokerRefDto })
  broker: BrokerRefDto;
}

@ApiSchema({ name: 'PortfolioRef' })
export class PortfolioRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Longo prazo' })
  name: string;
}

@ApiSchema({ name: 'AssetPositionRef' })
export class AssetPositionRefDto extends AssetRefDto {
  @ApiProperty(STATUS_PROPERTY)
  status: PositionStatus;
}

@ApiSchema({
  name: 'DerivedValue',
  description:
    'A derived number with its trace, for "como foi calculado" (D26). Texts by `formulaCode` in claude/microcopy.md, section 3.',
})
export class DerivedValueDto {
  @ApiProperty({
    example: '32.0326666666666666666666666666666666666667',
    description:
      'Decimal string, full precision (RN11): round only to display.',
  })
  value: string;

  @ApiProperty({
    enum: FORMULA_CODES,
    enumName: 'FormulaCode',
    example: 'AVG_PRICE_BUY',
  })
  formulaCode: FormulaCode;

  @ApiProperty({
    format: 'date',
    example: '2026-11-11',
    description: 'Today in America/Sao_Paulo (D54).',
  })
  asOf: string;

  @ApiProperty({ type: () => [DerivedValueInputDto] })
  inputs: readonly DerivedValueInputDto[];
}

@ApiSchema({
  name: 'DerivedValueInput',
  description:
    'A value used by the formula. `name` is a key of claude/microcopy.md, section 3 (`sales` and `positions` repeat once per item). `source` tells the origin line and which reference comes with it: OPERATION → `operation` (and `derived` on `sales` items); DERIVED → `derived`; ASSET_POSITION → `asset` and `derived`; PORTFOLIO → `portfolio` and `derived` (S1+); MARKET → `marketSource` (S1+: a close or index points as published on `referenceDate`; for `startFactor` and `endFactor` of CDI and IPCA, a factor compounded from the published rates, not a published number: before the first rate used and after the last one, each dated by that rate); POSITION → none.',
})
export class DerivedValueInputDto {
  @ApiProperty({ example: 'quantityBought' })
  name: string;

  @ApiProperty({
    example: '50',
    description: 'Decimal string, full precision (RN11).',
  })
  value: string;

  @ApiProperty({
    enum: DERIVED_VALUE_SOURCES,
    enumName: 'DerivedValueSource',
    example: 'OPERATION',
  })
  source: DerivedValueSource;

  @ApiProperty({ format: 'date', example: '2026-03-14' })
  referenceDate: string;

  @ApiPropertyOptional({ type: OperationRefDto })
  operation?: OperationRefDto;

  @ApiPropertyOptional({ type: AssetPositionRefDto })
  asset?: AssetPositionRefDto;

  @ApiPropertyOptional({
    type: DerivedValueDto,
    description: 'The trace of this value, when it is itself derived.',
  })
  derived?: DerivedValueDto;

  @ApiPropertyOptional({
    type: () => PortfolioRefDto,
    description: 'Only with source PORTFOLIO (S1+, D64): labeled by its name.',
  })
  portfolio?: PortfolioRefDto;

  @ApiPropertyOptional({
    enum: MARKET_DATA_SOURCES,
    enumName: 'MarketDataSource',
    example: 'B3_COTAHIST',
    description: 'Only with source MARKET (S1+, D64).',
  })
  marketSource?: MarketDataSource;
}

@ApiSchema({
  name: 'Position',
  description:
    'Position of one asset in the portfolio, brokers summed (RN12), derived from the operations (RN09, D4).',
})
export class PositionDto {
  @ApiProperty({ type: AssetRefDto })
  asset: AssetRefDto;

  @ApiProperty(STATUS_PROPERTY)
  status: PositionStatus;

  @ApiProperty({
    example: '100',
    description: 'Decimal string; "0" when closed.',
  })
  quantity: string;

  @ApiProperty({
    type: DerivedValueDto,
    nullable: true,
    description: 'AVG_PRICE_BUY; null when closed (RN08).',
  })
  averagePrice: DerivedValueDto | null;

  @ApiProperty({
    type: DerivedValueDto,
    nullable: true,
    description: 'TOTAL_COST; null when closed (RN08).',
  })
  totalCost: DerivedValueDto | null;

  @ApiProperty({
    type: DerivedValueDto,
    description:
      'POSITION_REALIZED_PROFIT: sum of the realized profit of every sale (RN06); "0" without sales.',
  })
  realizedProfit: DerivedValueDto;

  // S1+ (D64): present on every position, null on closed ones (like averagePrice). Market
  // value, weight and unrealized profit use the current quantity (operations up to today) × the last close.

  @ApiPropertyOptional({
    type: ClosePriceDto,
    nullable: true,
    description: `Last close up to the close date; null with unavailableReason NO_QUOTE (fixed income and crypto, D55). ${S1_PLUS}`,
  })
  lastClose?: ClosePriceDto | null;

  @ApiPropertyOptional(UNAVAILABLE_REASON_PROPERTY)
  unavailableReason?: UnavailableReason;

  @ApiPropertyOptional({
    type: DerivedValueDto,
    nullable: true,
    description: `MARKET_VALUE (quantity × last close) or, without quote, MARKET_VALUE_AT_COST (the total cost). ${S1_PLUS}`,
  })
  marketValue?: DerivedValueDto | null;

  @ApiPropertyOptional({
    type: DerivedValueDto,
    nullable: true,
    description: `UNREALIZED_PROFIT: market value − total cost; null without quote. ${S1_PLUS}`,
  })
  unrealizedProfit?: DerivedValueDto | null;

  @ApiPropertyOptional({
    type: DerivedValueDto,
    nullable: true,
    description: `UNREALIZED_PROFIT_PERCENT: unrealized profit ÷ total cost × 100, which equals (last close − average price) ÷ average price × 100: the column "Variação s/ PM". Null without quote. ${PERCENT} ${S1_PLUS}`,
  })
  unrealizedProfitPercent?: DerivedValueDto | null;

  @ApiPropertyOptional({
    type: DerivedValueDto,
    nullable: true,
    description: `POSITION_DAY_CHANGE over the close date (marketData.closeDate) against the market's previous trading day: units on the close date × the last close up to it − units on the previous trading day × the last close up to that day − buys + sales dated after the previous trading day up to the close date (a day without trading in between belongs to the day). A buy counts at its executed price plus fees and a sale at its net amount (F17); an asset that did not trade and had no operation changes 0; operations after the close date do not enter. Null without quote, or when units were held on the previous trading day without any close up to it. ${S1_PLUS}`,
  })
  dayChange?: DerivedValueDto | null;

  @ApiPropertyOptional({
    type: DerivedValueDto,
    nullable: true,
    description: `POSITION_DAY_CHANGE_PERCENT: day change ÷ (market value on the previous trading day + buys of the day) × 100. Null with dayChange, or when that base is zero. ${PERCENT} ${S1_PLUS}`,
  })
  dayChangePercent?: DerivedValueDto | null;

  @ApiPropertyOptional({
    type: DerivedValueDto,
    nullable: true,
    description: `PORTFOLIO_WEIGHT: market value ÷ equity × 100 ("% da carteira"). ${PERCENT} ${S1_PLUS}`,
  })
  portfolioWeight?: DerivedValueDto | null;
}

@ApiSchema({
  name: 'PortfolioSummary',
  description: 'Totals of the portfolio (B7).',
})
export class PortfolioSummaryDto {
  @ApiProperty({
    type: DerivedValueDto,
    description:
      'PORTFOLIO_TOTAL_COST: sum of the cost of the open positions; one `positions` input per open position.',
  })
  totalCost: DerivedValueDto;

  @ApiProperty({
    type: DerivedValueDto,
    description:
      'PORTFOLIO_REALIZED_PROFIT: one `positions` input per row with realized profit ≠ 0, open or closed (empty when none); equals the sum of the rows of GET positions (D41).',
  })
  realizedProfit: DerivedValueDto;

  @ApiProperty({ example: 4, description: 'Open positions.' })
  assetCount: number;

  @ApiPropertyOptional({
    type: DerivedValueDto,
    description: `PORTFOLIO_EQUITY ("Patrimônio"): sum of the market value of the open positions, at cost without quote; one \`positions\` input per open position. ${S1_PLUS}`,
  })
  equity?: DerivedValueDto;

  @ApiPropertyOptional({
    type: DerivedValueDto,
    description: `PORTFOLIO_UNREALIZED_PROFIT: equity − total cost. ${S1_PLUS}`,
  })
  unrealizedProfit?: DerivedValueDto;

  @ApiPropertyOptional({
    type: DerivedValueDto,
    nullable: true,
    description: `PORTFOLIO_UNREALIZED_PROFIT_PERCENT: unrealized profit ÷ total cost × 100; null without open positions. ${PERCENT} ${S1_PLUS}`,
  })
  unrealizedProfitPercent?: DerivedValueDto | null;

  @ApiPropertyOptional({ type: MarketDataDto, description: S1_PLUS })
  marketData?: MarketDataDto;
}

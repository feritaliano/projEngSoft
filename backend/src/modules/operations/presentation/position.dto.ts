import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import {
  DERIVED_VALUE_SOURCES,
  FORMULA_CODES,
  POSITION_STATUSES,
} from '../domain/derived-value';
import type {
  DerivedValueSource,
  FormulaCode,
  PositionStatus,
} from '../domain/derived-value';
import { OPERATION_TYPES } from '../domain/timeline';
import type { OperationType } from '../domain/timeline';
import { AssetRefDto, BrokerRefDto } from './operation.dto';

const STATUS_PROPERTY = {
  enum: POSITION_STATUSES,
  enumName: 'PositionStatus',
  example: 'OPEN',
  description:
    'OPEN: quantity > 0. CLOSED: quantity 0 and realized profit ≠ 0 (D41).',
} as const;

@ApiSchema({ name: 'OperationRef' })
export class OperationRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    enum: OPERATION_TYPES,
    enumName: 'OperationType',
    example: 'SELL',
  })
  type: OperationType;

  @ApiProperty({ type: BrokerRefDto })
  broker: BrokerRefDto;
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
    'A value used by the formula. `name` is a key of claude/microcopy.md, section 3 (`sales` and `positions` repeat once per item). `source` tells the origin line and which reference comes with it: OPERATION → `operation` (and `derived` on `sales` items); DERIVED → `derived`; ASSET_POSITION → `asset` and `derived`; POSITION → none.',
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
}

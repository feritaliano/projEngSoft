import {
  ApiProperty,
  ApiPropertyOptional,
  ApiSchema,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ASSET_TYPES } from '../domain/asset-type';
import type { AssetType } from '../domain/asset-type';
import {
  DEFAULT_HISTORY_PAGE_SIZE,
  MAX_HISTORY_PAGE,
  MAX_HISTORY_PAGE_SIZE,
} from '../domain/operation-history';
import { OPERATION_TYPES } from '../domain/timeline';
import type { OperationType } from '../domain/timeline';

// Shape only: the sign and the limits of each value (RN04 by class, decimal places and digits of the column, D50) are
// domain rules, checked after the asset is known, with the same errors[].field and their own code (D56): a negative
// quantity is NOT_POSITIVE and negative fees are NEGATIVE, not INVALID_FORMAT.
const PLAIN_DECIMAL = /^-?\d+(\.\d+)?$/;
const PLAIN_DECIMAL_MESSAGE =
  '$property must be a plain decimal string (e.g. "1234.56")';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Longer than any value the columns hold (12 + 8 digits and the point), far shorter than an abusive body. */
const DECIMAL_MAX_LENGTH = 32;

const EXAMPLE_ASSET_ID = '6b0d3a52-1f5e-4f0a-9d7c-3e2b8a1c4d90';
const EXAMPLE_BROKER_ID = '0c9e7f3a-5b2d-4e81-a6c4-9d1f2b3e4a57';
const EXAMPLE_OPERATION_ID = '9a4e1c27-6d3b-4f80-b5a2-1e7c9d0f3b64';

/** B2: the body of a new operation. Decimals as strings (RN11). */
export class CreateOperationDto {
  @ApiProperty({
    format: 'uuid',
    example: EXAMPLE_ASSET_ID,
    description: 'An active asset of the catalog (C1).',
  })
  @IsUUID('all')
  assetId: string;

  @ApiProperty({
    format: 'uuid',
    example: EXAMPLE_BROKER_ID,
    description: 'Broker or exchange (D9).',
  })
  @IsUUID('all')
  brokerId: string;

  @ApiProperty({
    enum: OPERATION_TYPES,
    enumName: 'OperationType',
    example: 'BUY',
  })
  @IsIn(OPERATION_TYPES)
  type: OperationType;

  @ApiProperty({
    format: 'date',
    example: '2026-10-28',
    description: 'YYYY-MM-DD, not after today in São Paulo (RN04, D54).',
  })
  @IsString()
  @Matches(ISO_DATE, {
    message: '$property must be a date in YYYY-MM-DD format',
  })
  tradeDate: string;

  @ApiProperty({
    example: '100',
    pattern: PLAIN_DECIMAL.source,
    description:
      'Greater than zero (RN04): whole units for stocks, FIIs, ETFs and BDRs; multiples of 0.01 for fixed income; up to 8 decimal places for crypto; at most 12 digits before the point.',
  })
  @IsString()
  @MaxLength(DECIMAL_MAX_LENGTH)
  @Matches(PLAIN_DECIMAL, { message: PLAIN_DECIMAL_MESSAGE })
  quantity: string;

  @ApiProperty({
    example: '29.95',
    pattern: PLAIN_DECIMAL.source,
    description:
      'Greater than zero, up to 8 decimal places, at most 12 digits before the point.',
  })
  @IsString()
  @MaxLength(DECIMAL_MAX_LENGTH)
  @Matches(PLAIN_DECIMAL, { message: PLAIN_DECIMAL_MESSAGE })
  unitPrice: string;

  @ApiProperty({
    example: '5.00',
    pattern: PLAIN_DECIMAL.source,
    description:
      'Brokerage and fees of the note: zero or more, up to 2 decimal places.',
  })
  @IsString()
  @MaxLength(DECIMAL_MAX_LENGTH)
  @Matches(PLAIN_DECIMAL, { message: PLAIN_DECIMAL_MESSAGE })
  fees: string;
}

/** B4: the fields to change; the ones not sent keep their stored value. */
export class UpdateOperationDto extends PartialType(CreateOperationDto) {}

export class ListOperationsQueryDto {
  @ApiPropertyOptional({ format: 'uuid', example: EXAMPLE_ASSET_ID })
  @IsOptional()
  @IsUUID('all')
  assetId?: string;

  @ApiPropertyOptional({ format: 'uuid', example: EXAMPLE_BROKER_ID })
  @IsOptional()
  @IsUUID('all')
  brokerId?: string;

  @ApiPropertyOptional({
    enum: ASSET_TYPES,
    enumName: 'AssetType',
    example: 'FII',
    description: 'Asset class (D45).',
  })
  @IsOptional()
  @IsIn(ASSET_TYPES)
  assetType?: AssetType;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_HISTORY_PAGE,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_HISTORY_PAGE)
  page?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_HISTORY_PAGE_SIZE,
    default: DEFAULT_HISTORY_PAGE_SIZE,
    example: DEFAULT_HISTORY_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_HISTORY_PAGE_SIZE)
  pageSize?: number;
}

@ApiSchema({ name: 'AssetRef' })
export class AssetRefDto {
  @ApiProperty({ format: 'uuid', example: EXAMPLE_ASSET_ID })
  id: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'PETR4',
    description: 'Null for fixed income (D50).',
  })
  ticker: string | null;

  @ApiProperty({
    example: 'PETR4',
    description:
      'Ticker for stocks, FIIs, ETFs and BDRs; name for crypto; bond type and maturity year for fixed income (D50).',
  })
  displayName: string;

  @ApiProperty({ enum: ASSET_TYPES, enumName: 'AssetType', example: 'STOCK' })
  assetType: AssetType;
}

@ApiSchema({ name: 'BrokerRef' })
export class BrokerRefDto {
  @ApiProperty({ format: 'uuid', example: EXAMPLE_BROKER_ID })
  id: string;

  @ApiProperty({ example: 'XP Investimentos' })
  name: string;
}

export class OperationDto {
  @ApiProperty({ format: 'uuid', example: EXAMPLE_OPERATION_ID })
  id: string;

  @ApiProperty({
    enum: OPERATION_TYPES,
    enumName: 'OperationType',
    example: 'BUY',
  })
  type: OperationType;

  @ApiProperty({ format: 'date', example: '2026-01-05' })
  tradeDate: string;

  @ApiProperty({ example: '100' })
  quantity: string;

  @ApiProperty({ example: '29.95' })
  unitPrice: string;

  @ApiProperty({ example: '5' })
  fees: string;

  @ApiProperty({ type: AssetRefDto })
  asset: AssetRefDto;

  @ApiProperty({ type: BrokerRefDto })
  broker: BrokerRefDto;
}

export class OperationPageDto {
  @ApiProperty({
    type: [OperationDto],
    description: 'Most recent first: trade date, then order of entry.',
  })
  items: OperationDto[];

  @ApiProperty({
    example: 9,
    description: 'Operations matching the filters, across all pages.',
  })
  total: number;
}

@ApiSchema({ name: 'ViolatingOperation' })
export class ViolatingOperationDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    example: EXAMPLE_OPERATION_ID,
    description:
      'Null only when the offending sell is the operation being created (nothing was saved).',
  })
  id: string | null;

  @ApiProperty({ enum: ['SELL'], example: 'SELL' })
  type: 'SELL';

  @ApiProperty({ format: 'date', example: '2026-05-22' })
  tradeDate: string;

  @ApiProperty({ example: '50' })
  quantity: string;

  @ApiProperty({ type: AssetRefDto })
  asset: AssetRefDto;

  @ApiProperty({ type: BrokerRefDto })
  broker: BrokerRefDto;
}

/** What BusinessRuleError (C2) shows; the same object is the `violation` of the preview (D42). */
@ApiSchema({ name: 'RuleViolation' })
export class RuleViolationDto {
  @ApiProperty({
    enum: ['RN07', 'RN10'],
    example: 'RN10',
    description:
      'RN07: the operation being saved is a sell above the position at its date. RN10: the change makes a later sell exceed the position at its date.',
  })
  rule: 'RN07' | 'RN10';

  @ApiProperty({
    type: ViolatingOperationDto,
    description: 'The offending sell (the first one, chronologically).',
  })
  operation: ViolatingOperationDto;

  @ApiProperty({
    example: '40',
    description: 'Units held at the date of the offending sell, before it.',
  })
  availableQuantity: string;

  @ApiProperty({ example: '50' })
  soldQuantity: string;
}

/** Extension members of the 422 problem (RN07, RN10). */
@ApiSchema({ name: 'RuleViolationProblem' })
export class RuleViolationProblemDto {
  @ApiProperty({ type: RuleViolationDto })
  violation: RuleViolationDto;
}

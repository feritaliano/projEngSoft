import type { MarketDataSource } from '../../market-data/domain/market-data';
import type { AssetRef, BrokerRef } from './catalog-refs';
import type { OperationType } from './timeline';

/**
 * "Como foi calculado" contract (D26; claude/microcopy.md, section 3). Lives here while operations is the only module
 * that derives numbers; it moves to shared when a second one (S3) does.
 */
export const FORMULA_CODES = [
  'AVG_PRICE_BUY',
  'TOTAL_COST',
  'REALIZED_PROFIT',
  'POSITION_REALIZED_PROFIT',
  'PORTFOLIO_TOTAL_COST',
  'PORTFOLIO_REALIZED_PROFIT',
  'OPERATION_GROSS',
  'OPERATION_TOTAL_BUY',
  'OPERATION_NET_SELL',
  // S1+ (D64): market value and returns, implemented by K7 (portfolio) and K8 (asset page).
  'MARKET_VALUE',
  'MARKET_VALUE_AT_COST',
  'UNREALIZED_PROFIT',
  'UNREALIZED_PROFIT_PERCENT',
  'POSITION_DAY_CHANGE',
  'POSITION_DAY_CHANGE_PERCENT',
  'PORTFOLIO_WEIGHT',
  'PORTFOLIO_EQUITY',
  'PORTFOLIO_UNREALIZED_PROFIT',
  'PORTFOLIO_UNREALIZED_PROFIT_PERCENT',
  'ALLOCATION_VALUE',
  'ALLOCATION_PERCENT',
  'TWR',
  'ASSET_DAY_CHANGE_PERCENT',
  'ASSET_RETURN',
  'CDI_RETURN',
  'IBOV_RETURN',
  'IPCA_RETURN',
] as const;
export type FormulaCode = (typeof FORMULA_CODES)[number];

export const DERIVED_VALUE_SOURCES = [
  'POSITION',
  'OPERATION',
  'DERIVED',
  'ASSET_POSITION',
  'MARKET',
] as const;
export type DerivedValueSource = (typeof DERIVED_VALUE_SOURCES)[number];

/** OPEN: quantity > 0. CLOSED: quantity 0 and realized profit ≠ 0 (D41). */
export const POSITION_STATUSES = ['OPEN', 'CLOSED'] as const;
export type PositionStatus = (typeof POSITION_STATUSES)[number];

/**
 * Why a market number is null (D64): NO_QUOTE = no close for the asset (fixed income and crypto until S11, D55, or a
 * B3 asset never traded in the history), the position goes by its cost; SHORT_HISTORY = history shorter than the window.
 */
export const UNAVAILABLE_REASONS = ['NO_QUOTE', 'SHORT_HISTORY'] as const;
export type UnavailableReason = (typeof UNAVAILABLE_REASONS)[number];

/** The operation an OPERATION input comes from: "{Compra | Venda} de {data} · {corretora}". */
export interface OperationRef {
  /** Null for the operation of a preview that is not saved yet (D42), as in the `violation`. */
  readonly id: string | null;
  readonly type: OperationType;
  readonly broker: BrokerRef;
}

/** The asset position an ASSET_POSITION input comes from: "{ticker ou displayName} · {aberta | encerrada}". */
export interface AssetPositionRef extends AssetRef {
  readonly status: PositionStatus;
}

/** Keys of the inputs in claude/microcopy.md, section 3: contract with the front, which labels each input by it. */
export type InputName =
  | 'quantityBefore'
  | 'avgPriceBefore'
  | 'quantityBought'
  | 'unitPrice'
  | 'fees'
  | 'quantity'
  | 'avgPrice'
  | 'quantitySold'
  | 'avgPriceAtSale'
  | 'sales'
  | 'positions'
  | 'grossValue'
  // S1+ (D64)
  | 'lastClose'
  | 'previousClose'
  | 'totalCost'
  | 'marketValue'
  | 'previousMarketValue'
  | 'dayBuys'
  | 'daySales'
  | 'dayChange'
  | 'unrealizedProfit'
  | 'equity'
  | 'groupValue'
  | 'startQuota'
  | 'endQuota'
  | 'startClose'
  | 'endClose'
  | 'startValue'
  | 'endValue';

interface InputBase {
  /** `sales` and `positions` repeat once per item. */
  readonly name: InputName;
  /** Decimal string, full precision (RN11). */
  readonly value: string;
  /** YYYY-MM-DD. */
  readonly referenceDate: string;
}

/** One value used by a formula; `source` says where it comes from (microcopy, section 2) and which link it carries. */
export type DerivedValueInput =
  | (InputBase & { readonly source: 'POSITION' })
  | (InputBase & {
      readonly source: 'OPERATION';
      readonly operation: OperationRef;
      /** Set when the value is itself derived (a sale's realized profit). */
      readonly derived?: DerivedValue;
    })
  | (InputBase & { readonly source: 'DERIVED'; readonly derived: DerivedValue })
  | (InputBase & {
      readonly source: 'ASSET_POSITION';
      readonly asset: AssetPositionRef;
      readonly derived: DerivedValue;
    })
  | (InputBase & {
      /** A close or an index value as published, on `referenceDate` (D27, D59). */
      readonly source: 'MARKET';
      readonly marketSource: MarketDataSource;
    });

/** A derived number with its trace (D12, D26). Never stored (D4). */
export interface DerivedValue {
  /** Decimal string, full precision (RN11): rounding is for display only. */
  readonly value: string;
  readonly formulaCode: FormulaCode;
  /** Day of the calculation: today in America/Sao_Paulo (D54). */
  readonly asOf: string;
  readonly inputs: readonly DerivedValueInput[];
}

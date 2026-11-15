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
] as const;
export type FormulaCode = (typeof FORMULA_CODES)[number];

export const DERIVED_VALUE_SOURCES = [
  'POSITION',
  'OPERATION',
  'DERIVED',
  'ASSET_POSITION',
] as const;
export type DerivedValueSource = (typeof DERIVED_VALUE_SOURCES)[number];

/** OPEN: quantity > 0. CLOSED: quantity 0 and realized profit ≠ 0 (D41). */
export const POSITION_STATUSES = ['OPEN', 'CLOSED'] as const;
export type PositionStatus = (typeof POSITION_STATUSES)[number];

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
  | 'grossValue';

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

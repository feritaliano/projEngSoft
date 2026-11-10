import {
  FieldErrorCode,
  FieldErrorParams,
  InvalidValueError,
} from '../../../shared/domain/domain-error';
import { Quantity } from '../../../shared/domain/quantity';
import { AssetType } from './asset-type';

interface QuantityRule {
  readonly maxDecimalPlaces: number;
  readonly code: FieldErrorCode;
  readonly params?: FieldErrorParams;
  readonly description: string;
}

/** RN04 by asset class (D50): the database only guarantees quantity > 0, so the class rule lives here. */
export class InvalidQuantityError extends InvalidValueError {
  constructor(
    readonly assetType: AssetType,
    readonly quantity: Quantity,
    rule: QuantityRule,
  ) {
    super(
      'quantity',
      rule.code,
      `${quantity.toString()} is not allowed for ${assetType}: ${rule.description}`,
      rule.params,
    );
  }
}

const WHOLE_UNITS: QuantityRule = {
  maxDecimalPlaces: 0,
  code: 'NOT_INTEGER',
  description: 'must be a whole number of units',
};

const RULES: Record<AssetType, QuantityRule> = {
  STOCK: WHOLE_UNITS,
  FII: WHOLE_UNITS,
  ETF: WHOLE_UNITS,
  BDR: WHOLE_UNITS,
  FIXED_INCOME: {
    maxDecimalPlaces: 2,
    code: 'INVALID_STEP',
    params: { step: '0.01' },
    description: 'must be a multiple of 0.01',
  },
  CRYPTO: {
    maxDecimalPlaces: 8,
    code: 'TOO_MANY_DECIMALS',
    params: { maxDecimals: 8 },
    description: 'must have at most 8 decimal places',
  },
};

/**
 * Throws InvalidQuantityError unless the quantity of an operation fits its asset class (RN04): whole units
 * (NOT_INTEGER) for stocks, FIIs, ETFs and BDRs; multiples of 0.01 (INVALID_STEP) for renda fixa; up to 8 decimal
 * places (TOO_MANY_DECIMALS) for cripto. More places than the column holds (NUMERIC(20,8)) would be rounded silently
 * by the database, so they are rejected here. Quantity > 0 is guaranteed by timelineOperation; corporate events may
 * leave fractions and are not checked here.
 */
export function assertQuantityAllowed(
  assetType: AssetType,
  quantity: Quantity,
): void {
  const rule = RULES[assetType];
  if (quantity.decimalPlaces() > rule.maxDecimalPlaces) {
    throw new InvalidQuantityError(assetType, quantity, rule);
  }
}

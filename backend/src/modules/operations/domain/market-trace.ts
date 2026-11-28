import type { Decimal } from '../../../shared/domain/decimal';
import type { LocalDate } from '../../../shared/domain/local-date';
import type { MarketDataSource } from '../../market-data/domain/market-data';
import type {
  DerivedValue,
  DerivedValueInput,
  FormulaCode,
  InputName,
} from './derived-value';

// Builders of the S1+ traces (D26, D64): formula codes and input names are FormulaCode and InputName of derived-value.ts.

/** A derived number, full precision (RN11), dated by the day of the calculation (D54). */
export function derivedValue(
  formulaCode: FormulaCode,
  value: Decimal,
  inputs: readonly DerivedValueInput[],
  asOf: LocalDate,
): DerivedValue {
  if (!value.isFinite()) {
    // A division by zero that escaped a guard: a server fault (500), never a field error.
    throw new Error(`${formulaCode} is not a finite number`);
  }
  return {
    value: value.toFixed(),
    formulaCode,
    asOf: asOf.toString(),
    inputs,
  };
}

/** A value computed from the user's operations up to a date ("Suas operações até {data}"). */
export function positionInput(
  name: InputName,
  value: Decimal,
  referenceDate: string,
): DerivedValueInput {
  return { name, value: value.toFixed(), source: 'POSITION', referenceDate };
}

/** A published value (a close, index points) or a factor compounded from published rates, on `referenceDate`. */
export function marketInput(
  name: InputName,
  value: Decimal | string,
  referenceDate: string,
  marketSource: MarketDataSource,
): DerivedValueInput {
  return {
    name,
    value: typeof value === 'string' ? value : value.toFixed(),
    source: 'MARKET',
    referenceDate,
    marketSource,
  };
}

/** Another derived number, linked so the panel can open its own trace. */
export function derivedInput(
  name: InputName,
  derived: DerivedValue,
  referenceDate: string,
): DerivedValueInput {
  return {
    name,
    value: derived.value,
    source: 'DERIVED',
    referenceDate,
    derived,
  };
}

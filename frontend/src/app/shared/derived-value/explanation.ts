import { AssetType, DerivedValue, DerivedValueInput, FormulaCode } from '../../api/models';
import { assetName } from '../assets/asset-type';
import {
  Tone,
  formatAmount,
  formatAveragePrice,
  formatDate,
  formatMoney,
  formatQuantity,
  formatSignedMoney,
} from '../format/pt-br';
import {
  EXPLAINER_TEXTS,
  FORMULA_TEXTS,
  INPUT_LABELS,
  INPUT_LABEL_BY_FORMULA,
} from './microcopy.pt-BR';

/** The asset a number is about: names it in the panel and formats its quantities by class (handoff U5). */
export interface ExplainedAsset {
  ticker: string | null;
  displayName: string;
  assetType: AssetType;
}

/** What the panel shows; a link swaps the panel to another DerivedValue (microcopy, section 2). */
export interface Explained {
  value: DerivedValue;
  asset: ExplainedAsset | null;
}

export interface ExplanationRow {
  label: string;
  value: string;
  tone: Tone;
  /** Origin line: plain text, a link to another value, or nothing (unknown source). */
  origin: string | null;
  link: Explained | null;
}

export interface Explanation {
  heading: string;
  value: string;
  tone: Tone;
  formula: string;
  rows: ExplanationRow[];
  /** Text instead of the rows when a sum has no items (microcopy, section 4). */
  empty: string | null;
  account: string;
  explanation: string;
  footer: string;
}

const PROFIT: readonly FormulaCode[] = [
  'REALIZED_PROFIT',
  'POSITION_REALIZED_PROFIT',
  'PORTFOLIO_REALIZED_PROFIT',
];
const QUANTITIES = ['quantityBefore', 'quantityBought', 'quantity', 'quantitySold'];
const AVERAGE_PRICES = ['avgPriceBefore', 'avgPrice', 'avgPriceAtSale'];

/** A gain or loss with its tone; any other amount in R$. */
const money = (value: string, signed: boolean): { value: string; tone: Tone } => {
  if (!signed) return { value: formatMoney(value), tone: 'neutral' };
  const { text, tone } = formatSignedMoney(value);
  return { value: text, tone };
};

/** A number in the "Conta": quantity by class, intermediate PM with up to 4 places, money with 2 (section 1). */
function accountNumber(name: string, value: string, asset: ExplainedAsset | null): string {
  if (QUANTITIES.includes(name)) return formatQuantity(value, asset?.assetType ?? 'STOCK');
  if (AVERAGE_PRICES.includes(name)) return formatAveragePrice(value);
  return signedAmount(value);
}

/** "−12,40" with the typographic minus (handoff U5), the string's own sign: nothing is computed. */
const signedAmount = (value: string) => formatAmount(value).replace('-', '−');

/** "293,47 − 12,40 + 412,80": each item with its own sign, as in the frame of C1. */
function sum(inputs: readonly DerivedValueInput[]): string {
  return inputs
    .map(({ value }, i) => {
      const negative = value.startsWith('-');
      const amount = formatAmount(negative ? value.slice(1) : value);
      if (i === 0) return negative ? `− ${amount}` : amount;
      return `${negative ? '−' : '+'} ${amount}`;
    })
    .join(' ');
}

function account({ value, formulaCode, inputs }: DerivedValue, asset: ExplainedAsset | null) {
  const template = FORMULA_TEXTS[formulaCode].account;
  if (template) {
    const byName = new Map(inputs.map((input) => [input.name, input.value]));
    return template.replace(/\{(\w+)\}/g, (_, name: string) => {
      if (name === 'value') return signedAmount(value);
      const input = byName.get(name);
      return input === undefined ? '—' : accountNumber(name, input, asset);
    });
  }
  // Microcopy, section 3: with a single sale, the account of that sale; section 4: an empty sum is "= R$ 0,00".
  if (formulaCode === 'POSITION_REALIZED_PROFIT' && inputs.length === 1 && inputs[0].derived) {
    return account(inputs[0].derived, asset);
  }
  if (!inputs.length) return `= ${formatMoney(value)}`;
  return `${sum(inputs)} = ${signedAmount(value)}`;
}

function row(
  input: DerivedValueInput,
  formulaCode: FormulaCode,
  asset: ExplainedAsset | null,
): ExplanationRow {
  const date = formatDate(input.referenceDate);
  const operation = input.operation;
  let operationLine: string | null = null;
  if (operation?.id === null) {
    operationLine = EXPLAINER_TEXTS.form; // the form's own operation in a preview, not saved yet (D42, U7a)
  } else if (operation) {
    operationLine = EXPLAINER_TEXTS.operation(operation.type, date, operation.broker.name);
  }
  const linkTo = (target: DerivedValue | undefined, of: ExplainedAsset | null) =>
    target ? { value: target, asset: of } : null;

  let label =
    INPUT_LABEL_BY_FORMULA[formulaCode]?.[input.name] ?? INPUT_LABELS[input.name] ?? input.name;
  let origin: string | null = null;
  let link: Explained | null = null;
  if (input.name === 'sales') {
    label = operationLine ?? label;
    link = linkTo(input.derived, asset);
    origin = input.derived
      ? EXPLAINER_TEXTS.derived(FORMULA_TEXTS[input.derived.formulaCode].of)
      : null;
  } else if (input.source === 'ASSET_POSITION' && input.asset) {
    label = assetName(input.asset);
    link = linkTo(input.derived, input.asset);
    origin = input.derived
      ? EXPLAINER_TEXTS.assetPosition(
          input.asset.status === 'OPEN',
          FORMULA_TEXTS[input.derived.formulaCode].of,
        )
      : null;
  } else if (input.source === 'DERIVED' && input.derived) {
    link = linkTo(input.derived, asset);
    origin = EXPLAINER_TEXTS.derived(FORMULA_TEXTS[input.derived.formulaCode].of);
  } else if (input.source === 'OPERATION') {
    origin = operationLine;
  } else if (input.source === 'POSITION') {
    origin = EXPLAINER_TEXTS.position(date);
  }

  const shown = QUANTITIES.includes(input.name)
    ? { value: formatQuantity(input.value, asset?.assetType ?? 'STOCK'), tone: 'neutral' as Tone }
    : money(
        input.value,
        PROFIT.includes(formulaCode) && ['sales', 'positions'].includes(input.name),
      );
  return { label, ...shown, origin, link };
}

/** The panel of the DerivedValueExplainer (C1) for any DerivedValue (D26); `preview` marks the estimated profit (D42). */
export function explain({ value, asset }: Explained, preview = false): Explanation {
  const texts = FORMULA_TEXTS[value.formulaCode];
  const estimated = preview && value.formulaCode === 'REALIZED_PROFIT';
  const label = estimated ? EXPLAINER_TEXTS.estimatedLabel : texts.label;
  const shown = money(value.value, PROFIT.includes(value.formulaCode));
  return {
    heading: asset ? `${label} · ${assetName(asset)}` : label,
    value: shown.value,
    tone: shown.tone,
    formula: texts.formula,
    rows: value.inputs.map((input) => row(input, value.formulaCode, asset)),
    empty:
      value.formulaCode === 'PORTFOLIO_REALIZED_PROFIT' && !value.inputs.length
        ? EXPLAINER_TEXTS.noSales
        : null,
    account: account(value, asset),
    explanation: estimated
      ? `${texts.explanation} ${EXPLAINER_TEXTS.estimatedNote}`
      : texts.explanation,
    footer: EXPLAINER_TEXTS.footer(formatDate(value.asOf)),
  };
}

/** Name of the ⓘ (microcopy, section 1): "Como foi calculado: {Rótulo}". */
export const triggerLabel = (value: DerivedValue, preview = false): string =>
  EXPLAINER_TEXTS.trigger(
    preview && value.formulaCode === 'REALIZED_PROFIT'
      ? EXPLAINER_TEXTS.estimatedLabel
      : FORMULA_TEXTS[value.formulaCode].label,
  );

import { AssetType } from '../../api/models';

// RN11: the API sends money and quantities as decimal strings; Intl formats the string itself (exact decimal,
// half-expand rounding), so nothing is converted to number. The cast only narrows the type for es2023.intl.
const decimal = (value: string) => value as Intl.StringNumericLiteral;

const MONEY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const SIGNED_MONEY = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  signDisplay: 'exceptZero',
});

const WHOLE = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
/** Handoff U5, quantity per class: whole with thousands separator; fixed income 2 places; crypto up to 8. */
const QUANTITY: Record<AssetType, Intl.NumberFormat> = {
  STOCK: WHOLE,
  FII: WHOLE,
  ETF: WHOLE,
  BDR: WHOLE,
  FIXED_INCOME: new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  CRYPTO: new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 8 }),
};

export type Tone = 'positive' | 'negative' | 'neutral';

/** "R$ 1.234,56". */
export const formatMoney = (value: string): string => MONEY.format(decimal(value));

/**
 * Gain or loss (handoff U5): "+ R$ 293,47", "− R$ 12,40" (U+2212) and "R$ 0,00", with the tone for the color; the
 * sign is decided after rounding, so "-0.001" is "R$ 0,00".
 */
export function formatSignedMoney(value: string): { text: string; tone: Tone } {
  let tone: Tone = 'neutral';
  const text = SIGNED_MONEY.formatToParts(decimal(value))
    .map(({ type, value: part }) => {
      if (type === 'plusSign') {
        tone = 'positive';
        return '+ ';
      }
      if (type === 'minusSign') {
        tone = 'negative';
        return '− ';
      }
      return part;
    })
    .join('');
  return { text, tone };
}

export const formatQuantity = (value: string, assetType: AssetType): string =>
  QUANTITY[assetType].format(decimal(value));

const AMOUNT = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const AVERAGE_PRICE = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/** Money in the "Conta" of the explainer (microcopy, section 1): no currency, "1.804,90". */
export const formatAmount = (value: string): string => AMOUNT.format(decimal(value));

/** An intermediate average price in the "Conta": up to 4 places, "32,0327" (microcopy, section 1). */
export const formatAveragePrice = (value: string): string => AVERAGE_PRICE.format(decimal(value));

const SAO_PAULO_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });

/** Today in America/Sao_Paulo as YYYY-MM-DD: the day the backend uses to refuse a future date (D54). */
export const todayInSaoPaulo = (now = new Date()): string => SAO_PAULO_DAY.format(now);

/** "2026-10-28" → "28/10/2026". */
export const formatDate = (isoDate: string): string => isoDate.split('-').reverse().join('/');

export const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

import type { IndexPoint } from '../../market-data/domain/market-data';
import { toIsoDate } from './business-days';
import { SourceFileError } from './instruments-file';

const BR_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const PLAIN_DECIMAL = /^-?\d+(\.\d+)?$/;

/**
 * Reads a series of the BCB SGS API (`/dados/serie/bcdata.sgs.{code}/dados?formato=json`): an array of
 * { data: "DD/MM/AAAA", valor: "0.050788" }, values with a decimal point (CDI in % a day, IPCA in % a month).
 */
export function parseSgsSeries(text: string): IndexPoint[] {
  let items: unknown;
  try {
    items = JSON.parse(text);
  } catch {
    throw new SourceFileError('The SGS response is not JSON');
  }
  if (!Array.isArray(items)) {
    throw new SourceFileError('The SGS response is not a list of values');
  }
  return items.map((item: unknown, index): IndexPoint => {
    const { data, valor } = (item ?? {}) as Record<string, unknown>;
    const match = typeof data === 'string' ? BR_DATE.exec(data) : null;
    const date =
      match && toIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));
    if (!date || typeof valor !== 'string' || !PLAIN_DECIMAL.test(valor)) {
      throw new SourceFileError(
        `The SGS value ${index + 1} is not { data: "DD/MM/AAAA", valor: "<decimal>" }: ${JSON.stringify(item)}`,
      );
    }
    return { date, value: valor };
  });
}

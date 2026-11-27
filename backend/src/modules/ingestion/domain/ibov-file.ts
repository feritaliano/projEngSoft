import type { IndexPoint } from '../../market-data/domain/market-data';
import { toIsoDate } from './business-days';
import { SourceFileError } from './instruments-file';

const HEADER = 'Dia;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez';
/** Brazilian number with thousands dots and 2 decimals, as the B3 publishes the closing points ("171.324,31"). */
const POINTS = /^\d{1,3}(\.\d{3})*,\d{2}$/;

export interface IbovYear {
  readonly year: number;
  /** Closing points by trading day, in date order. */
  readonly points: readonly IndexPoint[];
}

/**
 * Reads the yearly Ibovespa file of the B3 index page ("Dados históricos e estatísticas", Download button; fontes-poc
 * 2.3): title "IBOV - AAAA", then one row per day of the month (1 to 31) with one column per month. Rows that are not a
 * day (the blank line and the footer of monthly minimum and maximum, F6) are skipped; an empty cell is a day without
 * trading.
 */
export function parseIbovYear(text: string): IbovYear {
  const lines = text.split(/\r?\n/);
  const title = /^IBOV - (\d{4})$/.exec(lines[0].trim());
  if (!title) {
    throw new SourceFileError('The IBOV file has no "IBOV - <year>" title');
  }
  if (lines[1]?.trim() !== HEADER) {
    throw new SourceFileError(`The IBOV file has no "${HEADER}" header`);
  }
  const year = Number(title[1]);
  const points: IndexPoint[] = [];
  for (const line of lines.slice(2)) {
    const cells = line.split(';').map((cell) => cell.trim());
    if (!/^\d{1,2}$/.test(cells[0])) continue;
    const day = Number(cells[0]);
    for (let month = 1; month <= 12; month++) {
      const cell = cells[month] ?? '';
      if (cell === '') continue;
      const date = toIsoDate(year, month, day);
      if (!date || !POINTS.test(cell)) {
        throw new SourceFileError(
          `The IBOV file has "${cell}" on day ${day} of month ${month}: not a closing value of a real date`,
        );
      }
      points.push({
        date,
        value: cell.replaceAll('.', '').replace(',', '.'),
      });
    }
  }
  points.sort((a, b) => a.date.localeCompare(b.date));
  return { year, points };
}

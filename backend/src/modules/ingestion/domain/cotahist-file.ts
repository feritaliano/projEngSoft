import { SourceFileError } from './instruments-file';

/** CODBDI of the FIIs in the COTAHIST (layout SeriesHistoricas_Layout.pdf; fontes-poc 3.1). */
const FII_BDI = '12';
const CASH_MARKET = '010';

export interface CotahistFiis {
  /** Trading day of the file (header, positions 24–31), YYYY-MM-DD. */
  readonly date: string;
  readonly fiiTickers: ReadonlySet<string>;
}

/**
 * Reads, from a daily COTAHIST, only the tickers traded as FII in the cash market: the Cadastro de Instrumentos does not
 * tell a FII from other funds (F7). Fixed-width records; type 01 is a quote.
 */
export function parseCotahistFiis(text: string): CotahistFiis {
  const lines = text.split(/\r?\n/);
  const header = lines[0];
  const day = header.slice(23, 31);
  if (!header.startsWith('00COTAHIST') || !/^\d{8}$/.test(day)) {
    throw new SourceFileError(
      'The COTAHIST file has no 00COTAHIST header with the trading day',
    );
  }
  // A truncated file would silently drop the FIIs of its missing part.
  if (!lines.some((line) => line.startsWith('99COTAHIST'))) {
    throw new SourceFileError(
      'The COTAHIST file has no 99COTAHIST trailer: it is truncated',
    );
  }
  const fiiTickers = new Set<string>();
  for (const line of lines) {
    if (
      line.startsWith('01') &&
      line.slice(10, 12) === FII_BDI &&
      line.slice(24, 27) === CASH_MARKET
    ) {
      fiiTickers.add(line.slice(12, 24).trim());
    }
  }
  return {
    date: `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`,
    fiiTickers,
  };
}

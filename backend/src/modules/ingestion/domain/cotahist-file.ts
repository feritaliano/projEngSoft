import { Decimal } from '../../../shared/domain/decimal';
import { SourceFileError } from './instruments-file';

/** CODBDI of the FIIs in the COTAHIST (layout SeriesHistoricas_Layout.pdf; fontes-poc 3.1). */
const FII_BDI = '12';
const CASH_MARKET = '010';
const HEADER = '00COTAHIST';
const TRAILER = '99COTAHIST';
/** A type 01 record has 245 characters; the last field read (CODISI) ends at 242. */
const MIN_QUOTE_LENGTH = 242;

/** AAAAMMDD → YYYY-MM-DD. */
function isoDay(day: string): string {
  return `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`;
}

/** CODNEG of a type 01 record (positions 13–24). */
function tickerOf(line: string): string {
  return line.slice(12, 24).trim();
}

export interface CotahistFiis {
  /** Trading day of the file (header, positions 24–31), YYYY-MM-DD. */
  readonly date: string;
  readonly fiiTickers: ReadonlySet<string>;
}

/**
 * The day in the header of a COTAHIST (positions 24–31), YYYY-MM-DD: the trading day of a daily file, the generation
 * day of an annual one.
 */
export function cotahistHeaderDate(header: string): string {
  const day = header.slice(23, 31);
  if (!header.startsWith(HEADER) || !/^\d{8}$/.test(day)) {
    throw new SourceFileError(
      'The COTAHIST file has no 00COTAHIST header with the trading day',
    );
  }
  return isoDay(day);
}

export function isCotahistTrailer(line: string): boolean {
  return line.startsWith(TRAILER);
}

/**
 * Reads, from a daily COTAHIST, only the tickers traded as FII in the cash market: the Cadastro de Instrumentos does not
 * tell a FII from other funds (F7). Fixed-width records; type 01 is a quote.
 */
export function parseCotahistFiis(text: string): CotahistFiis {
  const lines = text.split(/\r?\n/);
  const date = cotahistHeaderDate(lines[0]);
  // A truncated file would silently drop the FIIs of its missing part.
  if (!lines.some(isCotahistTrailer)) {
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
      fiiTickers.add(tickerOf(line));
    }
  }
  return { date, fiiTickers };
}

/** A quote of the cash market as the COTAHIST publishes it, prices already divided by the quotation factor. */
export interface CotahistQuote {
  readonly ticker: string;
  readonly isin: string;
  /** YYYY-MM-DD. */
  readonly date: string;
  readonly open: string;
  readonly high: string;
  readonly low: string;
  readonly close: string;
  readonly volume: string;
  readonly tradesCount: number;
}

/** Digits of a field at 1-based inclusive positions of the layout. */
function digits(line: string, start: number, end: number): string {
  const value = line.slice(start - 1, end);
  if (!/^\d+$/.test(value)) {
    throw new SourceFileError(
      `The COTAHIST record of ${tickerOf(line) || '?'} has "${value}" at positions ${start}–${end}, not digits`,
    );
  }
  return value;
}

/**
 * Reads a type 01 record of the cash market (TPMERC 010); null for any other line (header, trailer, odd lot, options,
 * forward). Prices are V99 (2 implied decimals) divided by FATCOT (fontes-poc 2.1); volume is V99. A record with a field
 * that is not digits means a corrupt file: it throws.
 */
export function parseCotahistQuote(line: string): CotahistQuote | null {
  if (!line.startsWith('01') || line.slice(24, 27) !== CASH_MARKET) {
    return null;
  }
  if (line.length < MIN_QUOTE_LENGTH) {
    throw new SourceFileError(
      `The COTAHIST record of ${tickerOf(line)} has ${line.length} characters: it is cut`,
    );
  }
  const factor = new Decimal(digits(line, 211, 217));
  const price = (start: number, end: number) =>
    new Decimal(digits(line, start, end)).div(100).div(factor).toFixed();
  return {
    ticker: tickerOf(line),
    isin: line.slice(230, 242),
    date: isoDay(digits(line, 3, 10)),
    open: price(57, 69),
    high: price(70, 82),
    low: price(83, 95),
    close: price(109, 121),
    volume: new Decimal(digits(line, 171, 188)).div(100).toFixed(),
    tradesCount: Number(digits(line, 148, 152)),
  };
}

/**
 * Why a quote cannot be stored (the CHECKs of quotes: prices > 0, open and close within low and high), or null. A
 * factor of zero would make every price infinite; it is caught here too.
 */
export function quoteProblem(quote: CotahistQuote): string | null {
  const [open, high, low, close] = [
    quote.open,
    quote.high,
    quote.low,
    quote.close,
  ].map((value) => new Decimal(value));
  if (![open, high, low, close].every((p) => p.isFinite() && p.gt(0))) {
    return 'price not positive';
  }
  const within = (p: Decimal) => p.gte(low) && p.lte(high);
  return within(open) && within(close) ? null : 'price outside low–high';
}

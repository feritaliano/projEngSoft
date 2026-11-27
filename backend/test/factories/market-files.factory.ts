import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const FIXTURES = resolve(__dirname, '..', 'fixtures');

/**
 * Reduced excerpts of real files of the K6 sources (fixtures versioned like the K5 ones).
 * - COTAHIST of 25/11/2026 (bvmf.bmfbovespa.com.br, COTAHIST_D25112026.ZIP): header; cash-market quotes of PETR4 (02),
 *   KNRI11 (FII, 12), BOVA11 (ETF, 14), AAPL34 (BDR, 34), MGLU3 (not in the seed) and IBOV11 (FATCOT 100); PETR4F (odd
 *   lot, 020) and ABEVH169 (option, 070), which are not the cash market; trailer. The .ZIP holds the same TXT.
 * - IBOV 2026 (B3 index page, Download button): title, header, days 23 to 26 and the two footer rows (F6).
 * - SGS 12 (CDI, 23–26/11/2026) and SGS 433 (IPCA, 08–10/2026), as the BCB API answers.
 */
export const COTAHIST_DAILY_TXT = resolve(
  FIXTURES,
  'COTAHIST_D25112026.sample.TXT',
);
export const COTAHIST_DAILY_ZIP = resolve(
  FIXTURES,
  'COTAHIST_D25112026.sample.ZIP',
);
export const IBOV_CSV = resolve(FIXTURES, 'IBOV_2026.sample.csv');
export const CDI_JSON = resolve(FIXTURES, 'sgs12_CDI.sample.json');
export const IPCA_JSON = resolve(FIXTURES, 'sgs433_IPCA.sample.json');

export const COTAHIST_LINES = readFileSync(COTAHIST_DAILY_TXT, 'latin1')
  .split('\n')
  .filter((line) => line !== '');
export const IBOV_TEXT = new TextDecoder('latin1').decode(
  readFileSync(IBOV_CSV),
);
export const CDI_TEXT = readFileSync(CDI_JSON, 'utf8');
export const IPCA_TEXT = readFileSync(IPCA_JSON, 'utf8');

/** The line of a ticker in the COTAHIST excerpt. */
export function cotahistLine(ticker: string): string {
  const line = COTAHIST_LINES.find(
    (l) => l.startsWith('01') && l.slice(12, 24).trim() === ticker,
  );
  if (!line) throw new Error(`${ticker} is not in the COTAHIST excerpt`);
  return line;
}

/** Async iterable of lines, as RawFiles.lines gives them. */
export async function* linesOf(
  lines: readonly string[],
): AsyncIterable<string> {
  for (const line of lines) {
    await Promise.resolve();
    yield line;
  }
}

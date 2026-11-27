import {
  BDR_PROGRAMS,
  type BdrProgram,
  type CatalogEntry,
} from '../../reference-data/domain/catalog-entry';

/** First line of a complete Cadastro de Instrumentos; a file downloaded the same day may still be "Parcial" (F5). */
export const FINAL_STATUS = 'Status do Arquivo: Final';

const COLUMNS = [
  'RptDt',
  'TckrSymb',
  'SgmtNm',
  'MktNm',
  'SctyCtgyNm',
  'TradgEndDt',
  'ISIN',
  'SpcfctnCd',
  'CrpnNm',
] as const;
type Column = (typeof COLUMNS)[number];

// Same rules as the CHECKs on assets.ticker (B3 classes), assets.isin and the size of issuers.name.
const TICKER = /^[A-Z0-9]{4}[0-9]{1,2}$/;
const ISIN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
const ISSUER_NAME_MAX_LENGTH = 150;
const STOCK_CLASSES = new Set([
  'ON',
  'PN',
  'PNA',
  'PNB',
  'PNC',
  'PND',
  'PNV',
  'PRA',
  'PRB',
]);
/** SHARES rows that are not shares (D64): CEPAC, subscription receipt, perpetual bond and the TAXA* financing rates. */
const NOT_SHARES = new Set(['CPA', 'REC', 'TPR', 'DIA']);
/** TradgEndDt of an instrument still traded. */
const OPEN_ENDED = '9999-12-31';
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class SourceFileError extends Error {
  override readonly name = 'SourceFileError';
}

export interface RejectedLine {
  /** 1-based line of the file. */
  readonly line: number;
  readonly ticker: string;
  readonly reason: string;
}

export interface InstrumentsFile {
  /** RptDt, YYYY-MM-DD. */
  readonly reportDate: string;
  readonly entries: readonly CatalogEntry[];
  readonly rejected: readonly RejectedLine[];
}

type Classification = Pick<
  CatalogEntry,
  'type' | 'shareClass' | 'bdrProgram' | 'issuerKind'
>;

function isBdrProgram(value: string): value is BdrProgram {
  return (BDR_PROGRAMS as readonly string[]).includes(value);
}

/**
 * The catalog classes of the cash market (D59, fontes-poc 2.2): a classification, null when the instrument is outside
 * the catalog, or the reason it cannot be stored.
 */
function classify(
  category: string,
  specification: string,
  ticker: string,
  fiiTickers: ReadonlySet<string>,
): Classification | string | null {
  switch (category) {
    case 'SHARES': {
      // "*" after the class (PNA*) means quoted per thousand shares, the same class
      // (B3 "Empresas listadas" legend; fontes-poc.md, section 7.3).
      const shareClass = specification.replace(/\*$/, '');
      if (NOT_SHARES.has(shareClass)) return null;
      return STOCK_CLASSES.has(shareClass)
        ? {
            type: 'STOCK',
            shareClass: shareClass as Classification['shareClass'],
            bdrProgram: null,
            issuerKind: 'COMPANY',
          }
        : `share class ${specification} is not in share_class`;
    }
    case 'UNIT':
      return {
        type: 'STOCK',
        shareClass: 'UNIT',
        bdrProgram: null,
        issuerKind: 'COMPANY',
      };
    case 'ETF EQUITIES':
    case 'ETF FOREIGN INDEX':
      return {
        type: 'ETF',
        shareClass: null,
        bdrProgram: null,
        issuerKind: 'FUND',
      };
    case 'BDR':
      return isBdrProgram(specification)
        ? {
            type: 'BDR',
            shareClass: null,
            bdrProgram: specification,
            issuerKind: 'FOREIGN',
          }
        : `BDR program ${specification} is not in bdr_program`;
    case 'FUNDS':
      // FUNDS mixes FIIs with FIAGRO, FIDC, FIP and FI-Infra; a FII is one traded as such in the COTAHIST (F7).
      // shortcut: a FII without trades on the file's day is left out; upgrade with the CVM FII registry in S2.
      return fiiTickers.has(ticker)
        ? {
            type: 'FII',
            shareClass: null,
            bdrProgram: null,
            issuerKind: 'FUND',
          }
        : null;
    default:
      // Indexes, subscription receipts, rights and warrants.
      return null;
  }
}

/**
 * Parses the B3 Cadastro de Instrumentos (InstrumentsConsolidatedFile, already decoded from Latin-1, F9) into the
 * catalog entries of the cash market, standard lot only (no odd lot, options, forwards or futures). A malformed line
 * is rejected with its reason and the others go on; a file that is not "Final" is refused whole (F5).
 */
export function parseInstrumentsFile(
  text: string,
  fiiTickers: ReadonlySet<string>,
): InstrumentsFile {
  const lines = text.split(/\r?\n/);
  if (lines[0].trim() !== FINAL_STATUS) {
    throw new SourceFileError(
      `The Cadastro de Instrumentos starts with "${lines[0].trim()}", not "${FINAL_STATUS}": a partial file is never loaded (F5). Download the file again after B3 publishes the final one.`,
    );
  }
  const header = (lines[1] ?? '').split(';');
  const missing = COLUMNS.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    throw new SourceFileError(
      `The Cadastro de Instrumentos has no column ${missing.join(', ')}`,
    );
  }

  let reportDate = '';
  const entries: CatalogEntry[] = [];
  const rejected: RejectedLine[] = [];
  const seenTickers = new Set<string>();
  const seenIsins = new Set<string>();
  for (let index = 2; index < lines.length; index++) {
    if (lines[index] === '') continue;
    const fields = lines[index].split(';');
    const field = (column: Column) =>
      (fields[header.indexOf(column)] ?? '').trim();
    const reject = (reason: string) =>
      rejected.push({ line: index + 1, ticker: field('TckrSymb'), reason });
    if (fields.length !== header.length) {
      reject(`has ${fields.length} fields, expected ${header.length}`);
      continue;
    }
    reportDate ||= field('RptDt');
    if (field('MktNm') !== 'EQUITY-CASH' || field('SgmtNm') !== 'CASH') {
      continue;
    }
    const ticker = field('TckrSymb');
    const classification = classify(
      field('SctyCtgyNm'),
      field('SpcfctnCd').split(/\s+/)[0],
      ticker,
      fiiTickers,
    );
    if (classification === null) continue;
    if (typeof classification === 'string') {
      reject(classification);
      continue;
    }
    const isin = field('ISIN');
    const issuerName = field('CrpnNm');
    if (!TICKER.test(ticker)) {
      reject('ticker is not in the B3 format');
    } else if (!ISIN.test(isin)) {
      reject('ISIN is malformed');
    } else if (
      issuerName === '' ||
      issuerName.length > ISSUER_NAME_MAX_LENGTH
    ) {
      reject(`issuer name must have 1 to ${ISSUER_NAME_MAX_LENGTH} characters`);
    } else if (!DATE.test(field('TradgEndDt'))) {
      // Read as "not traded", a changed format would deactivate the whole catalog.
      reject('trading end date is not YYYY-MM-DD');
    } else if (seenTickers.has(ticker) || seenIsins.has(isin)) {
      reject('ticker or ISIN repeated in the file');
    } else {
      seenTickers.add(ticker);
      seenIsins.add(isin);
      entries.push({
        ticker,
        isin,
        ...classification,
        isActive: field('TradgEndDt') === OPEN_ENDED,
        issuerName,
      });
    }
  }
  return { reportDate, entries, rejected };
}

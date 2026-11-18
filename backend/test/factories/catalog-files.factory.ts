import { resolve } from 'node:path';
import { readB3File } from '../../src/modules/ingestion/infrastructure/b3-file';

const FIXTURES = resolve(__dirname, '..', 'fixtures');

/**
 * Reduced excerpts of the real B3 files of 30/10/2026 (Latin-1, as published; F9), read the same way as the command.
 * Cadastro de Instrumentos ("Final"): seed assets of every class, non-seed assets (MGLU3, HGBS11), funds that are not
 * FIIs (SNAG11, a FIAGRO; 003H11, a FII without trades that day), an odd-lot row (PETR4F), an option (PETRK1), share
 * classes outside share_class (BCEE5 PNA*, TAXA0L DIA) and, as the last line, RADL3 cut by hand after 7 fields.
 * COTAHIST: header, KNRI11 and HGBS11 (CODBDI 12), PETR4 (02), SNAG11 (14) and trailer.
 */
export const INSTRUMENTS_SAMPLE = readB3File(
  resolve(FIXTURES, 'InstrumentsConsolidatedFile_20261030.sample.csv'),
);
export const COTAHIST_SAMPLE = readB3File(
  resolve(FIXTURES, 'COTAHIST_D30102026.sample.TXT'),
);

const [STATUS_LINE, HEADER_LINE] = INSTRUMENTS_SAMPLE.split('\n');
const HEADER = HEADER_LINE.split(';');

export type InstrumentFields = Partial<
  Record<
    | 'RptDt'
    | 'TckrSymb'
    | 'SgmtNm'
    | 'MktNm'
    | 'SctyCtgyNm'
    | 'TradgEndDt'
    | 'ISIN'
    | 'SpcfctnCd'
    | 'CrpnNm',
    string
  >
>;

/** A line of the Cadastro with every column of the real header; by default a traded ON share of 30/10/2026. */
export function instrumentLine(fields: InstrumentFields): string {
  const values: Record<string, string> = {
    RptDt: '2026-10-30',
    TckrSymb: 'ABCD3',
    SgmtNm: 'CASH',
    MktNm: 'EQUITY-CASH',
    SctyCtgyNm: 'SHARES',
    TradgEndDt: '9999-12-31',
    ISIN: 'BRABCDACNOR1',
    SpcfctnCd: 'ON      NM',
    CrpnNm: 'ABCD S.A.',
    ...fields,
  };
  return HEADER.map((column) => values[column] ?? '').join(';');
}

/** A Cadastro with the real status line and header followed by the given lines. */
export function instrumentsFile(
  lines: string[],
  status: string = STATUS_LINE,
): string {
  return [status, HEADER_LINE, ...lines, ''].join('\n');
}

/** A COTAHIST of the given day (YYYYMMDD) with only the header and the trailer. */
export function cotahistOf(day: string): string {
  return [
    `00COTAHIST.2026BOVESPA ${day}`.padEnd(245),
    `99COTAHIST.2026BOVESPA ${day}00000000002`.padEnd(245),
    '',
  ].join('\n');
}

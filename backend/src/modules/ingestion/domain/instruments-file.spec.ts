import {
  COTAHIST_SAMPLE,
  INSTRUMENTS_SAMPLE,
  instrumentLine,
  instrumentsFile,
} from '../../../../test/factories/catalog-files.factory';
import { parseCotahistFiis } from './cotahist-file';
import { parseInstrumentsFile, SourceFileError } from './instruments-file';

const NO_FII = new Set<string>();
const parse = (lines: string[], fiis: ReadonlySet<string> = NO_FII) =>
  parseInstrumentsFile(instrumentsFile(lines), fiis);

describe('parseInstrumentsFile (K5, D59)', () => {
  it('reads the catalog classes of the real excerpt and leaves out odd lot, options and funds that are not FIIs (F7)', () => {
    const { fiiTickers } = parseCotahistFiis(COTAHIST_SAMPLE);

    const file = parseInstrumentsFile(INSTRUMENTS_SAMPLE, fiiTickers);

    expect(file.reportDate).toBe('2026-10-30');
    expect(
      Object.fromEntries(
        file.entries.map((e) => [
          e.ticker,
          [e.type, e.shareClass ?? e.bdrProgram, e.issuerKind].join(' '),
        ]),
      ),
    ).toEqual({
      PETR3: 'STOCK ON COMPANY',
      PETR4: 'STOCK PN COMPANY',
      VIVT3: 'STOCK ON COMPANY',
      AXIA3: 'STOCK ON COMPANY',
      KLBN11: 'STOCK UNIT COMPANY',
      MGLU3: 'STOCK ON COMPANY',
      KNRI11: 'FII  FUND',
      HGBS11: 'FII  FUND',
      BOVA11: 'ETF  FUND',
      IVVB11: 'ETF  FUND',
      AAPL34: 'BDR DRN FOREIGN',
      AURA33: 'BDR DR3 FOREIGN',
      JBSS32: 'BDR DR2 FOREIGN',
      EVEB31: 'BDR DR1 FOREIGN',
      ACWX39: 'BDR DRE FOREIGN',
    });
  });

  it('decodes Latin-1 names so they equal the seed UTF-8 names (F9)', () => {
    const { fiiTickers } = parseCotahistFiis(COTAHIST_SAMPLE);

    const entries = parseInstrumentsFile(
      INSTRUMENTS_SAMPLE,
      fiiTickers,
    ).entries;
    const issuerOf = (ticker: string) =>
      entries.find((e) => e.ticker === ticker)?.issuerName;

    expect(issuerOf('VIVT3')).toBe('TELEFÔNICA BRASIL S.A');
    expect(issuerOf('KNRI11')).toBe(
      'KINEA RENDA IMOBILIÁRIA FDO INV IMOB RESP LIM',
    );
    expect(issuerOf('BOVA11')).toBe('ISHARES IBOVESPA FUNDO DE ÍNDICE');
    expect(entries.find((e) => e.ticker === 'PETR4')).toEqual({
      ticker: 'PETR4',
      isin: 'BRPETRACNPR6',
      type: 'STOCK',
      shareClass: 'PN',
      bdrProgram: null,
      isActive: true,
      issuerName: 'PETROLEO BRASILEIRO S.A. PETROBRAS',
      issuerKind: 'COMPANY',
    });
  });

  it('rejects the invalid lines of the real excerpt with line and reason, and keeps the others', () => {
    const file = parseInstrumentsFile(INSTRUMENTS_SAMPLE, NO_FII);

    expect(file.rejected).toEqual([
      {
        line: 20,
        ticker: 'BCEE5',
        reason: 'share class PNA* is not in share_class',
      },
      {
        line: 21,
        ticker: 'TAXA0L',
        reason: 'share class DIA is not in share_class',
      },
      { line: 24, ticker: 'RADL3', reason: 'has 7 fields, expected 52' },
    ]);
  });

  it('refuses a partial file whole, with a clear message (F5)', () => {
    const text = instrumentsFile(
      [instrumentLine({})],
      'Status do Arquivo: Parcial',
    );

    expect(() => parseInstrumentsFile(text, NO_FII)).toThrow(
      new SourceFileError(
        'The Cadastro de Instrumentos starts with "Status do Arquivo: Parcial", not "Status do Arquivo: Final": a partial file is never loaded (F5). Download the file again after B3 publishes the final one.',
      ),
    );
  });

  it('refuses a file without the columns it reads', () => {
    expect(() =>
      parseInstrumentsFile('Status do Arquivo: Final\nRptDt;TckrSymb', NO_FII),
    ).toThrow(/has no column SgmtNm, MktNm/);
    expect(() =>
      parseInstrumentsFile('Status do Arquivo: Final', NO_FII),
    ).toThrow(/has no column RptDt/);
  });

  it('rejects malformed ticker, ISIN and issuer name, and a ticker or ISIN repeated in the file', () => {
    const file = parse([
      instrumentLine({ TckrSymb: 'CTBA11B' }),
      instrumentLine({ TckrSymb: 'ABCD4', ISIN: 'BRABCD' }),
      instrumentLine({ TckrSymb: 'ABCD5', ISIN: 'BRABCDACNPA1', CrpnNm: '' }),
      instrumentLine({
        TckrSymb: 'ABCD6',
        ISIN: 'BRABCDACNPB1',
        CrpnNm: 'X'.repeat(151),
      }),
      instrumentLine({}),
      instrumentLine({ ISIN: 'BRABCDACNOR9' }),
      instrumentLine({ TckrSymb: 'ABCD11' }),
      instrumentLine({
        TckrSymb: 'WXYZ34',
        SctyCtgyNm: 'BDR',
        SpcfctnCd: 'DRX',
      }),
      'garbage',
    ]);

    expect(file.entries.map((e) => e.ticker)).toEqual(['ABCD3']);
    expect(file.rejected.map((r) => [r.line, r.ticker, r.reason])).toEqual([
      [3, 'CTBA11B', 'ticker is not in the B3 format'],
      [4, 'ABCD4', 'ISIN is malformed'],
      [5, 'ABCD5', 'issuer name must have 1 to 150 characters'],
      [6, 'ABCD6', 'issuer name must have 1 to 150 characters'],
      [8, 'ABCD3', 'ticker or ISIN repeated in the file'],
      [9, 'ABCD11', 'ticker or ISIN repeated in the file'],
      [10, 'WXYZ34', 'BDR program DRX is not in bdr_program'],
      [11, '', 'has 1 fields, expected 52'],
    ]);
  });

  it('marks an instrument whose trading has an end date as inactive, and reads CRLF files', () => {
    const text = instrumentsFile([
      instrumentLine({ TradgEndDt: '2026-11-30' }),
    ]).replaceAll('\n', '\r\n');

    const file = parseInstrumentsFile(text, NO_FII);

    expect(file.entries.map((e) => [e.ticker, e.isActive])).toEqual([
      ['ABCD3', false],
    ]);
  });

  it('leaves out other cash categories (index, subscription receipt, right, warrant) without rejecting them', () => {
    const file = parse(
      ['INDEX', 'RECEIPTS', 'RIGHTS', 'WARRANT'].map((category) =>
        instrumentLine({ SctyCtgyNm: category }),
      ),
    );

    expect(file).toEqual({
      reportDate: '2026-10-30',
      entries: [],
      rejected: [],
    });
  });

  it('rejects a trading end date that is not a date, instead of deactivating the asset (D59)', () => {
    const file = parse([instrumentLine({ TradgEndDt: '' })]);

    expect(file.entries).toEqual([]);
    expect(file.rejected).toEqual([
      {
        line: 3,
        ticker: 'ABCD3',
        reason: 'trading end date is not YYYY-MM-DD',
      },
    ]);
  });

  it('has no report date when the file has no instrument', () => {
    expect(parse([]).reportDate).toBe('');
  });
});

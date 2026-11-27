import {
  COTAHIST_SAMPLE,
  cotahistOf,
} from '../../../../test/factories/catalog-files.factory';
import {
  COTAHIST_LINES,
  cotahistLine,
} from '../../../../test/factories/market-files.factory';
import {
  cotahistHeaderDate,
  parseCotahistFiis,
  parseCotahistQuote,
  quoteProblem,
} from './cotahist-file';

describe('parseCotahistFiis (K5, F7)', () => {
  it('reads the trading day and only the tickers traded as FII in the cash market', () => {
    const cotahist = parseCotahistFiis(COTAHIST_SAMPLE);

    expect(cotahist.date).toBe('2026-10-30');
    // PETR4 is CODBDI 02 and SNAG11 (FIAGRO) is 14.
    expect([...cotahist.fiiTickers]).toEqual(['KNRI11', 'HGBS11']);
  });

  it('ignores a FII line outside the cash market and reads CRLF files', () => {
    const fiiOnOtherMarket = COTAHIST_SAMPLE.split('\n')[1].replace(
      'KNRI11      010',
      'KNRI11      020',
    );
    const [header, trailer] = cotahistOf('20261030').split('\n');
    const text = [header, fiiOnOtherMarket, trailer].join('\r\n');

    expect(parseCotahistFiis(text)).toEqual({
      date: '2026-10-30',
      fiiTickers: new Set(),
    });
  });

  it('refuses a truncated file, without the 99COTAHIST trailer', () => {
    const truncated = COTAHIST_SAMPLE.split('\n').slice(0, 3).join('\n');

    expect(() => parseCotahistFiis(truncated)).toThrow(
      'The COTAHIST file has no 99COTAHIST trailer: it is truncated',
    );
  });

  it.each([
    ['another file', 'Status do Arquivo: Final\n'],
    ['a header without the day', '00COTAHIST.2026BOVESPA \n'],
  ])('refuses %s', (_case, text) => {
    expect(() => parseCotahistFiis(text)).toThrow(
      'The COTAHIST file has no 00COTAHIST header with the trading day',
    );
  });
});

describe('parseCotahistQuote (K6, fontes-poc 2.1)', () => {
  it('reads a cash-market quote: prices and volume V99, ISIN, trades', () => {
    expect(parseCotahistQuote(cotahistLine('PETR4'))).toEqual({
      ticker: 'PETR4',
      isin: 'BRPETRACNPR6',
      date: '2026-11-25',
      open: '40.7',
      high: '41.51',
      low: '40.41',
      close: '41.36',
      volume: '2643622356',
      tradesCount: 96311,
    });
  });

  it('divides the prices by the quotation factor (FATCOT)', () => {
    const quote = parseCotahistQuote(cotahistLine('IBOV11'));
    expect(quote).toMatchObject({ open: '1667.28', close: '1667.28' });
  });

  it.each([
    ['the header', COTAHIST_LINES[0]],
    ['the trailer', COTAHIST_LINES[COTAHIST_LINES.length - 1]],
    ['an odd-lot quote (TPMERC 020)', cotahistLine('PETR4F')],
    ['an option (TPMERC 070)', cotahistLine('ABEVH169')],
  ])('ignores %s', (_case, line) => {
    expect(parseCotahistQuote(line)).toBeNull();
  });

  it('refuses a quotation factor of zero (every price would be infinite)', () => {
    const line = cotahistLine('PETR4');
    const zero = `${line.slice(0, 210)}0000000${line.slice(217)}`;

    expect(() => parseCotahistQuote(zero)).toThrow(
      'The COTAHIST record of PETR4 has a quotation factor (FATCOT) of zero',
    );
  });

  it('refuses a cut record', () => {
    expect(() =>
      parseCotahistQuote(cotahistLine('PETR4').slice(0, 200)),
    ).toThrow('The COTAHIST record of PETR4 has 200 characters: it is cut');
  });

  it('refuses a field that is not digits', () => {
    const line = cotahistLine('PETR4');
    const broken = `${line.slice(0, 56)}00000000040A0${line.slice(69)}`;
    expect(() => parseCotahistQuote(broken)).toThrow(
      'The COTAHIST record of PETR4 has "00000000040A0" at positions 57–69, not digits',
    );
  });

  it('names an unknown ticker as "?" in the error', () => {
    const line = cotahistLine('PETR4');
    const broken = `${line.slice(0, 12)}${' '.repeat(12)}${line.slice(24, 56)}0000000004X70${line.slice(69)}`;
    expect(() => parseCotahistQuote(broken)).toThrow('record of ? has');
  });
});

describe('quoteProblem (CHECKs of quotes)', () => {
  const quote = parseCotahistQuote(cotahistLine('PETR4'))!;

  it('accepts open and close within low and high', () => {
    expect(quoteProblem(quote)).toBeNull();
  });

  it.each([
    [{ low: '0' }, 'price not positive'],
    [{ open: '42' }, 'price outside low–high'],
    [{ close: '40' }, 'price outside low–high'],
  ])('refuses %o', (change, problem) => {
    expect(quoteProblem({ ...quote, ...change })).toBe(problem);
  });
});

describe('cotahistHeaderDate', () => {
  it('reads the day of the header', () => {
    expect(cotahistHeaderDate(COTAHIST_LINES[0])).toBe('2026-11-25');
  });
});

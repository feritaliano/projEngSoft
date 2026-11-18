import {
  COTAHIST_SAMPLE,
  cotahistOf,
} from '../../../../test/factories/catalog-files.factory';
import { parseCotahistFiis } from './cotahist-file';

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

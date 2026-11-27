import {
  CDI_TEXT,
  IPCA_TEXT,
} from '../../../../test/factories/market-files.factory';
import { parseSgsSeries } from './sgs-series';

describe('parseSgsSeries (BCB SGS, K6)', () => {
  it('reads the CDI excerpt (SGS 12, % a day)', () => {
    expect(parseSgsSeries(CDI_TEXT)).toEqual([
      { date: '2026-11-23', value: '0.050788' },
      { date: '2026-11-24', value: '0.050788' },
      { date: '2026-11-25', value: '0.050788' },
      { date: '2026-11-26', value: '0.050788' },
    ]);
  });

  it('reads the IPCA excerpt (SGS 433, % a month, negative month kept)', () => {
    expect(parseSgsSeries(IPCA_TEXT)).toEqual([
      { date: '2026-08-01', value: '-0.32' },
      { date: '2026-09-01', value: '0.82' },
      { date: '2026-10-01', value: '0.14' },
    ]);
  });

  it.each([
    ['not JSON', '<html>', 'The SGS response is not JSON'],
    ['not a list', '{"erro":{}}', 'The SGS response is not a list of values'],
  ])('refuses a response %s', (_case, text, message) => {
    expect(() => parseSgsSeries(text)).toThrow(message);
  });

  it.each([
    ['a date that does not exist', '[{"data":"31/02/2026","valor":"0.1"}]'],
    ['an ISO date', '[{"data":"2026-11-02","valor":"0.1"}]'],
    ['a number value', '[{"data":"02/11/2026","valor":0.1}]'],
    ['a decimal comma', '[{"data":"02/11/2026","valor":"0,1"}]'],
    ['a null item', '[null]'],
  ])('refuses %s', (_case, text) => {
    expect(() => parseSgsSeries(text)).toThrow(/The SGS value 1 is not/);
  });
});

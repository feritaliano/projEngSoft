import { IBOV_TEXT } from '../../../../test/factories/market-files.factory';
import { parseIbovYear } from './ibov-file';

describe('parseIbovYear (B3 index page, K6)', () => {
  it('reads the closings by date, skipping empty cells and the footer (F6)', () => {
    const ibov = parseIbovYear(IBOV_TEXT);

    expect(ibov.year).toBe(2026);
    // 4 day rows × 12 months, minus empty cells (weekends, holidays, December not yet traded).
    expect(ibov.points).toHaveLength(32);
    expect(ibov.points.slice(-4)).toEqual([
      { date: '2026-11-23', value: '164796.05' },
      { date: '2026-11-24', value: '164089.81' },
      { date: '2026-11-25', value: '166684.61' },
      { date: '2026-11-26', value: '176799.84' },
    ]);
    expect(ibov.points[0]).toEqual({ date: '2026-01-23', value: '178858.54' });
  });

  it('reads a row with fewer cells than months', () => {
    const [title, header] = IBOV_TEXT.split(/\r?\n/);

    expect(parseIbovYear([title, header, '24;;190.745,02'].join('\n'))).toEqual(
      {
        year: 2026,
        points: [{ date: '2026-02-24', value: '190745.02' }],
      },
    );
  });

  it('refuses another file', () => {
    expect(() => parseIbovYear('Status do Arquivo: Final\n')).toThrow(
      'The IBOV file has no "IBOV - <year>" title',
    );
  });

  it.each([
    ['another header', 'IBOV - 2026\nDia;Jan\n'],
    ['no header', 'IBOV - 2026'],
  ])('refuses a file with %s', (_case, text) => {
    expect(() => parseIbovYear(text)).toThrow(
      'The IBOV file has no "Dia;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez" header',
    );
  });

  it.each([
    ['a cell that is not a closing value', '23;178858.54'],
    ['a date that does not exist', '30;;100.000,00'],
  ])('refuses %s', (_case, row) => {
    const [title, header] = IBOV_TEXT.split(/\r?\n/);
    expect(() => parseIbovYear([title, header, row].join('\n'))).toThrow(
      /^The IBOV file has ".*" on day \d+ of month \d+/,
    );
  });
});

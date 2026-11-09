import { InvalidValueError } from '../../../shared/domain/domain-error';
import {
  parsePortfolioId,
  PORTFOLIO_NAME_MAX_LENGTH,
  PortfolioName,
} from './portfolio';

describe('PortfolioName (RN02)', () => {
  it('trims the name', () => {
    expect(PortfolioName.of('  Longo prazo  ').toString()).toBe('Longo prazo');
    expect(JSON.stringify({ name: PortfolioName.of(' Renda ') })).toBe(
      '{"name":"Renda"}',
    );
  });

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['longer than the column', 'a'.repeat(PORTFOLIO_NAME_MAX_LENGTH + 1)],
  ])('rejects a %s name with the field "name"', (_case, value) => {
    expect(() => PortfolioName.of(value)).toThrow(
      new InvalidValueError('name', 'must have between 1 and 150 characters'),
    );
  });

  it.each([
    ['NUL', 'a\u0000b'],
    ['a line break', 'Longo\nprazo'],
    ['DEL', 'a\u007f'],
  ])(
    'rejects a name with %s (control characters; PostgreSQL rejects NUL)',
    (_case, value) => {
      expect(() => PortfolioName.of(value)).toThrow(
        new InvalidValueError('name', 'must not contain control characters'),
      );
    },
  );

  it('counts characters, not UTF-16 units: 150 emoji fit the VARCHAR(150)', () => {
    expect(PortfolioName.of('💰'.repeat(150)).toString()).toHaveLength(300);
  });
});

describe('parsePortfolioId (RN02)', () => {
  it.each([
    ['3f1c2b9e-8d4a-4c6f-9b1e-2a7d5c8e0f13', true],
    ['3F1C2B9E-8D4A-4C6F-9B1E-2A7D5C8E0F13', true],
    ['abc', false],
    ['3f1c2b9e-8d4a-4c6f-9b1e-2a7d5c8e0f13x', false],
  ])('%s → %s', (value, expected) => {
    expect(parsePortfolioId(value) === value).toBe(expected);
  });
});

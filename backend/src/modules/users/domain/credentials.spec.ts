import { InvalidValueError } from '../../../shared/domain/domain-error';
import { PersonName, PlainPassword } from './credentials';
import { Email } from './email';

describe('Email (RN01)', () => {
  it('keeps the address as typed, trimmed', () => {
    expect(Email.of('  Ana.Souza@Example.com ').toString()).toBe(
      'Ana.Souza@Example.com',
    );
  });

  it('compares ignoring case, like the citext column', () => {
    expect(
      Email.of('ANA@example.com').equals(Email.of('ana@EXAMPLE.com')),
    ).toBe(true);
    expect(
      Email.of('ana@example.com').equals(Email.of('bia@example.com')),
    ).toBe(false);
  });

  it.each([
    '',
    'ana',
    'ana@',
    '@example.com',
    'ana@example',
    'a na@example.com',
    `${'a'.repeat(250)}@x.com`,
  ])('rejects %j', (value) => {
    expect(() => Email.of(value)).toThrow(
      new InvalidValueError('email', 'must be a valid e-mail address'),
    );
  });

  it('serializes as the address', () => {
    expect(JSON.stringify(Email.of('ana@example.com'))).toBe(
      '"ana@example.com"',
    );
  });
});

describe('PlainPassword (RN01)', () => {
  it('accepts 8 characters or more, counting characters, not bytes', () => {
    expect(PlainPassword.of('12345678').reveal()).toBe('12345678');
    expect(PlainPassword.of('çãõéíóú€').reveal()).toBe('çãõéíóú€');
  });

  it('rejects fewer than 8 characters (RN01)', () => {
    expect(() => PlainPassword.of('1234567')).toThrow(
      new InvalidValueError('password', 'must have at least 8 characters'),
    );
  });

  it('rejects more than 128 characters', () => {
    expect(() => PlainPassword.of('x'.repeat(129))).toThrow(
      'password must have at most 128 characters',
    );
  });

  it('never shows the secret when logged or serialized', () => {
    const password = PlainPassword.of('super-secret-1');

    expect(String(password)).toBe('[redacted]');
    expect(JSON.stringify({ password })).toBe('{"password":"[redacted]"}');
  });
});

describe('PersonName (RN01)', () => {
  it('trims the name', () => {
    expect(PersonName.of('  Ana Souza ').toString()).toBe('Ana Souza');
    expect(JSON.stringify(PersonName.of('Ana'))).toBe('"Ana"');
  });

  it.each(['', '   ', 'x'.repeat(151)])('rejects %j', (value) => {
    expect(() => PersonName.of(value)).toThrow(
      new InvalidValueError('name', 'must have between 1 and 150 characters'),
    );
  });
});

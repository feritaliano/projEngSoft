import { BUSINESS_TIME_ZONE, Clock } from './clock';
import { isUuid } from './uuid';

class FixedClock extends Clock {
  constructor(private readonly instant: Date) {
    super();
  }

  now(): Date {
    return this.instant;
  }
}

describe('Clock', () => {
  it('gives today in São Paulo whatever the server time zone (D54)', () => {
    expect(BUSINESS_TIME_ZONE).toBe('America/Sao_Paulo');
    // 23:30 in São Paulo on 9 Nov is already 10 Nov in UTC.
    const clock = new FixedClock(new Date('2026-11-10T02:30:00Z'));

    expect(clock.today().toString()).toBe('2026-11-09');
  });
});

describe('isUuid', () => {
  it.each([
    ['3f1c2b9e-8d4a-4c6f-9b1e-2a7d5c8e0f13', true],
    ['3F1C2B9E-8D4A-4C6F-9B1E-2A7D5C8E0F13', true],
    ['3f1c2b9e8d4a4c6f9b1e2a7d5c8e0f13', false],
    ['not-a-uuid', false],
    ['', false],
  ])('%j is a uuid: %s', (value, expected) => {
    expect(isUuid(value)).toBe(expected);
  });
});

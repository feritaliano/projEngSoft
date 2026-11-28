import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  IndexValueReader,
  LatestCloseDate,
  QuoteReader,
} from '../src/modules/market-data/domain/market-data';
import { LocalDate } from '../src/shared/domain/local-date';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import { createIssuer, createListedAsset } from './factories/catalog.factory';
import { createApiApp } from './utils/api-app';
import { truncateAllTables } from './utils/database';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

// Integration of the market-data read ports (K7) against PostgreSQL (D40): dates as YYYY-MM-DD and decimals in plain
// notation, whatever the NUMERIC scale.
describe('Market-data readers (integration, K7)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let petr4: string;
  let vale3: string;
  let unquoted: string;

  beforeAll(async () => {
    app = await createApiApp();
    prisma = app.get(PrismaService);
    await truncateAllTables(prisma);
    const issuer = await createIssuer(prisma);
    [petr4, vale3, unquoted] = await Promise.all(
      ['PETR4', 'VALE3', 'ITSA4'].map(
        async (ticker) =>
          (await createListedAsset(prisma, { ticker, issuerId: issuer.id })).id,
      ),
    );
    const quote = (assetId: string, date: string, close: string) => ({
      assetId,
      quoteDate: day(date),
      open: close,
      high: close,
      low: close,
      close,
      volume: '1',
      tradesCount: 1,
    });
    await prisma.quote.createMany({
      data: [
        quote(petr4, '2026-11-10', '44.10'),
        quote(petr4, '2026-11-12', '44.7'),
        quote(petr4, '2026-11-11', '43.55'),
        quote(vale3, '2026-11-12', '0.000001'),
      ],
    });
    const cdi = await prisma.economicIndex.create({
      data: {
        code: 'CDI',
        name: 'CDI',
        periodicity: 'DAILY',
        unit: 'RATE_PERCENT',
        source: 'BCB',
      },
    });
    await prisma.indexValue.createMany({
      data: [
        {
          economicIndexId: cdi.id,
          referenceDate: day('2026-11-11'),
          value: '0.000001',
        },
        {
          economicIndexId: cdi.id,
          referenceDate: day('2026-11-10'),
          value: '0.055131',
        },
        {
          economicIndexId: cdi.id,
          referenceDate: day('2026-11-12'),
          value: '0.055131',
        },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('reads the closes up to a date by asset, oldest first, without exponents, leaving out an asset without quote', async () => {
    const closes = await app
      .get(QuoteReader)
      .closesUntil(
        [petr4, petr4, vale3, unquoted],
        LocalDate.parse('2026-11-11'),
      );

    expect([...closes.entries()]).toEqual([
      [
        petr4,
        [
          { date: '2026-11-10', close: '44.1' },
          { date: '2026-11-11', close: '43.55' },
        ],
      ],
    ]);
    const all = await app
      .get(QuoteReader)
      .closesUntil([vale3], LocalDate.parse('2026-11-12'));
    expect(all.get(vale3)).toEqual([{ date: '2026-11-12', close: '0.000001' }]);
    expect(
      (
        await app
          .get(QuoteReader)
          .closesUntil([], LocalDate.parse('2026-11-12'))
      ).size,
    ).toBe(0);
  });

  it('reads the index values up to a date, oldest first, in plain notation', async () => {
    await expect(
      app
        .get(IndexValueReader)
        .valuesUntil('CDI', LocalDate.parse('2026-11-11')),
    ).resolves.toEqual([
      { date: '2026-11-10', value: '0.055131' },
      { date: '2026-11-11', value: '0.000001' },
    ]);
    await expect(
      app
        .get(IndexValueReader)
        .valuesUntil('IPCA', LocalDate.parse('2026-11-12')),
    ).resolves.toEqual([]);
  });

  it('finds the last trading day and the one before a date', async () => {
    const latest = app.get(LatestCloseDate);

    expect(String(await latest.get())).toBe('2026-11-12');
    expect(String(await latest.before(LocalDate.parse('2026-11-12')))).toBe(
      '2026-11-11',
    );
    expect(await latest.before(LocalDate.parse('2026-11-10'))).toBeNull();
  });
});

import type { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';

/**
 * Builders of reference data for the integration and E2E suites (D40): each test creates what it needs, without the
 * seed. Values respect the CHECK constraints of assets (ticker and ISIN per class, issuer, BDR program; D50).
 */

let counter = 0;
const nextId = () => (++counter).toString().padStart(4, '0');

export async function createSector(
  prisma: PrismaService,
  name = `Setor ${nextId()}`,
) {
  return prisma.sector.create({ data: { name } });
}

export async function createIssuer(
  prisma: PrismaService,
  data: {
    name?: string;
    kind?: 'COMPANY' | 'FUND' | 'FOREIGN' | 'GOVERNMENT';
    sectorId?: string;
  } = {},
) {
  return prisma.issuer.create({
    data: {
      name: data.name ?? `Emissor ${nextId()}`,
      kind: data.kind ?? 'COMPANY',
      sectorId: data.sectorId,
    },
  });
}

/** A valid ISIN shape (BR + 9 alphanumerics + digit) derived from the ticker, unique per ticker. */
function isinFor(ticker: string): string {
  return `BR${`${ticker}XXXXXXXXX`.slice(0, 9)}0`;
}

/** Stock, FII, ETF or BDR: B3 ticker and ISIN required; a BDR also needs its program. */
export async function createListedAsset(
  prisma: PrismaService,
  data: {
    ticker: string;
    issuerId: string;
    type?: 'STOCK' | 'FII' | 'ETF' | 'BDR';
    isActive?: boolean;
  },
) {
  const type = data.type ?? 'STOCK';
  return prisma.asset.create({
    data: {
      ticker: data.ticker,
      isin: isinFor(data.ticker),
      type,
      issuerId: data.issuerId,
      bdrProgram: type === 'BDR' ? 'DR3' : null,
      isActive: data.isActive ?? true,
    },
  });
}

/** Crypto: symbol as ticker, no issuer, no ISIN, a crypto_assets row with the name. */
export async function createCryptoAsset(
  prisma: PrismaService,
  data: { ticker: string; name: string },
) {
  return prisma.asset.create({
    data: {
      ticker: data.ticker,
      type: 'CRYPTO',
      cryptoAsset: { create: { name: data.name } },
    },
  });
}

/** Fixed income: no ticker, issued by the government, a bond with type and maturity (YYYY-MM-DD). */
export async function createFixedIncomeAsset(
  prisma: PrismaService,
  data: { issuerId: string; typeName: string; maturityDate: string },
) {
  const type = await prisma.fixedIncomeType.upsert({
    where: { name: data.typeName },
    update: {},
    create: { name: data.typeName, semiannualInterest: false },
  });
  return prisma.asset.create({
    data: {
      type: 'FIXED_INCOME',
      issuerId: data.issuerId,
      fixedIncomeBond: {
        create: {
          fixedIncomeTypeId: type.id,
          maturityDate: new Date(data.maturityDate),
        },
      },
    },
  });
}

export async function createBroker(
  prisma: PrismaService,
  data: { name?: string; cnpj?: string | null } = {},
) {
  return prisma.broker.create({
    data: {
      name: data.name ?? `Corretora ${nextId()}`,
      cnpj: data.cnpj ?? null,
    },
  });
}

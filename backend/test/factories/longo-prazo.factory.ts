import type { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import {
  createBroker,
  createIssuer,
  createListedAsset,
} from './catalog.factory';

/**
 * Massa de dados do handoff (claude/handoff-ux.md, "Notas de implementação"; frame 6): carteira "Longo prazo" with 9
 * operations, in order of entry. Expected (frame 4): PETR4 100 at PM R$ 32,03 (cost R$ 3.203,27; realized
 * + R$ 293,47), ITSA4 300 at R$ 9,87, BOVA11 20 at R$ 118,45, MXRF11 150 at R$ 10,12 (− R$ 12,40), WEGE3 closed
 * (+ R$ 412,80); total cost R$ 10.051,27; realized + R$ 693,87.
 */
export const LONGO_PRAZO_OPERATIONS = [
  {
    ticker: 'WEGE3',
    broker: 'XP Investimentos',
    type: 'BUY',
    tradeDate: '2026-01-05',
    quantity: '40',
    unitPrice: '36.00',
    fees: '4.90',
  },
  {
    ticker: 'PETR4',
    broker: 'XP Investimentos',
    type: 'BUY',
    tradeDate: '2026-01-05',
    quantity: '100',
    unitPrice: '29.95',
    fees: '5.00',
  },
  {
    ticker: 'MXRF11',
    broker: 'NuInvest',
    type: 'BUY',
    tradeDate: '2026-01-08',
    quantity: '200',
    unitPrice: '10.10',
    fees: '4.00',
  },
  {
    ticker: 'ITSA4',
    broker: 'Rico',
    type: 'BUY',
    tradeDate: '2026-01-20',
    quantity: '300',
    unitPrice: '9.85',
    fees: '6.00',
  },
  {
    ticker: 'WEGE3',
    broker: 'XP Investimentos',
    type: 'SELL',
    tradeDate: '2026-02-10',
    quantity: '40',
    unitPrice: '46.55',
    fees: '4.30',
  },
  {
    ticker: 'PETR4',
    broker: 'XP Investimentos',
    type: 'BUY',
    tradeDate: '2026-03-14',
    quantity: '50',
    unitPrice: '36.00',
    fees: '4.90',
  },
  {
    ticker: 'MXRF11',
    broker: 'NuInvest',
    type: 'SELL',
    tradeDate: '2026-05-22',
    quantity: '50',
    unitPrice: '9.88',
    fees: '0.40',
  },
  {
    ticker: 'PETR4',
    broker: 'XP Investimentos',
    type: 'SELL',
    tradeDate: '2026-06-02',
    quantity: '50',
    unitPrice: '38.00',
    fees: '4.90',
  },
  {
    ticker: 'BOVA11',
    broker: 'Rico',
    type: 'BUY',
    tradeDate: '2026-10-28',
    quantity: '20',
    unitPrice: '118.30',
    fees: '3.00',
  },
] as const;

export type LongoPrazoCatalog = {
  assets: Record<string, string>;
  brokers: Record<string, string>;
};

/** The assets and brokers of the massa (ids by ticker and by broker name). */
export async function createLongoPrazoCatalog(
  prisma: PrismaService,
): Promise<LongoPrazoCatalog> {
  const company = await createIssuer(prisma);
  const fund = await createIssuer(prisma, { kind: 'FUND' });
  const listed: [string, 'STOCK' | 'FII' | 'ETF'][] = [
    ['PETR4', 'STOCK'],
    ['ITSA4', 'STOCK'],
    ['WEGE3', 'STOCK'],
    ['MXRF11', 'FII'],
    ['BOVA11', 'ETF'],
  ];
  const assets: Record<string, string> = {};
  for (const [ticker, type] of listed) {
    const issuerId = type === 'STOCK' ? company.id : fund.id;
    assets[ticker] = (
      await createListedAsset(prisma, { ticker, issuerId, type })
    ).id;
  }
  const brokers: Record<string, string> = {};
  for (const name of ['XP Investimentos', 'NuInvest', 'Rico']) {
    brokers[name] = (await createBroker(prisma, { name })).id;
  }
  return { assets, brokers };
}

/** Body of POST /portfolios/:id/operations for one operation of the massa. */
export function bodyOf(
  catalog: LongoPrazoCatalog,
  operation: (typeof LONGO_PRAZO_OPERATIONS)[number],
) {
  return {
    assetId: catalog.assets[operation.ticker],
    brokerId: catalog.brokers[operation.broker],
    type: operation.type,
    tradeDate: operation.tradeDate,
    quantity: operation.quantity,
    unitPrice: operation.unitPrice,
    fees: operation.fees,
  };
}

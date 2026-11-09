import type { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';

/**
 * Writes an operation straight to the database (D40), for suites that need a portfolio with history before the
 * operations endpoints exist (K4). Decimals as strings (RN11); the date as YYYY-MM-DD.
 */
export async function createOperation(
  prisma: PrismaService,
  data: {
    portfolioId: string;
    assetId: string;
    brokerId: string;
    type: 'BUY' | 'SELL';
    tradeDate: string;
    quantity: string;
    unitPrice: string;
    fees?: string;
  },
) {
  return prisma.operation.create({
    data: {
      portfolioId: data.portfolioId,
      assetId: data.assetId,
      brokerId: data.brokerId,
      type: data.type,
      tradeDate: new Date(data.tradeDate),
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      fees: data.fees ?? '0',
    },
  });
}

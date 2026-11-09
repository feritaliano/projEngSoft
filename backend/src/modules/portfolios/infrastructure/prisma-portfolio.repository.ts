import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import {
  Portfolio,
  PortfolioId,
  PortfolioName,
  PortfolioNameTakenError,
  PortfolioRepository,
  PortfolioWithOperationCount,
} from '../domain/portfolio';

const WITH_OPERATION_COUNT = {
  id: true,
  name: true,
  _count: { select: { operations: true } },
} as const;

interface PortfolioRow {
  id: string;
  name: string;
  _count: { operations: number };
}

function withOperationCount(row: PortfolioRow): PortfolioWithOperationCount {
  return { id: row.id, name: row.name, operationCount: row._count.operations };
}

/** Unique violation (P2002): the only unique key besides the id is (user_id, name). */
function isNameTaken(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class PrismaPortfolioRepository extends PortfolioRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(userId: string, name: PortfolioName): Promise<Portfolio> {
    try {
      return await this.prisma.portfolio.create({
        data: { userId, name: name.toString() },
        select: { id: true, name: true },
      });
    } catch (error) {
      if (isNameTaken(error)) {
        throw new PortfolioNameTakenError();
      }
      throw error;
    }
  }

  async listOwned(userId: string): Promise<PortfolioWithOperationCount[]> {
    const rows = await this.prisma.portfolio.findMany({
      where: { userId },
      select: WITH_OPERATION_COUNT,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(withOperationCount);
  }

  async findOwned(
    userId: string,
    portfolioId: PortfolioId,
  ): Promise<PortfolioWithOperationCount | null> {
    const row = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
      select: WITH_OPERATION_COUNT,
    });
    return row ? withOperationCount(row) : null;
  }

  // Ownership is part of the WHERE: another user's portfolio is never touched, and the result does not tell it apart
  // from a missing one.
  async deleteOwned(
    userId: string,
    portfolioId: PortfolioId,
  ): Promise<boolean> {
    const { count } = await this.prisma.portfolio.deleteMany({
      where: { id: portfolioId, userId },
    });
    return count === 1;
  }
}

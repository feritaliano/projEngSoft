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

interface PortfolioRow {
  id: string;
  name: string;
  operation_count: number;
  last_trade_date: Date | null;
}

/** Portfolios of a user with the count and last date of their operations, in one query (D41: derived, not columns). */
const SELECT_WITH_ACTIVITY = Prisma.sql`
  SELECT p.id, p.name, count(o.id)::int AS operation_count, max(o.trade_date) AS last_trade_date
  FROM portfolios p
  LEFT JOIN operations o ON o.portfolio_id = p.id`;

function withActivity(row: PortfolioRow): PortfolioWithOperationCount {
  return {
    id: row.id,
    name: row.name,
    operationCount: row.operation_count,
    // trade_date is a DATE: Prisma returns it at UTC midnight.
    lastTradeDate: row.last_trade_date?.toISOString().slice(0, 10) ?? null,
  };
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
    const rows = await this.prisma.$queryRaw<PortfolioRow[]>`
      ${SELECT_WITH_ACTIVITY}
      WHERE p.user_id = ${userId}::uuid
      GROUP BY p.id
      ORDER BY p.created_at ASC, p.id ASC`;
    return rows.map(withActivity);
  }

  async findOwned(
    userId: string,
    portfolioId: PortfolioId,
  ): Promise<PortfolioWithOperationCount | null> {
    const [row] = await this.prisma.$queryRaw<PortfolioRow[]>`
      ${SELECT_WITH_ACTIVITY}
      WHERE p.id = ${portfolioId}::uuid AND p.user_id = ${userId}::uuid
      GROUP BY p.id`;
    return row ? withActivity(row) : null;
  }

  async existsOwned(
    userId: string,
    portfolioId: PortfolioId,
  ): Promise<boolean> {
    const count = await this.prisma.portfolio.count({
      where: { id: portfolioId, userId },
    });
    return count === 1;
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

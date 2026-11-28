import { Injectable } from '@nestjs/common';
import type { MarketDataRef } from '../../market-data/domain/market-data';
import { PortfolioValuation } from '../../operations/application/portfolio-valuation';
import type { DerivedValue } from '../../operations/domain/derived-value';
import { userEquity } from '../../operations/domain/market-position';
import { PortfolioRepository } from '../domain/portfolio';

/** B8: "Patrimônio somado" of the list header, the equity of every portfolio of the user (D64). */
@Injectable()
export class GetPortfolioTotals {
  constructor(
    private readonly portfolios: PortfolioRepository,
    private readonly valuation: PortfolioValuation,
  ) {}

  async execute(
    userId: string,
  ): Promise<{ equity: DerivedValue; marketData: MarketDataRef }> {
    const owned = await this.portfolios.listOwned(userId);
    const { portfolios, marketData, asOf } = await this.valuation.evaluate(
      owned.map((portfolio) => portfolio.id),
    );
    return {
      equity: userEquity(
        owned.map(({ id, name }) => ({
          id,
          name,
          equity: portfolios.get(id)!.totals.equity,
        })),
        asOf,
      ),
      marketData,
    };
  }
}

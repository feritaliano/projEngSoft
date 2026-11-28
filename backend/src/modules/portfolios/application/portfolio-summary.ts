import type { MarketDataRef } from '../../market-data/domain/market-data';
import type { PortfolioValuation } from '../../operations/application/portfolio-valuation';
import type {
  DerivedValue,
  PortfolioReturns,
} from '../../operations/domain/derived-value';
import { PortfolioWithOperationCount } from '../domain/portfolio';

/**
 * A portfolio as the list and the detail show it: operations and open positions, both derived (D4, D41), and from K7
 * its equity and returns (B8, B10; D64). A portfolio just created has no market numbers yet.
 */
export interface PortfolioSummary {
  readonly id: string;
  readonly name: string;
  readonly operationCount: number;
  readonly lastTradeDate: string | null;
  readonly assetCount: number;
  readonly equity?: DerivedValue;
  readonly marketData?: MarketDataRef;
  readonly returns?: PortfolioReturns;
}

export async function summarize(
  portfolios: readonly PortfolioWithOperationCount[],
  valuation: PortfolioValuation,
): Promise<PortfolioSummary[]> {
  const { portfolios: values, marketData } = await valuation.evaluate(
    portfolios.map((portfolio) => portfolio.id),
    { history: true },
  );
  return portfolios.map(({ id, name, operationCount, lastTradeDate }) => {
    const { totals, history } = values.get(id)!;
    // The cards show the returns without the chart.
    const { series: _chart, ...returns } = history!.performance;
    return {
      id,
      name,
      operationCount,
      lastTradeDate,
      assetCount: totals.assetCount,
      equity: totals.equity,
      marketData,
      returns,
    };
  });
}

import { CountOpenPositions } from '../../operations/application/count-open-positions';
import { PortfolioWithOperationCount } from '../domain/portfolio';

/** A portfolio as the list and the detail show it: operations and open positions, both derived (D4, D41). */
export interface PortfolioSummary {
  readonly id: string;
  readonly name: string;
  readonly operationCount: number;
  readonly assetCount: number;
}

export async function summarize(
  portfolios: readonly PortfolioWithOperationCount[],
  openPositions: CountOpenPositions,
): Promise<PortfolioSummary[]> {
  const assetCounts = await openPositions.byPortfolio(
    portfolios.map((portfolio) => portfolio.id),
  );
  return portfolios.map(({ id, name, operationCount }) => ({
    id,
    name,
    operationCount,
    assetCount: assetCounts.get(id) ?? 0,
  }));
}

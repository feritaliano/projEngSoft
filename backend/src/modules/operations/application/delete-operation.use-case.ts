import { Injectable } from '@nestjs/common';
import { GetOwnedPortfolio } from '../../portfolios/application/get-owned-portfolio.use-case';
import { PortfolioNotFoundError } from '../../portfolios/domain/portfolio';
import { OperationNotFoundError, parseOperationId } from '../domain/operation';
import { OperationStore } from '../domain/operation-store';
import { evaluateChange } from '../domain/timeline-change';
import { OperationDetails, withRejectionDetails } from './operation-details';

/** B4: deletes an operation unless a later sell would exceed the position without it (RN10, e.g. deleting a buy). */
@Injectable()
export class DeleteOperation {
  constructor(
    private readonly portfolios: GetOwnedPortfolio,
    private readonly store: OperationStore,
    private readonly details: OperationDetails,
  ) {}

  async execute(
    userId: string,
    portfolioId: string,
    operationId: string,
  ): Promise<void> {
    const owned = await this.portfolios.ensureOwned(userId, portfolioId);
    const id = parseOperationId(operationId);
    if (!id) {
      throw new OperationNotFoundError();
    }

    await withRejectionDetails(
      this.store.write(async (tx) => {
        if (!(await tx.lockPortfolio(owned))) {
          throw new PortfolioNotFoundError();
        }
        const current = await tx.lockOperation(owned, id);
        if (!current) {
          throw new OperationNotFoundError();
        }
        await tx.lockTimelines(owned, [current.assetId]);
        const evaluation = evaluateChange(
          await tx.timelineOf(owned, current.assetId),
          { kind: 'remove', operationId: id },
        );
        if (!evaluation.ok) {
          throw evaluation.violation;
        }
        await tx.delete(id);
      }),
      this.details,
    );
  }
}

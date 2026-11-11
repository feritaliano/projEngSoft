import { Injectable } from '@nestjs/common';
import { GetOwnedPortfolio } from '../../portfolios/application/get-owned-portfolio.use-case';
import { PortfolioNotFoundError } from '../../portfolios/domain/portfolio';
import { draftAsTimelineItem, OperationInput } from '../domain/operation';
import { OperationStore } from '../domain/operation-store';
import {
  evaluateChange,
  UNSAVED_OPERATION_ID,
  UNSAVED_SEQUENCE,
} from '../domain/timeline-change';
import {
  OperationDetails,
  OperationView,
  withRejectionDetails,
} from './operation-details';
import { OperationDrafts } from './operation-drafts';

/**
 * B2, B3: enters an operation (RN04) after recalculating the timeline of its (portfolio, asset) with it, in the same
 * transaction and under the lock of the pair (RN07, RN10). RN02: ownership checked here, by the user's id.
 */
@Injectable()
export class CreateOperation {
  constructor(
    private readonly portfolios: GetOwnedPortfolio,
    private readonly drafts: OperationDrafts,
    private readonly store: OperationStore,
    private readonly details: OperationDetails,
  ) {}

  async execute(
    userId: string,
    portfolioId: string,
    input: OperationInput,
  ): Promise<OperationView> {
    const owned = await this.portfolios.ensureOwned(userId, portfolioId);
    const draft = await this.drafts.create(input);

    const stored = await withRejectionDetails(
      this.store.write(async (tx) => {
        if (!(await tx.lockPortfolio(owned))) {
          throw new PortfolioNotFoundError();
        }
        await tx.lockTimelines(owned, [draft.assetId]);
        const evaluation = evaluateChange(
          await tx.timelineOf(owned, draft.assetId),
          {
            kind: 'add',
            operation: draftAsTimelineItem(
              draft,
              UNSAVED_OPERATION_ID,
              UNSAVED_SEQUENCE,
            ),
          },
        );
        if (!evaluation.ok) {
          throw evaluation.violation;
        }
        return tx.insert(owned, draft);
      }),
      this.details,
    );
    return this.details.view(stored);
  }
}

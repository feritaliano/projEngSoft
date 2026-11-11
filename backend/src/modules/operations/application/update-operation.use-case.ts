import { Injectable } from '@nestjs/common';
import { GetOwnedPortfolio } from '../../portfolios/application/get-owned-portfolio.use-case';
import { PortfolioNotFoundError } from '../../portfolios/domain/portfolio';
import {
  draftAsTimelineItem,
  OperationNotFoundError,
  parseOperationId,
} from '../domain/operation';
import { OperationStore } from '../domain/operation-store';
import { ChangeEvaluation, evaluateChange } from '../domain/timeline-change';
import {
  OperationDetails,
  OperationView,
  withRejectionDetails,
} from './operation-details';
import { OperationDrafts, OperationPatch } from './operation-drafts';

function accept(evaluation: ChangeEvaluation): void {
  if (!evaluation.ok) {
    throw evaluation.violation;
  }
}

/**
 * B4: edits an operation (fields not sent keep their value) and recalculates the whole timeline (RN10). Moving it to
 * another asset validates both timelines: the old one without it, the new one with it. The sequence is kept.
 */
@Injectable()
export class UpdateOperation {
  constructor(
    private readonly portfolios: GetOwnedPortfolio,
    private readonly drafts: OperationDrafts,
    private readonly store: OperationStore,
    private readonly details: OperationDetails,
  ) {}

  async execute(
    userId: string,
    portfolioId: string,
    operationId: string,
    patch: OperationPatch,
  ): Promise<OperationView> {
    const owned = await this.portfolios.ensureOwned(userId, portfolioId);
    const id = parseOperationId(operationId);
    if (!id) {
      throw new OperationNotFoundError();
    }

    const stored = await withRejectionDetails(
      this.store.write(async (tx) => {
        if (!(await tx.lockPortfolio(owned))) {
          throw new PortfolioNotFoundError();
        }
        const current = await tx.lockOperation(owned, id);
        if (!current) {
          throw new OperationNotFoundError();
        }
        const draft = await this.drafts.edit(current, patch);
        await tx.lockTimelines(owned, [current.assetId, draft.assetId]);

        const edited = draftAsTimelineItem(
          draft,
          id,
          current.operation.sequence,
        );
        if (draft.assetId === current.assetId) {
          accept(
            evaluateChange(await tx.timelineOf(owned, draft.assetId), {
              kind: 'replace',
              operation: edited,
            }),
          );
        } else {
          accept(
            evaluateChange(await tx.timelineOf(owned, current.assetId), {
              kind: 'remove',
              operationId: id,
            }),
          );
          accept(
            evaluateChange(await tx.timelineOf(owned, draft.assetId), {
              kind: 'add',
              operation: edited,
            }),
          );
        }
        return tx.update(id, draft);
      }),
      this.details,
    );
    return this.details.view(stored);
  }
}

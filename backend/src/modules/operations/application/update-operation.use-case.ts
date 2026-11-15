import { Injectable } from '@nestjs/common';
import { GetOwnedPortfolio } from '../../portfolios/application/get-owned-portfolio.use-case';
import { PortfolioNotFoundError } from '../../portfolios/domain/portfolio';
import {
  OperationNotFoundError,
  parseOperationId,
  StoredOperation,
} from '../domain/operation';
import { OperationStore } from '../domain/operation-store';
import { editPlan, evaluateChange } from '../domain/timeline-change';
import {
  OperationDetails,
  OperationView,
  withRejectionDetails,
} from './operation-details';
import { OperationDrafts, OperationPatch } from './operation-drafts';

/** Each extra attempt means a concurrent edit moved the operation to another asset or broker in between. */
const MAX_ATTEMPTS = 3;

/** The catalog checks of an edit depend only on the asset and the broker of the operation. */
function sameReferences(a: StoredOperation, b: StoredOperation): boolean {
  return (
    a.assetId === b.assetId && a.operation.brokerId === b.operation.brokerId
  );
}

/**
 * B4: edits an operation (fields not sent keep their value) and recalculates the whole timeline (RN10). Moving it to
 * another asset validates both timelines: the old one without it, the new one with it. The sequence is kept.
 * The edit is checked against the catalog before the transaction (M1: no query by another connection inside it) and
 * applied to the operation as locked, so a concurrent edit of other fields is kept; if that edit changed the asset or
 * the broker, the checks no longer apply and the edit starts over.
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

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const current = await this.store.read((tx) =>
        tx.findOperation(owned, id),
      );
      if (!current) {
        throw new OperationNotFoundError();
      }
      const assetType = await this.drafts.checkEdit(current, patch);

      const stored = await withRejectionDetails(
        this.store.write(async (tx) => {
          if (!(await tx.lockPortfolio(owned))) {
            throw new PortfolioNotFoundError();
          }
          const locked = await tx.lockOperation(owned, id);
          if (!locked) {
            throw new OperationNotFoundError();
          }
          if (!sameReferences(locked, current)) {
            return null;
          }
          const draft = this.drafts.editDraft(locked, patch, assetType);
          await tx.lockTimelines(owned, [locked.assetId, draft.assetId]);
          for (const { assetId, change } of editPlan(locked, draft).changes) {
            const evaluation = evaluateChange(
              await tx.timelineOf(owned, assetId),
              change,
            );
            if (!evaluation.ok) {
              throw evaluation.violation;
            }
          }
          return tx.update(id, draft);
        }),
        this.details,
      );
      if (stored) {
        return this.details.view(stored);
      }
    }
    throw new Error(
      `Operation ${id} changed during ${MAX_ATTEMPTS} attempts to edit it`,
    );
  }
}

import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/domain/clock';
import { InvalidValueError } from '../../../shared/domain/domain-error';
import { GetOwnedPortfolio } from '../../portfolios/application/get-owned-portfolio.use-case';
import type { PortfolioId } from '../../portfolios/domain/portfolio';
import {
  OperationDraft,
  OperationId,
  OperationInput,
  parseOperationId,
} from '../domain/operation';
import { OperationStore } from '../domain/operation-store';
import { OperationPreview, operationPreview } from '../domain/position-trace';
import {
  ChangeEvaluation,
  ChangePlan,
  createPlan,
  editPlan,
  evaluateChange,
} from '../domain/timeline-change';
import { OperationDetails, RuleViolationView } from './operation-details';
import { OperationDrafts } from './operation-drafts';

/** The Resumo da operação and, when the change would be rejected (RN07, RN10), the body of that 422. */
export type OperationPreviewView = OperationPreview & {
  readonly violation?: RuleViolationView;
};

type Rejected = Extract<ChangeEvaluation, { ok: false }>;

/** Missing, malformed or of another portfolio (RN02): the form shows "Esta operação não existe mais" (D56). */
function throwNotFound(): never {
  throw new InvalidValueError(
    'replacesOperationId',
    'NOT_FOUND',
    'must be an operation of this portfolio',
  );
}

/**
 * D42: the Resumo da operação of a new operation or, with `replacesOperationId`, of an edit (the stored operation
 * leaves the timeline and the form's takes its place), without writing anything. Same validations (RN04, D56), same
 * plan and evaluateChange as CreateOperation and UpdateOperation, in a read-only snapshot without locks. The catalog
 * checks run before the snapshot (M1); a concurrent change between them only makes the preview stale, and saving checks
 * everything again.
 */
@Injectable()
export class PreviewOperation {
  constructor(
    private readonly portfolios: GetOwnedPortfolio,
    private readonly drafts: OperationDrafts,
    private readonly store: OperationStore,
    private readonly details: OperationDetails,
    private readonly clock: Clock,
  ) {}

  async execute(
    userId: string,
    portfolioId: string,
    input: OperationInput,
    replacesOperationId: string | null,
  ): Promise<OperationPreviewView> {
    const owned = await this.portfolios.ensureOwned(userId, portfolioId);
    const replacedId =
      replacesOperationId === null
        ? null
        : (parseOperationId(replacesOperationId) ?? throwNotFound());
    const draft = replacedId
      ? await this.editDraft(owned, replacedId, input)
      : await this.drafts.create(input);

    const { plan, evaluations } = await this.store.read(async (tx) => {
      let plan: ChangePlan = createPlan(draft);
      if (replacedId) {
        const stored = await tx.findOperation(owned, replacedId);
        plan = editPlan(stored ?? throwNotFound(), draft);
      }
      const evaluations: ChangeEvaluation[] = [];
      for (const { assetId, change } of plan.changes) {
        evaluations.push(
          evaluateChange(await tx.timelineOf(owned, assetId), change),
        );
      }
      return { plan, evaluations };
    });

    // The timeline the operation enters (add or replace); a violation is the first one found, as the command throws it.
    const own =
      evaluations[
        plan.changes.findIndex(({ change }) => change.kind !== 'remove')
      ];
    const rejected = evaluations.find((e): e is Rejected => !e.ok);
    const refs = await this.details.refsOf(
      [plan.operation, ...own.steps.map((step) => step.item)].flatMap((item) =>
        item.kind === 'operation'
          ? [{ assetId: draft.assetId, brokerId: item.brokerId }]
          : [],
      ),
    );
    const preview = operationPreview(plan.operation, own, {
      asOf: this.clock.today(),
      brokerOf: refs.broker,
    });
    return rejected
      ? {
          ...preview,
          violation: await this.details.violationView(rejected.violation),
        }
      : preview;
  }

  /** As UpdateOperation: the catalog checks of the edit against the stored operation, outside the snapshot. */
  private async editDraft(
    owned: PortfolioId,
    id: OperationId,
    input: OperationInput,
  ): Promise<OperationDraft> {
    const stored =
      (await this.store.read((tx) => tx.findOperation(owned, id))) ??
      throwNotFound();
    const assetType = await this.drafts.checkEdit(stored, input);
    return this.drafts.editDraft(stored, input, assetType);
  }
}

import { Injectable } from '@nestjs/common';
import { GetOwnedPortfolio } from '../../portfolios/application/get-owned-portfolio.use-case';
import { OperationNotFoundError, parseOperationId } from '../domain/operation';
import { OperationStore } from '../domain/operation-store';
import { OperationDetails, OperationView } from './operation-details';

/** Frame 5 (edit mode): one operation of a portfolio of the user. RN02: 404 for anyone else's. */
@Injectable()
export class GetOperation {
  constructor(
    private readonly portfolios: GetOwnedPortfolio,
    private readonly store: OperationStore,
    private readonly details: OperationDetails,
  ) {}

  async execute(
    userId: string,
    portfolioId: string,
    operationId: string,
  ): Promise<OperationView> {
    const owned = await this.portfolios.ensureOwned(userId, portfolioId);
    const id = parseOperationId(operationId);
    const stored = id
      ? await this.store.read((tx) => tx.findOperation(owned, id))
      : null;
    if (!stored) {
      throw new OperationNotFoundError();
    }
    return this.details.view(stored);
  }
}

import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/domain/clock';
import { InvalidValueError } from '../../../shared/domain/domain-error';
import {
  AssetDirectory,
  BrokerDirectory,
} from '../../reference-data/application/directories';
import {
  inputOf,
  OperationDraft,
  operationDraft,
  OperationInput,
  StoredOperation,
} from '../domain/operation';
import { MissingReferenceError } from './operation-details';

/** Fields of an edit (PATCH): absent ones keep the stored value. */
export type OperationPatch = Partial<OperationInput>;

/**
 * RN04 against the catalog: a new operation (or an edit that changes the asset or the broker) needs an active asset and
 * an existing broker, else a 400 on that field. An edit that keeps them is valid even if the asset was deactivated later.
 */
@Injectable()
export class OperationDrafts {
  constructor(
    private readonly assets: AssetDirectory,
    private readonly brokers: BrokerDirectory,
    private readonly clock: Clock,
  ) {}

  async create(input: OperationInput): Promise<OperationDraft> {
    const asset = await this.activeAsset(input.assetId);
    await this.existingBroker(input.brokerId);
    return operationDraft(input, {
      assetType: asset.assetType,
      today: this.clock.today(),
    });
  }

  async edit(
    current: StoredOperation,
    patch: OperationPatch,
  ): Promise<OperationDraft> {
    const changes = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    ) as OperationPatch;
    const input: OperationInput = { ...inputOf(current), ...changes };

    const assetChanged = input.assetId !== current.assetId;
    const asset = assetChanged
      ? await this.activeAsset(input.assetId)
      : await this.storedAsset(current.assetId);
    if (input.brokerId !== current.operation.brokerId) {
      await this.existingBroker(input.brokerId);
    }
    return operationDraft(input, {
      assetType: asset.assetType,
      today: this.clock.today(),
    });
  }

  private async activeAsset(id: string) {
    const asset = await this.assets.findActive(id);
    if (!asset) {
      throw new InvalidValueError(
        'assetId',
        'NOT_FOUND',
        'must be an active asset of the catalog',
      );
    }
    return asset;
  }

  private async storedAsset(id: string) {
    const asset = (await this.assets.byIds([id])).get(id);
    if (!asset) {
      throw new MissingReferenceError('asset', id);
    }
    return asset;
  }

  private async existingBroker(id: string): Promise<void> {
    if (!(await this.brokers.findById(id))) {
      throw new InvalidValueError(
        'brokerId',
        'NOT_FOUND',
        'must be a registered broker',
      );
    }
  }
}

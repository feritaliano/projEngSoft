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
import type { AssetType } from '../domain/asset-type';
import { MissingReferenceError } from './operation-details';

/** Fields of an edit (PATCH): absent ones keep the stored value. */
export type OperationPatch = Partial<OperationInput>;

function mergePatch(
  stored: StoredOperation,
  patch: OperationPatch,
): OperationInput {
  const changes = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as OperationPatch;
  return { ...inputOf(stored), ...changes };
}

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

  /**
   * The catalog checks of an edit of `current`, outside any transaction (M1); returns the class of the edited asset.
   * They hold for any version of the operation with the same asset and broker (see editDraft).
   */
  async checkEdit(
    current: StoredOperation,
    patch: OperationPatch,
  ): Promise<AssetType> {
    const input = mergePatch(current, patch);
    const asset =
      input.assetId !== current.assetId
        ? await this.activeAsset(input.assetId)
        : await this.storedAsset(current.assetId);
    if (input.brokerId !== current.operation.brokerId) {
      await this.existingBroker(input.brokerId);
    }
    return asset.assetType;
  }

  /** The edit applied to the operation as locked, which must have the asset and broker that checkEdit saw. */
  editDraft(
    locked: StoredOperation,
    patch: OperationPatch,
    assetType: AssetType,
  ): OperationDraft {
    return operationDraft(mergePatch(locked, patch), {
      assetType,
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

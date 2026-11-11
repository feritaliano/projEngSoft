import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/domain/domain-error';
import {
  AssetDirectory,
  BrokerDirectory,
} from '../../reference-data/application/directories';
import type { AssetType } from '../domain/asset-type';
import type { StoredOperation } from '../domain/operation';
import type { OperationType } from '../domain/timeline';
import { BusinessRule, RuleViolationError } from '../domain/timeline-change';

/** The asset of an operation as the history, the form and the 422 show it (D50: ticker or display name). */
export interface AssetRef {
  readonly id: string;
  /** Null only for fixed income (D50). */
  readonly ticker: string | null;
  readonly displayName: string;
  readonly assetType: AssetType;
}

export interface BrokerRef {
  readonly id: string;
  readonly name: string;
}

/** An operation with its asset and broker (B5, frame 6; the edit form, frame 5). Decimals as strings (RN11). */
export interface OperationView {
  readonly id: string;
  readonly type: OperationType;
  readonly tradeDate: string;
  readonly quantity: string;
  readonly unitPrice: string;
  readonly fees: string;
  readonly asset: AssetRef;
  readonly broker: BrokerRef;
}

/**
 * Body of the 422 of RN07/RN10 and of the preview `violation` (D42): what BusinessRuleError (C2) shows. The operation is
 * the offending sell: the one being saved (RN07) or a later one (RN10); its id is null only when it is not saved yet.
 */
export interface RuleViolationView {
  readonly rule: BusinessRule;
  readonly operation: {
    readonly id: string | null;
    readonly type: 'SELL';
    readonly tradeDate: string;
    readonly quantity: string;
    readonly asset: AssetRef;
    readonly broker: BrokerRef;
  };
  /** Units held at the date of the offending sell, before it. */
  readonly availableQuantity: string;
  readonly soldQuantity: string;
}

/** RN07/RN10 with the details of the offending sell: the whole change was rejected and nothing was written. */
export class OperationRejectedError extends DomainError {
  readonly code = 'OPERATION_REJECTED';

  constructor(
    readonly violation: RuleViolationView,
    cause: RuleViolationError,
  ) {
    super(cause.message, { cause });
  }
}

/**
 * An operation whose asset or broker is not in the catalog. Foreign keys (ON DELETE RESTRICT) make it impossible
 * through the API: a server fault (500), never an operation shown without its asset.
 */
export class MissingReferenceError extends Error {
  constructor(kind: 'asset' | 'broker', id: string) {
    super(`Operation references the missing ${kind} ${id}`);
    this.name = 'MissingReferenceError';
  }
}

function toAssetRef(asset: AssetRef): AssetRef {
  return {
    id: asset.id,
    ticker: asset.ticker,
    displayName: asset.displayName,
    assetType: asset.assetType,
  };
}

function toBrokerRef(broker: BrokerRef): BrokerRef {
  return { id: broker.id, name: broker.name };
}

/** Joins operations with their asset and broker through the catalog's exported services (arquitetura 7.2). */
@Injectable()
export class OperationDetails {
  constructor(
    private readonly assets: AssetDirectory,
    private readonly brokers: BrokerDirectory,
  ) {}

  async views(stored: readonly StoredOperation[]): Promise<OperationView[]> {
    const refs = await this.refsOf(
      stored.map(({ assetId, operation }) => ({
        assetId,
        brokerId: operation.brokerId,
      })),
    );
    return stored.map(({ assetId, operation }) => ({
      id: operation.id,
      type: operation.type,
      tradeDate: operation.date.toString(),
      quantity: operation.quantity.toString(),
      unitPrice: operation.unitPrice.toString(),
      fees: operation.fees.toString(),
      asset: refs.asset(assetId),
      broker: refs.broker(operation.brokerId),
    }));
  }

  async view(stored: StoredOperation): Promise<OperationView> {
    const [view] = await this.views([stored]);
    return view;
  }

  /** The rejection of a change, with the asset and broker of the offending sell. */
  async rejection(error: RuleViolationError): Promise<OperationRejectedError> {
    const { operation } = error;
    const refs = await this.refsOf([
      { assetId: error.assetId, brokerId: operation.brokerId },
    ]);
    return new OperationRejectedError(
      {
        rule: error.rule,
        operation: {
          id: error.operationId,
          type: operation.type,
          tradeDate: operation.date.toString(),
          quantity: operation.quantity.toString(),
          asset: refs.asset(error.assetId),
          broker: refs.broker(operation.brokerId),
        },
        availableQuantity: error.availableQuantity.toString(),
        soldQuantity: error.soldQuantity.toString(),
      },
      error,
    );
  }

  private async refsOf(
    pairs: readonly { assetId: string; brokerId: string }[],
  ) {
    const [assets, brokers] = await Promise.all([
      this.assets.byIds(pairs.map((pair) => pair.assetId)),
      this.brokers.byIds(pairs.map((pair) => pair.brokerId)),
    ]);
    return {
      asset: (id: string): AssetRef => {
        const asset = assets.get(id);
        if (!asset) {
          throw new MissingReferenceError('asset', id);
        }
        return toAssetRef(asset);
      },
      broker: (id: string): BrokerRef => {
        const broker = brokers.get(id);
        if (!broker) {
          throw new MissingReferenceError('broker', id);
        }
        return toBrokerRef(broker);
      },
    };
  }
}

/** Turns a domain violation thrown inside a (rolled back) transaction into the rejection with its details. */
export async function withRejectionDetails<T>(
  work: Promise<T>,
  details: OperationDetails,
): Promise<T> {
  try {
    return await work;
  } catch (error) {
    if (error instanceof RuleViolationError) {
      throw await details.rejection(error);
    }
    throw error;
  }
}

import { Injectable } from '@nestjs/common';
import { isUuid } from '../../../shared/domain/uuid';
import {
  AssetCatalog,
  AssetSummary,
  Broker,
  BrokerCatalog,
  toAssetSummary,
} from '../domain/catalog';

function uniqueUuids(ids: readonly string[]): string[] {
  return [...new Set(ids)].filter(isUuid);
}

/**
 * Read service exported to other modules (arquitetura 7.2: they read the catalog only through it). The operations
 * module checks the asset of an operation (RN04) and shows its ticker or display name (D50).
 */
@Injectable()
export class AssetDirectory {
  constructor(private readonly catalog: AssetCatalog) {}

  /** Null when the asset does not exist, is inactive or the id is not a uuid: it cannot get a new operation. */
  async findActive(id: string): Promise<AssetSummary | null> {
    const record = isUuid(id) ? await this.catalog.findActiveById(id) : null;
    return record ? toAssetSummary(record) : null;
  }

  /** Assets by id, active or not; ids that are not uuids or do not exist are absent from the map. */
  async byIds(ids: readonly string[]): Promise<Map<string, AssetSummary>> {
    const wanted = uniqueUuids(ids);
    const records =
      wanted.length > 0 ? await this.catalog.findByIds(wanted) : [];
    return new Map(
      records.map((record) => [record.id, toAssetSummary(record)]),
    );
  }
}

/** Read service exported to other modules: brokers of operations (RN04, D9). */
@Injectable()
export class BrokerDirectory {
  constructor(private readonly catalog: BrokerCatalog) {}

  /** Null when the broker does not exist or the id is not a uuid. */
  async findById(id: string): Promise<Broker | null> {
    return (await this.byIds([id])).get(id) ?? null;
  }

  /** Brokers by id; ids that are not uuids or do not exist are absent from the map. */
  async byIds(ids: readonly string[]): Promise<Map<string, Broker>> {
    const wanted = uniqueUuids(ids);
    const brokers =
      wanted.length > 0 ? await this.catalog.findByIds(wanted) : [];
    return new Map(brokers.map((broker) => [broker.id, broker]));
  }
}

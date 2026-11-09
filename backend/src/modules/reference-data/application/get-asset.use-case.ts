import { Injectable } from '@nestjs/common';
import {
  AssetCatalog,
  AssetNotFoundError,
  AssetSummary,
  isTicker,
  toAssetSummary,
} from '../domain/catalog';

/** C1: an active asset by ticker. Tickers are stored in upper case (RN03), so "petr4" finds PETR4. */
@Injectable()
export class GetAsset {
  constructor(private readonly catalog: AssetCatalog) {}

  async execute(ticker: string): Promise<AssetSummary> {
    const normalized = ticker.trim().toUpperCase();
    const record = isTicker(normalized)
      ? await this.catalog.findByTicker(normalized)
      : null;
    if (!record) {
      throw new AssetNotFoundError();
    }
    return toAssetSummary(record);
  }
}

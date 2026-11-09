import { Injectable } from '@nestjs/common';
import {
  AssetCatalog,
  AssetPage,
  assetSearchOf,
  DEFAULT_PAGE_SIZE,
  toAssetSummary,
} from '../domain/catalog';

export interface SearchAssetsQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

/** C1: catalog search by ticker or issuer name, paginated with items and total. */
@Injectable()
export class SearchAssets {
  constructor(private readonly catalog: AssetCatalog) {}

  async execute(query: SearchAssetsQuery): Promise<AssetPage> {
    const term = query.search?.trim() ?? '';
    const { records, total } = await this.catalog.search(
      assetSearchOf(
        term === '' ? null : term,
        query.page ?? 1,
        query.pageSize ?? DEFAULT_PAGE_SIZE,
      ),
    );
    return { items: records.map(toAssetSummary), total };
  }
}

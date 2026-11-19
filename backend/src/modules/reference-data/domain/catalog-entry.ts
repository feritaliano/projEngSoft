import type { AssetType } from '../../operations/domain/asset-type';

/** Same values as the share_class enum of the database. */
export type ShareClass = 'ON' | 'PN' | 'PNA' | 'PNB' | 'UNIT';

/** Same values as the bdr_program enum: DRN unsponsored; DR1, DR2, DR3 sponsored levels; DRE BDR of an ETF (D50). */
export const BDR_PROGRAMS = ['DRN', 'DR1', 'DR2', 'DR3', 'DRE'] as const;
export type BdrProgram = (typeof BDR_PROGRAMS)[number];

export type IssuerKind = 'COMPANY' | 'FUND' | 'FOREIGN';

/** An asset of a B3 class as an external catalog file describes it (K5, D59). The issuer is known only by name. */
export interface CatalogEntry {
  readonly ticker: string;
  readonly isin: string;
  readonly type: Extract<AssetType, 'STOCK' | 'FII' | 'ETF' | 'BDR'>;
  /** Only for STOCK. */
  readonly shareClass: ShareClass | null;
  /** Only (and always) for BDR. */
  readonly bdrProgram: BdrProgram | null;
  readonly isActive: boolean;
  readonly issuerName: string;
  readonly issuerKind: IssuerKind;
}

/** An entry whose ISIN already belongs to another ticker: skipped, never overwritten. */
export interface CatalogConflict {
  readonly ticker: string;
  readonly isin: string;
  readonly existingTicker: string;
}

export interface CatalogBatchResult {
  readonly issuersCreated: number;
  /** Assets inserted or changed; an asset already equal to its entry is not touched. */
  readonly assetsWritten: number;
  readonly conflicts: readonly CatalogConflict[];
}

/**
 * Port: writes issuers and assets of the catalog (reference-data owns these tables, arquitetura 7.2). One call is one
 * transaction. Issuers are found by name and only created, so the CNPJ, CVM code and sector of the seed are kept.
 */
export abstract class CatalogWriter {
  abstract upsert(
    entries: readonly CatalogEntry[],
  ): Promise<CatalogBatchResult>;
}

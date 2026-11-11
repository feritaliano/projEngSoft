import type { AssetType } from './asset-type';

/** The asset of an operation or position as the screens show it (D50: ticker or display name). */
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

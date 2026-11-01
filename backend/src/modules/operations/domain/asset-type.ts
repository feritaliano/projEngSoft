/** Asset classes (RN03, D50); same values as the asset_type enum of the database. */
export const ASSET_TYPES = [
  'STOCK',
  'FII',
  'ETF',
  'BDR',
  'FIXED_INCOME',
  'CRYPTO',
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export function isAssetType(value: string): value is AssetType {
  return (ASSET_TYPES as readonly string[]).includes(value);
}

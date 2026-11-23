import { AssetType } from '../../api/models';

/** Type chips of the History (handoff, frame 6): FIIs before ETFs. */
export const CHIP_ORDER: readonly AssetType[] = [
  'STOCK',
  'FII',
  'ETF',
  'BDR',
  'FIXED_INCOME',
  'CRYPTO',
];

/** Names of each class (frames 4, 6 and 7; microcopy, section 11) and its color/chart/N (AssetAvatar, D45). */
export const ASSET_TYPE: Record<
  AssetType,
  { one: string; many: string; of: string; border: string; dot: string }
> = {
  STOCK: {
    one: 'Ação',
    many: 'Ações',
    of: 'de ações',
    border: 'border-chart-1',
    dot: 'bg-chart-1',
  },
  FII: { one: 'FII', many: 'FIIs', of: 'de FIIs', border: 'border-chart-2', dot: 'bg-chart-2' },
  ETF: { one: 'ETF', many: 'ETFs', of: 'de ETFs', border: 'border-chart-3', dot: 'bg-chart-3' },
  BDR: { one: 'BDR', many: 'BDRs', of: 'de BDRs', border: 'border-chart-4', dot: 'bg-chart-4' },
  FIXED_INCOME: {
    one: 'Renda fixa',
    many: 'Renda fixa',
    of: 'de renda fixa',
    border: 'border-chart-5',
    dot: 'bg-chart-5',
  },
  CRYPTO: {
    one: 'Cripto',
    many: 'Cripto',
    of: 'de cripto',
    border: 'border-chart-6',
    dot: 'bg-chart-6',
  },
};

/** The asset as the screens name it (D50, D55): the ticker, or the display name when there is none (fixed income). */
export const assetName = (asset: { ticker: string | null; displayName: string }): string =>
  asset.ticker ?? asset.displayName;

import { DerivedValue, OperationRef } from '../app/api/models';

// The PETR4 of "Longo prazo" as in the frame of C1 (handoff, "Massa de dados dos frames").
const xp = { id: 'b-xp', name: 'XP Investimentos' };
const buy: OperationRef = { id: 'o-buy', type: 'BUY', broker: xp };
const sell: OperationRef = { id: 'o-sell', type: 'SELL', broker: xp };
const form: OperationRef = { id: null, type: 'BUY', broker: xp };
const asOf = '2026-10-30';

export const PETR4 = {
  id: 'a-petr4',
  ticker: 'PETR4',
  displayName: 'PETR4',
  assetType: 'STOCK' as const,
};

export const AVG_PRICE: DerivedValue = {
  value: '32.0326666666666666666666666666666666666667',
  formulaCode: 'AVG_PRICE_BUY',
  asOf,
  inputs: [
    { name: 'quantityBefore', value: '100', source: 'POSITION', referenceDate: '2026-03-13' },
    { name: 'avgPriceBefore', value: '30', source: 'POSITION', referenceDate: '2026-03-13' },
    {
      name: 'quantityBought',
      value: '50',
      source: 'OPERATION',
      referenceDate: '2026-03-14',
      operation: buy,
    },
    {
      name: 'unitPrice',
      value: '36',
      source: 'OPERATION',
      referenceDate: '2026-03-14',
      operation: buy,
    },
    {
      name: 'fees',
      value: '4.9',
      source: 'OPERATION',
      referenceDate: '2026-03-14',
      operation: buy,
    },
  ],
};

export const TOTAL_COST: DerivedValue = {
  value: '3203.27',
  formulaCode: 'TOTAL_COST',
  asOf,
  inputs: [
    { name: 'quantity', value: '100', source: 'POSITION', referenceDate: asOf },
    {
      name: 'avgPrice',
      value: AVG_PRICE.value,
      source: 'DERIVED',
      referenceDate: asOf,
      derived: AVG_PRICE,
    },
  ],
};

export const SALE_PROFIT: DerivedValue = {
  value: '293.47',
  formulaCode: 'REALIZED_PROFIT',
  asOf,
  inputs: [
    {
      name: 'quantitySold',
      value: '50',
      source: 'OPERATION',
      referenceDate: '2026-06-02',
      operation: sell,
    },
    {
      name: 'unitPrice',
      value: '38',
      source: 'OPERATION',
      referenceDate: '2026-06-02',
      operation: sell,
    },
    {
      name: 'fees',
      value: '4.9',
      source: 'OPERATION',
      referenceDate: '2026-06-02',
      operation: sell,
    },
    {
      name: 'avgPriceAtSale',
      value: AVG_PRICE.value,
      source: 'POSITION',
      referenceDate: '2026-06-01',
    },
  ],
};

export const POSITION_PROFIT: DerivedValue = {
  value: '293.47',
  formulaCode: 'POSITION_REALIZED_PROFIT',
  asOf,
  inputs: [
    {
      name: 'sales',
      value: '293.47',
      source: 'OPERATION',
      referenceDate: '2026-06-02',
      operation: sell,
      derived: SALE_PROFIT,
    },
  ],
};

const assetPosition = (ticker: string, status: 'OPEN' | 'CLOSED', value: string) => ({
  name: 'positions',
  value,
  source: 'ASSET_POSITION' as const,
  referenceDate: asOf,
  asset: { id: `a-${ticker}`, ticker, displayName: ticker, assetType: 'STOCK' as const, status },
  derived: { ...POSITION_PROFIT, value },
});

export const PORTFOLIO_PROFIT: DerivedValue = {
  value: '693.87',
  formulaCode: 'PORTFOLIO_REALIZED_PROFIT',
  asOf,
  inputs: [
    assetPosition('PETR4', 'OPEN', '293.47'),
    assetPosition('MXRF11', 'OPEN', '-12.4'),
    assetPosition('WEGE3', 'CLOSED', '412.8'),
  ],
};

export const PORTFOLIO_COST: DerivedValue = {
  value: '3203.27',
  formulaCode: 'PORTFOLIO_TOTAL_COST',
  asOf,
  inputs: [{ ...assetPosition('PETR4', 'OPEN', '3203.27'), derived: TOTAL_COST }],
};

export const GROSS: DerivedValue = {
  value: '1800',
  formulaCode: 'OPERATION_GROSS',
  asOf,
  inputs: [
    {
      name: 'quantity',
      value: '50',
      source: 'OPERATION',
      referenceDate: '2026-10-28',
      operation: form,
    },
    {
      name: 'unitPrice',
      value: '36',
      source: 'OPERATION',
      referenceDate: '2026-10-28',
      operation: form,
    },
  ],
};

export const TOTAL_BUY: DerivedValue = {
  value: '1804.9',
  formulaCode: 'OPERATION_TOTAL_BUY',
  asOf,
  inputs: [
    {
      name: 'grossValue',
      value: '1800',
      source: 'DERIVED',
      referenceDate: '2026-10-28',
      derived: GROSS,
    },
    {
      name: 'fees',
      value: '4.9',
      source: 'OPERATION',
      referenceDate: '2026-10-28',
      operation: form,
    },
  ],
};

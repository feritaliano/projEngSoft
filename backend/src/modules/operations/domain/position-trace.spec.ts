import { LONGO_PRAZO_OPERATIONS } from '../../../../test/factories/longo-prazo.factory';
import { buy, sell, split } from '../../../../test/factories/timeline.factory';
import { LocalDate } from '../../../shared/domain/local-date';
import { Money } from '../../../shared/domain/money';
import { Quantity } from '../../../shared/domain/quantity';
import type { AssetType } from './asset-type';
import type { AssetRef, BrokerRef } from './catalog-refs';
import { calculatePosition } from './position-calculator';
import {
  operationPreview,
  PositionLine,
  positionLine,
  portfolioTotals,
  TraceContext,
} from './position-trace';
import { timelineOperation, TimelineItem, TimelineOperation } from './timeline';
import {
  evaluateChange,
  TimelineChange,
  UNSAVED_OPERATION_ID,
  UNSAVED_SEQUENCE,
} from './timeline-change';

const TODAY = LocalDate.parse('2026-11-11');
const BROKERS: Record<string, BrokerRef> = {
  'broker-xp': { id: 'broker-xp', name: 'XP Investimentos' },
  'broker-rico': { id: 'broker-rico', name: 'Rico' },
};
const context: TraceContext = {
  asOf: TODAY,
  brokerOf: (id) => BROKERS[id],
};
const XP_REF = { id: 'broker-xp', name: 'XP Investimentos' };
const RICO = { brokerId: 'broker-rico' };

function assetRef(ticker: string, assetType: AssetType = 'STOCK'): AssetRef {
  return { id: `asset-${ticker}`, ticker, displayName: ticker, assetType };
}

function lineOf(
  items: readonly TimelineItem[],
  asset = assetRef('PETR4'),
): PositionLine | null {
  const calculation = calculatePosition(items);
  if (!calculation.ok) {
    throw calculation.error;
  }
  return positionLine(asset, calculation.position, calculation.steps, context);
}

function openLine(items: readonly TimelineItem[], asset?: AssetRef) {
  const line = lineOf(items, asset);
  if (line?.status !== 'OPEN') {
    throw new Error(`expected an open line, got ${JSON.stringify(line)}`);
  }
  return line;
}

describe('positionLine (D26, D41)', () => {
  it('traces an open position: AVG_PRICE_BUY by the buy and TOTAL_COST = quantity × PM (RN05)', () => {
    const line = openLine([
      buy('2026-01-05', '100', '29.95', '5.00', { id: 'op-1' }),
    ]);

    const averagePrice = {
      value: '30',
      formulaCode: 'AVG_PRICE_BUY',
      asOf: '2026-11-11',
      inputs: [
        {
          name: 'quantityBefore',
          value: '0',
          source: 'POSITION',
          referenceDate: '2026-01-05',
        },
        {
          name: 'avgPriceBefore',
          value: '0',
          source: 'POSITION',
          referenceDate: '2026-01-05',
        },
        ...(
          [
            ['quantityBought', '100'],
            ['unitPrice', '29.95'],
            ['fees', '5'],
          ] as const
        ).map(([name, value]) => ({
          name,
          value,
          source: 'OPERATION',
          referenceDate: '2026-01-05',
          operation: { id: 'op-1', type: 'BUY', broker: XP_REF },
        })),
      ],
    };
    expect(line).toEqual({
      asset: assetRef('PETR4'),
      status: 'OPEN',
      quantity: '100',
      averagePrice,
      totalCost: {
        value: '3000',
        formulaCode: 'TOTAL_COST',
        asOf: '2026-11-11',
        inputs: [
          {
            name: 'quantity',
            value: '100',
            source: 'POSITION',
            referenceDate: '2026-11-11',
          },
          {
            name: 'avgPrice',
            value: '30',
            source: 'DERIVED',
            referenceDate: '2026-11-11',
            derived: averagePrice,
          },
        ],
      },
      realizedProfit: {
        value: '0',
        formulaCode: 'POSITION_REALIZED_PROFIT',
        asOf: '2026-11-11',
        inputs: [],
      },
    });
  });

  it('closes a fully sold position with its realized profit and no PM nor cost (D41, RN06, RN08)', () => {
    const line = lineOf([
      buy('2026-01-05', '40', '36.00', '4.90'),
      sell('2026-02-10', '40', '46.55', '4.30', { id: 'op-sell' }),
    ]);

    const sale = { id: 'op-sell', type: 'SELL', broker: XP_REF };
    expect(line).toEqual({
      asset: assetRef('PETR4'),
      status: 'CLOSED',
      quantity: '0',
      averagePrice: null,
      totalCost: null,
      realizedProfit: {
        value: '412.8',
        formulaCode: 'POSITION_REALIZED_PROFIT',
        asOf: '2026-11-11',
        inputs: [
          {
            name: 'sales',
            value: '412.8',
            source: 'OPERATION',
            referenceDate: '2026-02-10',
            operation: sale,
            derived: {
              value: '412.8',
              formulaCode: 'REALIZED_PROFIT',
              asOf: '2026-11-11',
              inputs: [
                ...(
                  [
                    ['quantitySold', '40'],
                    ['unitPrice', '46.55'],
                    ['fees', '4.3'],
                  ] as const
                ).map(([name, value]) => ({
                  name,
                  value,
                  source: 'OPERATION',
                  referenceDate: '2026-02-10',
                  operation: sale,
                })),
                {
                  name: 'avgPriceAtSale',
                  value: '36.1225',
                  source: 'POSITION',
                  referenceDate: '2026-02-10',
                },
              ],
            },
          },
        ],
      },
    });
  });

  it('leaves out a closed position with realized profit exactly 0 (D41)', () => {
    expect(
      lineOf([
        buy('2026-01-05', '10', '10', '0'),
        sell('2026-02-10', '10', '10', '0'),
      ]),
    ).toBeNull();
  });

  it('restarts the PM trace at the buy after the position was zeroed and keeps the earlier sale (RN08)', () => {
    const line = openLine([
      buy('2026-01-05', '10', '10', '0'),
      sell('2026-02-10', '10', '12', '0'),
      buy('2026-03-14', '5', '20', '1'),
    ]);

    expect(line.averagePrice.value).toBe('20.2');
    expect(
      line.averagePrice.inputs.map(({ name, value, referenceDate }) => [
        name,
        value,
        referenceDate,
      ]),
    ).toEqual([
      ['quantityBefore', '0', '2026-03-14'],
      ['avgPriceBefore', '0', '2026-03-14'],
      ['quantityBought', '5', '2026-03-14'],
      ['unitPrice', '20', '2026-03-14'],
      ['fees', '1', '2026-03-14'],
    ]);
    expect(line.realizedProfit.value).toBe('20');
    expect(line.realizedProfit.inputs).toHaveLength(1);
  });

  it('sums the brokers of the portfolio and names the broker of each operation (RN12)', () => {
    const line = openLine([
      buy('2026-01-05', '100', '10', '0'),
      buy('2026-01-06', '100', '20', '0', RICO),
      sell('2026-01-07', '50', '30', '0', RICO),
    ]);

    expect(line.quantity).toBe('150');
    expect(line.averagePrice.value).toBe('15');
    expect(line.totalCost.value).toBe('2250');
    expect(line.realizedProfit.value).toBe('750');
    expect(line.averagePrice.inputs.slice(0, 2)).toEqual([
      expect.objectContaining({ name: 'quantityBefore', value: '100' }),
      expect.objectContaining({ name: 'avgPriceBefore', value: '10' }),
    ]);
    expect(line.averagePrice.inputs[2]).toMatchObject({
      operation: { broker: { id: 'broker-rico', name: 'Rico' } },
    });
    expect(line.realizedProfit.inputs[0]).toMatchObject({
      operation: { type: 'SELL', broker: { name: 'Rico' } },
    });
  });

  it('sends zero costs as "0", not omitted (RN04: fees >= 0)', () => {
    const line = openLine([buy('2026-01-05', '10', '10', '0')]);

    expect(line.averagePrice.inputs[4]).toMatchObject({
      name: 'fees',
      value: '0',
    });
  });

  it('keeps every decimal place of a repeating PM, unrounded (RN11)', () => {
    const line = openLine([buy('2026-01-05', '3', '10', '1')]);

    expect(line.averagePrice.value).toBe(`10.${'3'.repeat(38)}`);
    expect(line.totalCost.value).toBe('31');
    expect(line.totalCost.inputs[1].value).toBe(line.averagePrice.value);
  });

  it('traces fixed income in multiples of 0.01 (D55)', () => {
    const line = openLine([buy('2026-01-05', '0.52', '3000.10', '0')], {
      id: 'asset-ipca',
      ticker: null,
      displayName: 'Tesouro IPCA+ 2035',
      assetType: 'FIXED_INCOME',
    });

    expect(line.asset.ticker).toBeNull();
    expect(line.quantity).toBe('0.52');
    expect(line.totalCost.value).toBe('1560.052');
    expect(line.averagePrice.value).toBe('3000.1');
  });

  it('traces crypto with 8 decimal places, in plain notation (D55)', () => {
    const line = openLine(
      [
        buy('2026-01-05', '0.0125', '350000', '1.5'),
        sell('2026-02-05', '0.01249999', '400000', '0'),
      ],
      assetRef('BTC', 'CRYPTO'),
    );

    expect(line.quantity).toBe('0.00000001');
    expect(line.totalCost.inputs[0].value).toBe('0.00000001');
    const [sale] = line.realizedProfit.inputs;
    expect(sale.source === 'OPERATION' && sale.derived?.inputs[0]).toEqual(
      expect.objectContaining({ name: 'quantitySold', value: '0.01249999' }),
    );
  });

  it('refuses a timeline with a corporate event until S2 traces it, instead of a PM trace that does not explain the value (D29)', () => {
    expect(() =>
      lineOf([
        buy('2026-01-05', '100', '10', '0'),
        split('2026-02-01', '1', '2'),
      ]),
    ).toThrow('has no trace yet (S2)');
  });

  it('refuses an open position without a buy: a broken timeline, not a guessed trace (RN09)', () => {
    expect(() =>
      positionLine(
        assetRef('PETR4'),
        {
          quantity: Quantity.of('1'),
          totalCost: Money.of('1'),
          averagePrice: Money.of('1'),
          realizedProfit: Money.zero(),
        },
        [],
        context,
      ),
    ).toThrow('without a buy');
  });
});

describe('portfolioTotals (B7, D41)', () => {
  /** Massa of the frames (handoff): 9 operations of the "Longo prazo" portfolio. */
  function longoPrazoLines(): PositionLine[] {
    const byTicker = new Map<string, TimelineItem[]>();
    LONGO_PRAZO_OPERATIONS.forEach((operation, index) => {
      const items = byTicker.get(operation.ticker) ?? [];
      items.push(
        timelineOperation({
          id: `op-${index}`,
          type: operation.type,
          date: operation.tradeDate,
          sequence: BigInt(index),
          quantity: operation.quantity,
          unitPrice: operation.unitPrice,
          fees: operation.fees,
          brokerId: 'broker-xp',
        }),
      );
      byTicker.set(operation.ticker, items);
    });
    return [...byTicker].map(([ticker, items]) => {
      const line = lineOf(items, assetRef(ticker));
      if (!line) {
        throw new Error(`no line for ${ticker}`);
      }
      return line;
    });
  }

  it('totals the massa of the frames: cost R$ 10.051,27 and realized + R$ 693,87 (D41)', () => {
    const lines = longoPrazoLines();
    const totals = portfolioTotals(lines, TODAY);

    expect(Money.of(totals.totalCost.value).toFixed(2)).toBe('10051.27');
    expect(Money.of(totals.realizedProfit.value).toFixed(2)).toBe('693.87');
    expect(totals.assetCount).toBe(4);
    expect(totals.totalCost).toMatchObject({
      formulaCode: 'PORTFOLIO_TOTAL_COST',
      asOf: '2026-11-11',
    });
    expect(
      totals.totalCost.inputs.map((input) =>
        input.source === 'ASSET_POSITION'
          ? [input.name, input.asset.ticker, input.asset.status]
          : null,
      ),
    ).toEqual([
      ['positions', 'PETR4', 'OPEN'],
      ['positions', 'MXRF11', 'OPEN'],
      ['positions', 'ITSA4', 'OPEN'],
      ['positions', 'BOVA11', 'OPEN'],
    ]);
  });

  it('makes the realized profit the sum of the rows with profit ≠ 0, open and closed, each linking to its trace (D41)', () => {
    const lines = longoPrazoLines();
    const { realizedProfit } = portfolioTotals(lines, TODAY);

    expect(realizedProfit.formulaCode).toBe('PORTFOLIO_REALIZED_PROFIT');
    expect(
      realizedProfit.inputs.map((input) =>
        input.source === 'ASSET_POSITION'
          ? [input.asset.ticker, input.asset.status, input.value]
          : null,
      ),
    ).toEqual([
      ['WEGE3', 'CLOSED', '412.8'],
      ['PETR4', 'OPEN', expect.stringMatching(/^293\.4/) as unknown],
      ['MXRF11', 'OPEN', expect.stringMatching(/^-12\.4/) as unknown],
    ]);
    const sumOfRows = lines.reduce(
      (sum, line) => sum.plus(Money.of(line.realizedProfit.value)),
      Money.zero(),
    );
    expect(realizedProfit.value).toBe(sumOfRows.toString());
    const wege3 = lines.find((line) => line.asset.ticker === 'WEGE3');
    expect(realizedProfit.inputs[0]).toMatchObject({
      referenceDate: '2026-11-11',
      derived: wege3?.realizedProfit,
    });
  });

  it('leaves an open position whose sales net exactly 0 out of the realized profit inputs, but in the cost (D41)', () => {
    const lines = [
      openLine([
        buy('2026-01-05', '10', '10', '0'),
        sell('2026-02-10', '5', '10', '0'),
      ]),
    ];
    const totals = portfolioTotals(lines, TODAY);

    expect(totals.realizedProfit.inputs).toEqual([]);
    expect(totals.totalCost.inputs).toHaveLength(1);
    expect(totals.totalCost.value).toBe('50');
  });

  it('sends the asset of a fixed income position with ticker null and its display name (D55)', () => {
    const bond: AssetRef = {
      id: 'asset-ipca',
      ticker: null,
      displayName: 'Tesouro IPCA+ 2035',
      assetType: 'FIXED_INCOME',
    };
    const { totalCost } = portfolioTotals(
      [openLine([buy('2026-01-05', '0.52', '3000', '0')], bond)],
      TODAY,
    );

    expect(totalCost.inputs[0]).toMatchObject({
      name: 'positions',
      value: '1560',
      source: 'ASSET_POSITION',
      asset: { ...bond, status: 'OPEN' },
    });
  });

  it('gives zero totals with no inputs for a portfolio without positions (B7)', () => {
    expect(portfolioTotals([], TODAY)).toEqual({
      totalCost: {
        value: '0',
        formulaCode: 'PORTFOLIO_TOTAL_COST',
        asOf: '2026-11-11',
        inputs: [],
      },
      realizedProfit: {
        value: '0',
        formulaCode: 'PORTFOLIO_REALIZED_PROFIT',
        asOf: '2026-11-11',
        inputs: [],
      },
      assetCount: 0,
    });
  });
});

describe('operationPreview (D42, frame 5)', () => {
  const stored = buy('2026-01-05', '100', '29.95', '5.00', {
    id: 'b1',
    sequence: 1n,
  });
  const storedRef = { id: 'b1', type: 'BUY', broker: XP_REF };

  function previewOf(
    items: readonly TimelineItem[],
    change: TimelineChange,
    operation: TimelineOperation,
  ) {
    return operationPreview(
      operation,
      evaluateChange({ portfolioId: 'p1', assetId: 'a1', items }, change),
      context,
    );
  }

  /** The preview of a new operation: unsaved, last of its date (as CreateOperation). */
  function previewNew(
    items: readonly TimelineItem[],
    operation: TimelineOperation,
  ) {
    const unsaved = {
      ...operation,
      id: UNSAVED_OPERATION_ID,
      sequence: UNSAVED_SEQUENCE,
    };
    return previewOf(items, { kind: 'add', operation: unsaved }, unsaved);
  }

  /** AVG_PRICE_BUY of PM 30 by the stored buy of 100 × 29.95 + 5.00. */
  const PM_30 = {
    value: '30',
    formulaCode: 'AVG_PRICE_BUY',
    asOf: '2026-11-11',
    inputs: [
      {
        name: 'quantityBefore',
        value: '0',
        source: 'POSITION',
        referenceDate: '2026-01-05',
      },
      {
        name: 'avgPriceBefore',
        value: '0',
        source: 'POSITION',
        referenceDate: '2026-01-05',
      },
      ...(
        [
          ['quantityBought', '100'],
          ['unitPrice', '29.95'],
          ['fees', '5'],
        ] as const
      ).map(([name, value]) => ({
        name,
        value,
        source: 'OPERATION',
        referenceDate: '2026-01-05',
        operation: storedRef,
      })),
    ],
  };

  it('previews a first buy: gross, total with fees and the PM after it, linked to the unsaved operation (id null)', () => {
    const preview = previewNew([], buy('2026-01-05', '100', '29.95', '5.00'));

    const unsavedRef = { id: null, type: 'BUY', broker: XP_REF };
    const fromForm = (name: string, value: string) => ({
      name,
      value,
      source: 'OPERATION',
      referenceDate: '2026-01-05',
      operation: unsavedRef,
    });
    const gross = {
      value: '2995',
      formulaCode: 'OPERATION_GROSS',
      asOf: '2026-11-11',
      inputs: [fromForm('quantity', '100'), fromForm('unitPrice', '29.95')],
    };
    expect(preview).toEqual({
      grossAmount: gross,
      netAmount: {
        value: '3000',
        formulaCode: 'OPERATION_TOTAL_BUY',
        asOf: '2026-11-11',
        inputs: [
          {
            name: 'grossValue',
            value: '2995',
            source: 'DERIVED',
            referenceDate: '2026-01-05',
            derived: gross,
          },
          fromForm('fees', '5'),
        ],
      },
      positionBefore: '0',
      positionAfter: '100',
      averagePriceBefore: null,
      averagePriceAfter: {
        ...PM_30,
        inputs: [
          ...PM_30.inputs.slice(0, 2),
          fromForm('quantityBought', '100'),
          fromForm('unitPrice', '29.95'),
          fromForm('fees', '5'),
        ],
      },
    });
    expect(preview).not.toHaveProperty('realizedProfit');
  });

  it('previews a sell with profit: net of fees, the PM kept and the estimated REALIZED_PROFIT (RN06)', () => {
    const preview = previewNew(
      [stored],
      sell('2026-06-02', '40', '38.50', '4.90'),
    );

    expect(preview.netAmount).toMatchObject({
      value: '1535.1',
      formulaCode: 'OPERATION_NET_SELL',
    });
    expect(preview).toMatchObject({
      grossAmount: { value: '1540' },
      positionBefore: '100',
      positionAfter: '60',
      averagePriceBefore: PM_30,
      averagePriceAfter: PM_30,
      realizedProfit: {
        value: '335.1',
        formulaCode: 'REALIZED_PROFIT',
        inputs: [
          { name: 'quantitySold', value: '40', operation: { id: null } },
          { name: 'unitPrice', value: '38.5' },
          { name: 'fees', value: '4.9' },
          { name: 'avgPriceAtSale', value: '30', source: 'POSITION' },
        ],
      },
    });
  });

  it('previews a total sell with no PM after it (RN08)', () => {
    const preview = previewNew(
      [stored],
      sell('2026-06-02', '100', '38.50', '0'),
    );

    expect(preview).toMatchObject({
      positionBefore: '100',
      positionAfter: '0',
      averagePriceBefore: PM_30,
      averagePriceAfter: null,
      realizedProfit: { value: '850' },
    });
  });

  it('measures before and after at the date of a retroactive buy, not at the end of the timeline (D42)', () => {
    const later = buy('2026-03-01', '50', '40', '0', {
      id: 'b2',
      sequence: 2n,
    });

    const preview = previewNew(
      [stored, later],
      buy('2026-02-01', '100', '32', '0'),
    );

    expect(preview).toMatchObject({
      positionBefore: '100',
      positionAfter: '200',
      averagePriceBefore: PM_30,
      averagePriceAfter: { value: '31' },
    });
  });

  it('keeps the values before a sell above the position and leaves the rest null (RN07)', () => {
    const preview = previewNew(
      [stored],
      sell('2026-06-02', '150', '38.50', '0'),
    );

    expect(preview).toMatchObject({
      grossAmount: { value: '5775' },
      positionBefore: '100',
      positionAfter: null,
      averagePriceBefore: PM_30,
      averagePriceAfter: null,
      realizedProfit: null,
    });
  });

  it('previews a sell without any units as RN07 from zero, with no PM (RN07)', () => {
    const preview = previewNew([], sell('2026-06-02', '10', '38.50', '0'));

    expect(preview).toMatchObject({
      positionBefore: '0',
      positionAfter: null,
      averagePriceBefore: null,
      averagePriceAfter: null,
      realizedProfit: null,
    });
  });

  it('gives full values when the violation is a later sell (RN10)', () => {
    const later = sell('2026-08-01', '80', '40', '0', {
      id: 's1',
      sequence: 2n,
    });

    const preview = previewNew(
      [stored, later],
      sell('2026-06-02', '40', '38.50', '0'),
    );

    expect(preview).toMatchObject({
      positionBefore: '100',
      positionAfter: '60',
      averagePriceAfter: PM_30,
      realizedProfit: { value: '340' },
    });
  });

  it('gives no value of the position when an edit moves a buy past a sell that needed it (RN10)', () => {
    const later = sell('2026-06-02', '50', '38', '0', {
      id: 's1',
      sequence: 2n,
    });
    const moved = buy('2026-09-01', '100', '29.95', '5.00', {
      id: 'b1',
      sequence: 1n,
    });

    const preview = previewOf(
      [stored, later],
      { kind: 'replace', operation: moved },
      moved,
    );

    expect(preview).toMatchObject({
      grossAmount: { value: '2995' },
      netAmount: { value: '3000', formulaCode: 'OPERATION_TOTAL_BUY' },
      positionBefore: null,
      positionAfter: null,
      averagePriceBefore: null,
      averagePriceAfter: null,
    });
    expect(preview).not.toHaveProperty('realizedProfit');
    // The stored operation keeps its id in the trace (an edit).
    expect(preview.grossAmount.inputs[0]).toMatchObject({
      operation: { id: 'b1' },
    });
  });

  it('refuses a corporate event before the operation until S2 traces it (D29)', () => {
    expect(() =>
      previewNew(
        [stored, split('2026-02-01', '1', '2')],
        sell('2026-06-02', '10', '20', '0'),
      ),
    ).toThrow('has no trace yet (S2)');
  });

  it('refuses an evaluation that does not contain the operation: a programming error, not a preview', () => {
    const other = buy('2026-02-01', '10', '20');

    expect(() =>
      operationPreview(
        other,
        evaluateChange(
          { portfolioId: 'p1', assetId: 'a1', items: [stored] },
          { kind: 'replace', operation: stored },
        ),
        context,
      ),
    ).toThrow('is not in its evaluated timeline');
  });

  it('refuses units held without a buy: a broken timeline, not a guessed trace (RN09)', () => {
    const lone = sell('2026-06-02', '5', '10', '0', { id: 's1' });
    const held = {
      quantity: Quantity.of('10'),
      totalCost: Money.of('100'),
      averagePrice: Money.of('10'),
    };

    expect(() =>
      operationPreview(
        lone,
        {
          ok: true,
          position: { ...held, realizedProfit: Money.zero() },
          steps: [
            {
              item: lone as Extract<TimelineOperation, { type: 'SELL' }>,
              before: held,
              after: { ...held, quantity: Quantity.of('5') },
              realizedProfit: Money.zero(),
            },
          ],
        },
        context,
      ),
    ).toThrow('without a buy');
  });
});

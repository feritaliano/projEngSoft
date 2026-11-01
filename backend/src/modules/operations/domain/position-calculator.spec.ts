import {
  bonus,
  buy,
  reverseSplit,
  sell,
  split,
} from '../../../../test/factories/timeline.factory';
import { LocalDate } from '../../../shared/domain/local-date';
import { Money } from '../../../shared/domain/money';
import {
  calculatePosition,
  NegativePositionError,
  Position,
  PositionCalculation,
} from './position-calculator';
import { TimelineItem } from './timeline';

function positionOf(items: TimelineItem[]): Position {
  const result = calculatePosition(items);
  if (!result.ok) {
    throw new Error(`unexpected violation: ${result.error.message}`);
  }
  return result.position;
}

function violationOf(items: TimelineItem[]): NegativePositionError {
  const result = calculatePosition(items);
  if (result.ok) {
    throw new Error('expected a violation');
  }
  return result.error;
}

/** quantity, PM (4 places), total cost and realized profit (2 places), as the screens show them. */
function summary(position: Position) {
  return {
    quantity: position.quantity.toString(),
    averagePrice: position.averagePrice.toFixed(4),
    totalCost: position.totalCost.toFixed(2),
    realizedProfit: position.realizedProfit.toFixed(2),
  };
}

describe('calculatePosition', () => {
  it('returns an empty position for an empty timeline', () => {
    expect(summary(positionOf([]))).toEqual({
      quantity: '0',
      averagePrice: '0.0000',
      totalCost: '0.00',
      realizedProfit: '0.00',
    });
  });

  describe('buys (RN05)', () => {
    it('includes the fees in the average price of the first buy', () => {
      expect(
        summary(positionOf([buy('2026-01-05', '100', '29.95', '5.00')])),
      ).toEqual({
        quantity: '100',
        averagePrice: '30.0000',
        totalCost: '3000.00',
        realizedProfit: '0.00',
      });
    });

    it('averages a second buy with the units already held', () => {
      const position = positionOf([
        buy('2026-01-05', '100', '29.95', '5.00'),
        buy('2026-03-14', '50', '36.00', '4.90'),
      ]);

      // (100 × 30 + 50 × 36 + 4.90) ÷ 150 = 4804.90 ÷ 150
      expect(position.averagePrice.toFixed(10)).toBe('32.0326666667');
      expect(position.totalCost.toFixed(2)).toBe('4804.90');
    });

    it('accepts zero fees', () => {
      expect(
        summary(positionOf([buy('2026-01-05', '10', '12.34', '0')])),
      ).toMatchObject({
        averagePrice: '12.3400',
        totalCost: '123.40',
      });
    });
  });

  describe('sells (RN06, RN08)', () => {
    it('keeps the average price and realizes qty × price − fees − qty × PM (RN06)', () => {
      const position = positionOf([
        buy('2026-01-05', '100', '29.95', '5.00'),
        buy('2026-03-14', '50', '36.00', '4.90'),
        sell('2026-06-02', '50', '38.00', '4.90'),
      ]);

      expect(summary(position)).toEqual({
        quantity: '100',
        averagePrice: '32.0327',
        totalCost: '3203.27',
        realizedProfit: '293.47',
      });
    });

    it('realizes a loss when selling below the average price (RN06)', () => {
      const position = positionOf([
        buy('2026-01-08', '200', '10.10', '4.00'),
        sell('2026-05-22', '50', '9.88', '0.40'),
      ]);

      expect(position.realizedProfit.toFixed(2)).toBe('-12.40');
      expect(position.realizedProfit.isNegative()).toBe(true);
      expect(position.averagePrice.toFixed(2)).toBe('10.12');
    });

    it('closes the position on a total sell: quantity, PM and cost zero, profit kept (RN06, RN08)', () => {
      const position = positionOf([
        buy('2026-01-05', '40', '36.00', '4.90'),
        sell('2026-02-10', '40', '46.55', '4.30'),
      ]);

      expect(summary(position)).toEqual({
        quantity: '0',
        averagePrice: '0.0000',
        totalCost: '0.00',
        realizedProfit: '412.80',
      });
    });

    it('restarts the average price on a buy after the position was closed (RN08)', () => {
      const position = positionOf([
        buy('2026-01-05', '40', '36.00', '4.90'),
        sell('2026-02-10', '40', '46.55', '4.30'),
        buy('2026-03-01', '10', '50.00', '1.00'),
      ]);

      expect(summary(position)).toEqual({
        quantity: '10',
        averagePrice: '50.1000',
        totalCost: '501.00',
        realizedProfit: '412.80',
      });
    });
  });

  describe('negative position (RN07, RN10)', () => {
    it('rejects a sell above the position and identifies it (RN07)', () => {
      const offending = sell('2026-02-01', '150', '31.00', '0', {
        id: 'op-sell',
      });

      const error = violationOf([buy('2026-01-05', '100', '30.00'), offending]);

      expect(error).toBeInstanceOf(NegativePositionError);
      expect(error.code).toBe('NEGATIVE_POSITION');
      expect(error.operation).toBe(offending);
      expect(error.availableQuantity.toString()).toBe('100');
      expect(error.soldQuantity.toString()).toBe('150');
      expect(error.message).toBe(
        'Sell op-sell of 150 on 2026-02-01 exceeds the 100 units held at that point',
      );
    });

    it('reports the chronologically first offending sell when several break (RN07, RN10)', () => {
      const result = calculatePosition([
        buy('2026-01-05', '10', '10.00'),
        sell('2026-03-01', '15', '10.00', '0', { id: 'b' }),
        sell('2026-02-01', '20', '10.00', '0', { id: 'a' }),
      ]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.operation.id).toBe('a');
        expect(result.error.availableQuantity.toString()).toBe('10');
        expect(result.steps).toHaveLength(1);
      }
    });

    it('rejects a later sell made invalid by a retroactive reverse split (RN10, D29)', () => {
      const laterSell = sell('2026-03-01', '50', '35.00', '0', { id: 'later' });
      const firstBuy = buy('2026-01-05', '100', '30.00');
      expect(calculatePosition([firstBuy, laterSell]).ok).toBe(true);

      const error = violationOf([
        firstBuy,
        laterSell,
        reverseSplit('2026-02-01', '10', '1'),
      ]);

      expect(error.operation).toBe(laterSell);
      expect(error.availableQuantity.toString()).toBe('10');
    });

    it('rejects a sell before any buy (RN07)', () => {
      const error = violationOf([sell('2026-01-05', '1', '10.00')]);

      expect(error.availableQuantity.toString()).toBe('0');
    });

    it('rejects a retroactive sell that invalidates a later sell, pointing at the later one (RN10)', () => {
      const laterSell = sell('2026-03-10', '80', '35.00', '0', { id: 'later' });
      const timeline = [
        buy('2026-01-05', '100', '30.00'),
        laterSell,
        sell('2026-02-10', '50', '33.00', '0', { id: 'retroactive' }),
      ];

      const error = violationOf(timeline);

      expect(error.operation).toBe(laterSell);
      expect(error.availableQuantity.toString()).toBe('50');
    });

    it('rejects editing the MXRF11 buy of 08/01/2026 to 40 units: the sell of 50 on 22/05/2026 breaks (RN10)', () => {
      const sellOf50 = sell('2026-05-22', '50', '9.88', '0.40', {
        id: 'mxrf-sell',
      });

      const error = violationOf([
        buy('2026-01-08', '40', '10.10', '4.00'),
        sellOf50,
      ]);

      expect(error.operation.id).toBe('mxrf-sell');
      expect(error.availableQuantity.toString()).toBe('40');
      expect(error.soldQuantity.toString()).toBe('50');
    });

    it('rejects deleting a buy that a later sell depends on (RN10)', () => {
      const firstBuy = buy('2026-01-05', '100', '30.00');
      const secondBuy = buy('2026-02-05', '100', '32.00');
      const bigSell = sell('2026-03-05', '150', '35.00');
      expect(calculatePosition([firstBuy, secondBuy, bigSell]).ok).toBe(true);

      const error = violationOf([firstBuy, bigSell]);

      expect(error.operation).toBe(bigSell);
      expect(error.availableQuantity.toString()).toBe('100');
    });

    it('returns the steps applied before the offending sell', () => {
      const result = calculatePosition([
        buy('2026-01-05', '10', '10.00'),
        sell('2026-01-06', '4', '12.00'),
        sell('2026-01-07', '7', '12.00'),
      ]);

      expect(result.ok).toBe(false);
      expect(result.steps.map((step) => step.item.type)).toEqual([
        'BUY',
        'SELL',
      ]);
    });
  });

  describe('chronological order (RN09)', () => {
    it('sorts the timeline by date, whatever the input order', () => {
      const position = positionOf([
        sell('2026-06-02', '50', '38.00', '4.90'),
        buy('2026-03-14', '50', '36.00', '4.90'),
        buy('2026-01-05', '100', '29.95', '5.00'),
      ]);

      expect(position.realizedProfit.toFixed(2)).toBe('293.47');
    });

    it('orders operations of the same date by sequence', () => {
      const sameDayBuy = buy('2026-01-05', '10', '10.00', '0', {
        sequence: 1n,
      });
      const sameDaySell = sell('2026-01-05', '10', '11.00', '0', {
        sequence: 2n,
      });

      expect(calculatePosition([sameDaySell, sameDayBuy]).ok).toBe(true);
      expect(
        calculatePosition([
          buy('2026-01-05', '10', '10.00', '0', { sequence: 2n }),
          sell('2026-01-05', '10', '11.00', '0', { sequence: 1n }),
        ]).ok,
      ).toBe(false);
    });

    it('applies a corporate event before the operations of its ex-date (D29)', () => {
      const position = positionOf([
        buy('2026-01-05', '100', '30.00'),
        sell('2026-02-01', '150', '20.00'),
        split('2026-02-01', '1', '2'),
      ]);

      expect(position.quantity.toString()).toBe('50');
    });
  });

  it('adds up the same asset bought in different brokers of the portfolio (RN12)', () => {
    const position = positionOf([
      buy('2026-01-05', '100', '30.00', '5.00', { brokerId: 'broker-xp' }),
      buy('2026-01-06', '100', '31.00', '5.00', { brokerId: 'broker-rico' }),
      sell('2026-01-07', '150', '32.00', '0', { brokerId: 'broker-xp' }),
    ]);

    expect(summary(position)).toEqual({
      quantity: '50',
      averagePrice: '30.5500',
      totalCost: '1527.50',
      realizedProfit: '217.50',
    });
  });

  describe('precision (RN11)', () => {
    it('keeps prices with many decimal places exact', () => {
      const position = positionOf([
        buy('2026-01-05', '3', '10.123456789', '0.000001'),
        buy('2026-01-06', '7', '0.10000001'),
      ]);

      // (30.370370367 + 0.000001 + 0.70000007) ÷ 10
      expect(position.averagePrice.toString()).toBe('3.1070371437');
    });

    it('carries repeating fractions without losing the total', () => {
      const position = positionOf([
        buy('2026-01-05', '3', '1.00', '1.00'),
        sell('2026-01-06', '3', '2.00'),
      ]);

      // PM = 4 ÷ 3; profit = 6 − 3 × 4/3 = 2
      expect(position.realizedProfit.toFixed(12)).toBe('2.000000000000');
    });

    it('sells part of a fractional position and rejects selling 0.00000001 more than held (RN07, D44)', () => {
      const position = positionOf([
        buy('2026-08-15', '0.0125', '328000.00'),
        sell('2026-08-20', '0.005', '330000.00'),
      ]);
      expect(summary(position)).toMatchObject({
        quantity: '0.0075',
        totalCost: '2460.00',
        realizedProfit: '10.00',
      });

      const error = violationOf([
        buy('2026-08-15', '0.0125', '328000.00'),
        sell('2026-08-20', '0.01250001', '330000.00'),
      ]);
      expect(error.availableQuantity.toString()).toBe('0.0125');
    });

    it('works with fractional quantities (cripto, S11/D44)', () => {
      expect(
        summary(positionOf([buy('2026-08-15', '0.0125', '328000.00')])),
      ).toEqual({
        quantity: '0.0125',
        averagePrice: '328000.0000',
        totalCost: '4100.00',
        realizedProfit: '0.00',
      });
    });
  });

  describe('corporate events (D29)', () => {
    it('split before a sell: doubles the units, halves the PM, keeps the total cost', () => {
      const beforeSale = positionOf([
        buy('2026-01-05', '100', '30.00'),
        split('2026-02-01', '1', '2'),
      ]);
      expect(summary(beforeSale)).toMatchObject({
        quantity: '200',
        averagePrice: '15.0000',
        totalCost: '3000.00',
      });

      const afterSale = positionOf([
        buy('2026-01-05', '100', '30.00'),
        split('2026-02-01', '1', '2'),
        sell('2026-03-01', '50', '20.00'),
      ]);
      expect(afterSale.realizedProfit.toFixed(2)).toBe('250.00');
      expect(afterSale.totalCost.toFixed(2)).toBe('2250.00');
    });

    it('split after a sell: applies to the remaining units only, keeping their cost', () => {
      const position = positionOf([
        buy('2026-01-05', '100', '30.00'),
        sell('2026-02-01', '40', '35.00'),
        split('2026-03-01', '1', '3'),
      ]);

      expect(summary(position)).toEqual({
        quantity: '180',
        averagePrice: '10.0000',
        totalCost: '1800.00',
        realizedProfit: '200.00',
      });
    });

    // Keeps the fraction as calculated. Whether fractions of whole-unit classes are truncated (B3 sells them at auction)
    // is an open S2 decision (contexto-projeto.md, pendências); this test documents the current behavior.
    it('split with a non-integer factor keeps the total cost (D29)', () => {
      const position = positionOf([
        buy('2026-01-05', '7', '30.00'),
        split('2026-02-01', '2', '3'),
      ]);

      expect(position.quantity.toString()).toBe('10.5');
      expect(position.totalCost.toFixed(2)).toBe('210.00');
    });

    it('reverse split before a sell: divides the units, multiplies the PM, keeps the total cost', () => {
      const position = positionOf([
        buy('2026-01-05', '1000', '1.50', '10.00'),
        reverseSplit('2026-02-01', '10', '1'),
      ]);
      expect(summary(position)).toMatchObject({
        quantity: '100',
        averagePrice: '15.1000',
        totalCost: '1510.00',
      });

      const sold = positionOf([
        buy('2026-01-05', '1000', '1.50', '10.00'),
        reverseSplit('2026-02-01', '10', '1'),
        sell('2026-03-01', '100', '16.00'),
      ]);
      expect(sold.realizedProfit.toFixed(2)).toBe('90.00');
    });

    it('reverse split with a ratio that does not divide evenly in decimals stays exact', () => {
      const position = positionOf([
        buy('2026-01-05', '300', '1.00'),
        reverseSplit('2026-02-01', '3', '1'),
      ]);

      expect(position.quantity.toString()).toBe('100');
      expect(position.averagePrice.toString()).toBe('3');
    });

    it('reverse split after a sell', () => {
      const position = positionOf([
        buy('2026-01-05', '1000', '1.50', '10.00'),
        sell('2026-01-20', '500', '2.00'),
        reverseSplit('2026-02-01', '10', '1'),
      ]);

      // profit = 1000 − 500 × 1.51; remaining cost 755 kept over 50 units
      expect(summary(position)).toEqual({
        quantity: '50',
        averagePrice: '15.1000',
        totalCost: '755.00',
        realizedProfit: '245.00',
      });
    });

    it('bonus adds the new units at the bonus unit cost (D29)', () => {
      const position = positionOf([
        buy('2026-01-05', '100', '30.00'),
        bonus('2026-02-01', '10', '11', '5.00'),
      ]);

      // 10 new units × 5.00 added to 3000
      expect(summary(position)).toMatchObject({
        quantity: '110',
        totalCost: '3050.00',
        averagePrice: '27.7273',
      });
    });

    it('bonus before a sell: the sell uses the PM diluted by the bonus (D29, RN06)', () => {
      const position = positionOf([
        buy('2026-01-05', '100', '30.00'),
        bonus('2026-02-01', '10', '11', '5.00'),
        sell('2026-03-01', '55', '30.00'),
      ]);

      // 1650 − 55 × (3050 ÷ 110) = 125
      expect(summary(position)).toEqual({
        quantity: '55',
        averagePrice: '27.7273',
        totalCost: '1525.00',
        realizedProfit: '125.00',
      });
    });

    it('bonus after a sell: only the remaining units receive it', () => {
      const position = positionOf([
        buy('2026-01-05', '100', '30.00'),
        sell('2026-01-20', '50', '40.00'),
        bonus('2026-02-01', '10', '11', '5.00'),
      ]);

      expect(summary(position)).toEqual({
        quantity: '55',
        averagePrice: '27.7273',
        totalCost: '1525.00',
        realizedProfit: '500.00',
      });
    });

    it('bonus at zero cost keeps the total cost', () => {
      const position = positionOf([
        buy('2026-01-05', '100', '30.00'),
        bonus('2026-02-01', '10', '11', '0'),
      ]);

      expect(position.totalCost.toFixed(2)).toBe('3000.00');
    });

    it('changes nothing when no units are held on the ex-date', () => {
      const result = calculatePosition([
        split('2026-01-01', '1', '2'),
        buy('2026-01-05', '10', '10.00'),
      ]);

      expect(result.ok).toBe(true);
      expect(result.steps[0].after.quantity.toString()).toBe('0');
      expect(
        summary(
          positionOf([
            split('2026-01-01', '1', '2'),
            buy('2026-01-05', '10', '10.00'),
          ]),
        ),
      ).toMatchObject({
        quantity: '10',
        averagePrice: '10.0000',
      });
    });
  });

  it('sums the realized profit of every sell, gains and losses, across a close and rebuy (RN06, RN08)', () => {
    const result = calculatePosition([
      buy('2026-01-05', '100', '10.00'),
      sell('2026-02-01', '30', '12.00'),
      sell('2026-03-01', '70', '9.00'),
      buy('2026-04-01', '10', '20.00'),
      sell('2026-05-01', '10', '25.00'),
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(summary(result.position)).toEqual({
        quantity: '0',
        averagePrice: '0.0000',
        totalCost: '0.00',
        realizedProfit: '40.00',
      });
    }
    expect(
      result.steps.flatMap((step) =>
        step.realizedProfit ? [step.realizedProfit.toFixed(2)] : [],
      ),
    ).toEqual(['60.00', '-70.00', '50.00']);
  });

  it('does not modify the input array, so the preview and the commit can share it (RN09, D42)', () => {
    const laterSell = sell('2026-02-01', '1', '11.00');
    const earlierBuy = buy('2026-01-05', '1', '10.00');
    const items = [laterSell, earlierBuy];

    calculatePosition(items);

    expect(items).toEqual([laterSell, earlierBuy]);
  });

  it.each([
    ['operation', { kind: 'operation', type: 'TRANSFER' }],
    ['corporate event', { kind: 'corporate-event', type: 'AMORTIZATION' }],
  ])('refuses an %s that was not built by the factories', (_case, forged) => {
    const held = buy('2026-01-05', '10', '10.00');
    const item = {
      ...forged,
      id: 'forged',
      // After the buy, so units are held and the item reaches the type switch.
      date: LocalDate.parse('2026-02-01'),
      sequence: 99n,
      ratioFrom: held.quantity.value,
      ratioTo: held.quantity.value,
    } as unknown as TimelineItem;

    expect(() => calculatePosition([held, item])).toThrow(TypeError);
  });

  describe('steps (trace of "como foi calculado", D26, and preview, D42)', () => {
    it('records the state before and after each item and the profit of each sell', () => {
      const result = calculatePosition([
        buy('2026-01-05', '100', '29.95', '5.00'),
        sell('2026-02-01', '40', '32.00', '1.00'),
      ]) as Extract<PositionCalculation, { ok: true }>;

      const [buyStep, sellStep] = result.steps;
      expect(buyStep.before.quantity.toString()).toBe('0');
      expect(buyStep.after.averagePrice.toFixed(2)).toBe('30.00');
      expect(buyStep.realizedProfit).toBeNull();
      // avgPriceAtSale of REALIZED_PROFIT is the PM before the sell
      expect(sellStep.before.averagePrice.toFixed(2)).toBe('30.00');
      expect(sellStep.after.quantity.toString()).toBe('60');
      expect(sellStep.realizedProfit?.toFixed(2)).toBe('79.00');
    });

    it('records corporate events as steps without profit', () => {
      const result = calculatePosition([
        buy('2026-01-05', '10', '10.00'),
        split('2026-02-01', '1', '2'),
      ]);

      expect(result.steps[1]).toMatchObject({ realizedProfit: null });
      expect(result.steps[1].after.quantity.toString()).toBe('20');
    });
  });

  describe('9-operation dataset of the S1 screens (claude/handoff-ux.md, Longo prazo portfolio)', () => {
    // Operations of the "Histórico — com dados" frame (Figma node 19:548), grouped by asset.
    const timelines: Record<string, TimelineItem[]> = {
      PETR4: [
        buy('2026-01-05', '100', '29.95', '5.00'),
        buy('2026-03-14', '50', '36.00', '4.90'),
        sell('2026-06-02', '50', '38.00', '4.90'),
      ],
      WEGE3: [
        buy('2026-01-05', '40', '36.00', '4.90'),
        sell('2026-02-10', '40', '46.55', '4.30'),
      ],
      MXRF11: [
        buy('2026-01-08', '200', '10.10', '4.00', { brokerId: 'broker-nu' }),
        sell('2026-05-22', '50', '9.88', '0.40', { brokerId: 'broker-nu' }),
      ],
      ITSA4: [
        buy('2026-01-20', '300', '9.85', '6.00', { brokerId: 'broker-rico' }),
      ],
      BOVA11: [
        buy('2026-10-28', '20', '118.30', '3.00', { brokerId: 'broker-rico' }),
      ],
    };
    const positions = Object.fromEntries(
      Object.entries(timelines).map(([ticker, items]) => [
        ticker,
        positionOf(items),
      ]),
    );

    it('has the 9 operations of the frame', () => {
      expect(Object.values(timelines).flat()).toHaveLength(9);
    });

    it.each([
      [
        'PETR4',
        {
          quantity: '100',
          averagePrice: '32.03',
          totalCost: '3203.27',
          realizedProfit: '293.47',
        },
      ],
      [
        'ITSA4',
        {
          quantity: '300',
          averagePrice: '9.87',
          totalCost: '2961.00',
          realizedProfit: '0.00',
        },
      ],
      [
        'BOVA11',
        {
          quantity: '20',
          averagePrice: '118.45',
          totalCost: '2369.00',
          realizedProfit: '0.00',
        },
      ],
      [
        'MXRF11',
        {
          quantity: '150',
          averagePrice: '10.12',
          totalCost: '1518.00',
          realizedProfit: '-12.40',
        },
      ],
      [
        'WEGE3',
        {
          quantity: '0',
          averagePrice: '0.00',
          totalCost: '0.00',
          realizedProfit: '412.80',
        },
      ],
    ])('%s matches the screens', (ticker, expected) => {
      const position = positions[ticker];
      expect({
        quantity: position.quantity.toString(),
        averagePrice: position.averagePrice.toFixed(2),
        totalCost: position.totalCost.toFixed(2),
        realizedProfit: position.realizedProfit.toFixed(2),
      }).toEqual(expected);
    });

    it('totals R$ 10.051,27 of cost and + R$ 693,87 of realized profit', () => {
      const all = Object.values(positions);
      const totalCost = all.reduce(
        (sum, p) => sum.plus(p.totalCost),
        Money.zero(),
      );
      const realizedProfit = all.reduce(
        (sum, p) => sum.plus(p.realizedProfit),
        Money.zero(),
      );

      expect(totalCost.toFixed(2)).toBe('10051.27');
      expect(realizedProfit.toFixed(2)).toBe('693.87');
    });
  });
});

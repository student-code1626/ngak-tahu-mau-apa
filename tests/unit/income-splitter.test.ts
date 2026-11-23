import { describe, it, expect } from 'vitest';
import { Money } from '@/domain/money/money';
import { splitIncome } from '@/domain/split/income-splitter';

describe('Income Splitter & Penny-Rounding Invariant', () => {
  it('splits routine income with default 40/45/15 rules exactly', () => {
    const amount = Money.from(10000000); // Rp 10.000.000
    const result = splitIncome(amount, 'ROUTINE');

    expect(result.isNonIncome).toBe(false);

    const living = result.allocations.find((a) => a.pos === 'LIVING')?.amount;
    const playing = result.allocations.find((a) => a.pos === 'PLAYING')?.amount;
    const emergency = result.allocations.find((a) => a.pos === 'EMERGENCY')?.amount;
    const savings = result.allocations.find((a) => a.pos === 'SAVINGS')?.amount;
    const invest = result.allocations.find((a) => a.pos === 'INVESTMENT')?.amount;
    const goals = result.allocations.find((a) => a.pos === 'GOALS')?.amount;

    // Routine 40/45/15:
    // Living: 45% = 4.500.000
    // Playing: 15% = 1.500.000
    // Saving: 40% = 4.000.000
    //   Emergency: 50% of 4.000.000 = 2.000.000
    //   Savings: 20% of 4.000.000 = 800.000
    //   Investment: 20% of 4.000.000 = 800.000
    //   Goals: 10% of 4.000.000 = 400.000
    expect(living?.toString()).toBe('4500000');
    expect(playing?.toString()).toBe('1500000');
    expect(emergency?.toString()).toBe('2000000');
    expect(savings?.toString()).toBe('800000');
    expect(invest?.toString()).toBe('800000');
    expect(goals?.toString()).toBe('400000');

    // Invariant check: Sum of all allocations === originalAmount
    const totalAllocated = result.allocations.reduce(
      (acc, a) => acc.plus(a.amount),
      Money.zero()
    );
    expect(totalAllocated.equals(amount)).toBe(true);

    // Two layers total check
    expect(result.layerMonthTotal.plus(result.layerStoredTotal).equals(amount)).toBe(true);
  });

  it('splits irregular income with default 70/20/10 rules exactly', () => {
    const amount = Money.from(5000000); // Rp 5.000.000
    const result = splitIncome(amount, 'IRREGULAR');

    const living = result.allocations.find((a) => a.pos === 'LIVING')?.amount;
    const playing = result.allocations.find((a) => a.pos === 'PLAYING')?.amount;
    const emergency = result.allocations.find((a) => a.pos === 'EMERGENCY')?.amount;

    // Irregular: Living 20% = 1.000.000, Playing 10% = 500.000, Saving 70% = 3.500.000
    // Emergency: 50% of 3.500.000 = 1.750.000
    expect(living?.toString()).toBe('1000000');
    expect(playing?.toString()).toBe('500000');
    expect(emergency?.toString()).toBe('1750000');

    const totalAllocated = result.allocations.reduce(
      (acc, a) => acc.plus(a.amount),
      Money.zero()
    );
    expect(totalAllocated.equals(amount)).toBe(true);
  });

  it('guarantees penny-rounding invariant on odd nominal amounts without missing a single Rupiah', () => {
    const oddAmounts = [
      Money.from('3333333'),
      Money.from('10000001'),
      Money.from('7777777'),
      Money.from('1234567'),
      Money.from('99'),
    ];

    for (const oddAmount of oddAmounts) {
      const routineResult = splitIncome(oddAmount, 'ROUTINE');
      const routineSum = routineResult.allocations.reduce(
        (acc, a) => acc.plus(a.amount),
        Money.zero()
      );
      expect(routineSum.equals(oddAmount)).toBe(true);

      const irregularResult = splitIncome(oddAmount, 'IRREGULAR');
      const irregularSum = irregularResult.allocations.reduce(
        (acc, a) => acc.plus(a.amount),
        Money.zero()
      );
      expect(irregularSum.equals(oddAmount)).toBe(true);
    }
  });

  it('handles NON_INCOME without splitting or affecting budget pools', () => {
    const amount = Money.from(2500000);
    const result = splitIncome(amount, 'NON_INCOME');

    expect(result.isNonIncome).toBe(true);
    expect(result.allocations.length).toBe(0);
    expect(result.layerMonthTotal.isZero()).toBe(true);
    expect(result.layerStoredTotal.isZero()).toBe(true);
  });
});


import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

describe('Phase 1 Foundation & Decimal Precision Check', () => {
  it('handles floating point arithmetic precisely without precision loss', () => {
    // Classic JavaScript float bug: 0.1 + 0.2 !== 0.3
    const standardFloat = 0.1 + 0.2;
    expect(standardFloat).not.toBe(0.3);

    // WiseFinance Decimal precision: exactly 0.3
    const a = new Decimal('0.1');
    const b = new Decimal('0.2');
    const sum = a.plus(b);
    expect(sum.toString()).toBe('0.3');
  });

  it('guarantees two-layer invariant equality check', () => {
    // Total Dompet = Uang Bulan Ini (Living + Playing) + Uang Tersimpan (Emergency + Savings + Investment + Goals)
    const living = new Decimal('4500000');
    const playing = new Decimal('1500000');
    const emergency = new Decimal('2000000');
    const savings = new Decimal('800000');
    const investment = new Decimal('800000');
    const goals = new Decimal('400000');

    const monthLayer = living.plus(playing); // 6,000,000
    const storedLayer = emergency.plus(savings).plus(investment).plus(goals); // 4,000,000
    const totalPos = monthLayer.plus(storedLayer); // 10,000,000

    const totalWallets = new Decimal('10000000');

    expect(totalPos.equals(totalWallets)).toBe(true);
    expect(totalWallets.minus(totalPos).isZero()).toBe(true);
  });
});


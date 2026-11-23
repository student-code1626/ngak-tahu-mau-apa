import { describe, it, expect } from 'vitest';
import { Money } from '@/domain/money/money';

describe('Money Value Object', () => {
  it('creates money from number, string, and Decimal', () => {
    const m1 = Money.from(1000);
    const m2 = Money.from('1000');
    expect(m1.equals(m2)).toBe(true);
    expect(m1.toString()).toBe('1000');
  });

  it('performs exact addition and subtraction without float artifacts', () => {
    // 0.1 + 0.2 = 0.3
    const a = Money.from('0.1');
    const b = Money.from('0.2');
    const sum = a.plus(b);
    expect(sum.toString()).toBe('0.3');

    // 1000000 - 350000.5 = 649999.5
    const c = Money.from(1000000);
    const diff = c.minus('350000.5');
    expect(diff.toString()).toBe('649999.5');
  });

  it('multiplies and divides with financial precision', () => {
    const m = Money.from(1000000);
    const half = m.dividedBy(2);
    expect(half.toString()).toBe('500000');

    const fortyFivePct = m.times(0.45);
    expect(fortyFivePct.toString()).toBe('450000');
  });

  it('throws error when dividing by zero', () => {
    const m = Money.from(1000);
    expect(() => m.dividedBy(0)).toThrow('Division by zero in Money calculation');
  });

  it('formats Indonesian Rupiah properly', () => {
    const m = Money.from(1500000);
    expect(m.format('IDR')).toBe('Rp 1.500.000');
  });

  it('supports comparisons accurately', () => {
    const m1 = Money.from(500);
    const m2 = Money.from(1000);

    expect(m1.lessThan(m2)).toBe(true);
    expect(m2.greaterThan(m1)).toBe(true);
    expect(m1.equals(500)).toBe(true);
    expect(Money.zero().isZero()).toBe(true);
  });
});


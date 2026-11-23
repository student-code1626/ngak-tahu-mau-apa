import { describe, it, expect } from 'vitest';
import { Money } from '@/domain/money/money';
import { checkTwoLayerInvariant, checkTransactionAtomicity } from '@/domain/rules/invariant-checker';

describe('Invariant Checker', () => {
  it('confirms balanced state when Total Wallets equals Layer 1 + Layer 2', () => {
    const wallets = [
      { cachedBal: Money.from(7000000) },
      { cachedBal: Money.from(2000000) },
      { cachedBal: Money.from(1000000) },
    ]; // Total = 10,000,000

    const posBalances = {
      living: Money.from(4500000),
      playing: Money.from(1500000), // Layer 1 = 6,000,000
      emergency: Money.from(2000000),
      savings: Money.from(1000000),
      investment: Money.from(500000),
      goals: Money.from(500000), // Layer 2 = 4,000,000
    };

    const result = checkTwoLayerInvariant(wallets, posBalances);
    expect(result.isBalanced).toBe(true);
    expect(result.diff.isZero()).toBe(true);
    expect(result.totalWallets.equals(result.totalPos)).toBe(true);
  });

  it('detects discrepancy and calculates exact diff when an unallocated balance exists', () => {
    const wallets = [
      { cachedBal: Money.from(10000000) },
    ];

    const posBalances = {
      living: Money.from(4000000),
      playing: Money.from(1000000),
      emergency: Money.from(2000000),
      savings: Money.from(1000000),
      investment: Money.from(500000),
      goals: Money.from(500000), // Total Pos = 9,000,000 -> Diff = 1,000,000
    };

    const result = checkTwoLayerInvariant(wallets, posBalances);
    expect(result.isBalanced).toBe(false);
    expect(result.diff.toString()).toBe('1000000');
    expect(result.message).toContain('Peringatan: Selisih saldo terdeteksi');
  });

  it('validates transaction atomicity when wallet entries match pos entries', () => {
    const walletEntries = [
      { amountBase: Money.from(-500000) },
    ];
    const posEntries = [
      { amountBase: Money.from(500000) },
    ];

    const check = checkTransactionAtomicity(walletEntries, posEntries);
    expect(check.isAtomic).toBe(true);
    expect(check.diff.isZero()).toBe(true);
  });
});


import { describe, it, expect } from 'vitest';
import { Money } from '@/domain/money/money';
import { splitIncome } from '@/domain/split/income-splitter';
import { checkTwoLayerInvariant, checkTransactionAtomicity } from '@/domain/rules/invariant-checker';
import { evaluatePeriodBudget, resolvePeriodClose } from '@/domain/period/period-evaluator';
import { evaluateEmergencyExpense } from '@/domain/rules/emergency-evaluator';

describe('End-to-End Ledger Financial Lifecycle Audit (Fase 10)', () => {
  it('maintains strict two-layer invariant across a complete sequence of user actions', () => {
    // -------------------------------------------------------------------------
    // 1. Initial State after Onboarding:
    // Wallet: BCA (8,000,000), GoPay (2,000,000) -> Total Wallets = 10,000,000
    // Pos Allocations:
    //   Living: 4,000,000
    //   Playing: 1,500,000
    //   Emergency: 2,500,000
    //   Savings: 1,000,000
    //   Investment: 600,000
    //   Goals: 400,000
    // -------------------------------------------------------------------------
    const wallets = [
      { id: 'bca', cachedBal: Money.from(8000000) },
      { id: 'gopay', cachedBal: Money.from(2000000) },
    ];

    const pos = {
      living: Money.from(4000000),
      playing: Money.from(1500000),
      emergency: Money.from(2500000),
      savings: Money.from(1000000),
      investment: Money.from(600000),
      goals: Money.from(400000),
    };

    let check = checkTwoLayerInvariant(wallets, pos);
    expect(check.isBalanced).toBe(true);
    expect(check.totalWallets.toString()).toBe('10000000');
    expect(check.diff.isZero()).toBe(true);

    // -------------------------------------------------------------------------
    // 2. Action: Receive Monthly Salary (Routine Income: Rp 10.000.000) to BCA
    // Split 40/45/15:
    //   Living (+4,500,000) -> 8,500,000
    //   Playing (+1,500,000) -> 3,000,000
    //   Saving (+4,000,000):
    //     Emergency (+2,000,000) -> 4,500,000
    //     Savings (+800,000) -> 1,800,000
    //     Investment (+800,000) -> 1,400,000
    //     Goals (+400,000) -> 800,000
    // BCA (+10,000,000) -> 18,000,000
    // -------------------------------------------------------------------------
    const salary = Money.from(10000000);
    const split = splitIncome(salary, 'ROUTINE');

    wallets[0].cachedBal = wallets[0].cachedBal.plus(salary);
    for (const alloc of split.allocations) {
      if (alloc.pos === 'LIVING') pos.living = pos.living.plus(alloc.amount);
      if (alloc.pos === 'PLAYING') pos.playing = pos.playing.plus(alloc.amount);
      if (alloc.pos === 'EMERGENCY') pos.emergency = pos.emergency.plus(alloc.amount);
      if (alloc.pos === 'SAVINGS') pos.savings = pos.savings.plus(alloc.amount);
      if (alloc.pos === 'INVESTMENT') pos.investment = pos.investment.plus(alloc.amount);
      if (alloc.pos === 'GOALS') pos.goals = pos.goals.plus(alloc.amount);
    }

    check = checkTwoLayerInvariant(wallets, pos);
    expect(check.isBalanced).toBe(true);
    expect(check.totalWallets.toString()).toBe('20000000');

    // -------------------------------------------------------------------------
    // 3. Action: Expense - Belanja Bulanan (Rp 2.500.000) from BCA / Pos Living
    // BCA (-2,500,000) -> 15,500,000
    // Living (-2,500,000) -> 6,000,000
    // -------------------------------------------------------------------------
    const belanja = Money.from(2500000);
    wallets[0].cachedBal = wallets[0].cachedBal.minus(belanja);
    pos.living = pos.living.minus(belanja);

    check = checkTwoLayerInvariant(wallets, pos);
    expect(check.isBalanced).toBe(true);
    expect(check.totalWallets.toString()).toBe('17500000');

    // -------------------------------------------------------------------------
    // 4. Action: Transfer Antar Dompet with Admin Fee (Rp 500.000 from BCA to GoPay, fee Rp 2.500)
    // Fee Rp 2.500 debited to Pos Living
    // BCA: -502,500 -> 14,997,500
    // GoPay: +500,000 -> 2,500,000
    // Living: -2,500 -> 5,997,500
    // -------------------------------------------------------------------------
    const transferAmt = Money.from(500000);
    const fee = Money.from(2500);

    wallets[0].cachedBal = wallets[0].cachedBal.minus(transferAmt.plus(fee));
    wallets[1].cachedBal = wallets[1].cachedBal.plus(transferAmt);
    pos.living = pos.living.minus(fee);

    check = checkTwoLayerInvariant(wallets, pos);
    expect(check.isBalanced).toBe(true);
    expect(check.totalWallets.toString()).toBe('17497500');

    // -------------------------------------------------------------------------
    // 5. Action: Transfer Antar Bucket (Rp 500.000 from Playing to Savings)
    // Wallets unchanged!
    // Playing: -500,000 -> 2,500,000
    // Savings: +500,000 -> 2,300,000
    // -------------------------------------------------------------------------
    const bucketAmt = Money.from(500000);
    pos.playing = pos.playing.minus(bucketAmt);
    pos.savings = pos.savings.plus(bucketAmt);

    check = checkTwoLayerInvariant(wallets, pos);
    expect(check.isBalanced).toBe(true);
    expect(check.totalWallets.toString()).toBe('17497500');

    // -------------------------------------------------------------------------
    // 6. Action: Adjustment / Cocokkan Saldo (GoPay has missing Rp 20.000)
    // GoPay actual = 2,480,000 (shortfall = 20,000 charged to Playing)
    // GoPay: 2,480,000
    // Playing: -20,000 -> 2,480,000
    // -------------------------------------------------------------------------
    wallets[1].cachedBal = Money.from(2480000);
    pos.playing = pos.playing.minus(20000);

    check = checkTwoLayerInvariant(wallets, pos);
    expect(check.isBalanced).toBe(true);
    expect(check.totalWallets.toString()).toBe('17477500');

    // -------------------------------------------------------------------------
    // 7. Action: Voiding an erroneous expense of Rp 1.000.000 from Living
    // Reversing entries: BCA (+1,000,000), Living (+1,000,000)
    // -------------------------------------------------------------------------
    wallets[0].cachedBal = wallets[0].cachedBal.plus(1000000);
    pos.living = pos.living.plus(1000000);

    check = checkTwoLayerInvariant(wallets, pos);
    expect(check.isBalanced).toBe(true);
    expect(check.totalWallets.toString()).toBe('18477500');
  });
});


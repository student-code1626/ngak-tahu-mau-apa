import { describe, it, expect } from 'vitest';
import { Money } from '@/domain/money/money';
import { evaluatePeriodBudget, resolvePeriodClose } from '@/domain/period/period-evaluator';

describe('Period Budget Evaluator', () => {
  it('calculates remaining budgets correctly when within limits', () => {
    const status = evaluatePeriodBudget(
      4500000, // Living budget
      1500000, // Playing budget
      3000000, // Living spent
      1000000  // Playing spent
    );

    expect(status.livingRemaining.toString()).toBe('1500000');
    expect(status.playingRemaining.toString()).toBe('500000');
    expect(status.isLivingDeficit).toBe(false);
    expect(status.isOverBudget).toBe(false);
    expect(status.totalRemaining.toString()).toBe('2000000');
  });

  it('detects living deficit and marks over-budget without blocking', () => {
    const status = evaluatePeriodBudget(
      4500000,
      1500000,
      5000000, // Living spent 5M (exceeds 4.5M)
      1200000
    );

    expect(status.isLivingDeficit).toBe(true);
    expect(status.isOverBudget).toBe(true);
    expect(status.livingRemaining.toString()).toBe('-500000');
  });

  it('resolves period close options when there is a surplus', () => {
    const status = evaluatePeriodBudget(4500000, 1500000, 4000000, 1000000);
    const resolution = resolvePeriodClose(status);

    expect(resolution.hasLivingDeficit).toBe(false);
    expect(resolution.hasSurplus).toBe(true);
    expect(resolution.totalSurplusAmount.toString()).toBe('1000000'); // 500k living + 500k playing
  });

  it('resolves period close options when there is a living deficit', () => {
    const status = evaluatePeriodBudget(4500000, 1500000, 4800000, 1000000);
    const resolution = resolvePeriodClose(status);

    expect(resolution.hasLivingDeficit).toBe(true);
    expect(resolution.livingDeficitAmount.toString()).toBe('300000');
  });
});


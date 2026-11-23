import { Money } from '../money/money';

export interface PeriodBudgetStatus {
  livingBudget: Money;
  playingBudget: Money;
  livingSpent: Money;
  playingSpent: Money;
  livingRemaining: Money;
  playingRemaining: Money;
  isLivingDeficit: boolean;
  isPlayingDeficit: boolean;
  isOverBudget: boolean;
  totalRemaining: Money;
}

/**
 * Section 5.3 & 5.5: Evaluates the budget status for an active period.
 */
export function evaluatePeriodBudget(
  livingBudget: Money | number | string,
  playingBudget: Money | number | string,
  livingSpent: Money | number | string,
  playingSpent: Money | number | string
): PeriodBudgetStatus {
  const lBudget = Money.from(livingBudget);
  const pBudget = Money.from(playingBudget);
  const lSpent = Money.from(livingSpent);
  const pSpent = Money.from(playingSpent);

  const livingRemaining = lBudget.minus(lSpent);
  const playingRemaining = pBudget.minus(pSpent);

  const isLivingDeficit = livingRemaining.isNegative();
  const isPlayingDeficit = playingRemaining.isNegative();
  const isOverBudget = isLivingDeficit || isPlayingDeficit;

  const totalRemaining = livingRemaining.plus(playingRemaining);

  return {
    livingBudget: lBudget,
    playingBudget: pBudget,
    livingSpent: lSpent,
    playingSpent: pSpent,
    livingRemaining,
    playingRemaining,
    isLivingDeficit,
    isPlayingDeficit,
    isOverBudget,
    totalRemaining,
  };
}

export type PeriodCloseResolution =
  | { type: 'SURPLUS_LEFTOVER'; targetSavingBucket: 'EMERGENCY' | 'SAVINGS' | 'INVESTMENT' | 'GOALS'; amount: Money }
  | { type: 'DEFICIT_COVERED'; sourceBucket: 'PLAYING' | 'SAVINGS' | 'EMERGENCY'; amount: Money };

/**
 * Section 5.5: Calculates resolution options when closing a period.
 */
export function resolvePeriodClose(status: PeriodBudgetStatus): {
  hasLivingDeficit: boolean;
  hasSurplus: boolean;
  livingDeficitAmount: Money;
  totalSurplusAmount: Money;
} {
  const hasLivingDeficit = status.isLivingDeficit;
  const livingDeficitAmount = hasLivingDeficit ? status.livingRemaining.abs() : Money.zero();

  let totalSurplusAmount = Money.zero();
  if (status.livingRemaining.isPositive()) {
    totalSurplusAmount = totalSurplusAmount.plus(status.livingRemaining);
  }
  if (status.playingRemaining.isPositive()) {
    totalSurplusAmount = totalSurplusAmount.plus(status.playingRemaining);
  }

  const hasSurplus = totalSurplusAmount.isPositive();

  return {
    hasLivingDeficit,
    hasSurplus,
    livingDeficitAmount,
    totalSurplusAmount,
  };
}


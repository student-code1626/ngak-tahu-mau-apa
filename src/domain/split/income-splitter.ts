import { Money } from '../money/money';

export type IncomeType = 'ROUTINE' | 'IRREGULAR' | 'TRANSFER_IN' | 'NON_INCOME';

export interface IncomeSplitRule {
  savingPct: number;
  livingPct: number;
  playingPct: number;
  emergencyPct: number;
  savingsPct: number;
  investPct: number;
  goalsPct: number;
}

export const DEFAULT_ROUTINE_RULE: IncomeSplitRule = {
  savingPct: 40,
  livingPct: 45,
  playingPct: 15,
  emergencyPct: 50,
  savingsPct: 20,
  investPct: 20,
  goalsPct: 10,
};

export const DEFAULT_IRREGULAR_RULE: IncomeSplitRule = {
  savingPct: 70,
  livingPct: 20,
  playingPct: 10,
  emergencyPct: 50,
  savingsPct: 20,
  investPct: 20,
  goalsPct: 10,
};

export interface PosAllocationResult {
  pos: 'LIVING' | 'PLAYING' | 'EMERGENCY' | 'SAVINGS' | 'INVESTMENT' | 'GOALS';
  amount: Money;
  percentage: number;
  label: string;
}

export interface IncomeSplitOutput {
  incomeType: IncomeType;
  originalAmount: Money;
  isNonIncome: boolean;
  allocations: PosAllocationResult[];
  layerMonthTotal: Money;
  layerStoredTotal: Money;
}

/**
 * Pure domain logic: Split income according to rules with precise penny-rounding.
 * Invariant: Sum of all allocated parts MUST equal originalAmount down to the smallest unit.
 * Any rounding residual is allocated to the highest-weighted pos.
 */
export function splitIncome(
  amount: Money,
  incomeType: IncomeType,
  customRule?: Partial<IncomeSplitRule>
): IncomeSplitOutput {
  if (amount.isNegative() || amount.isZero()) {
    throw new Error('Income amount must be greater than zero');
  }

  // NON_INCOME does not get split (titipan, pinjaman, pelunasan teman)
  if (incomeType === 'NON_INCOME') {
    return {
      incomeType,
      originalAmount: amount,
      isNonIncome: true,
      allocations: [],
      layerMonthTotal: Money.zero(),
      layerStoredTotal: Money.zero(),
    };
  }

  const baseRule = incomeType === 'IRREGULAR' ? DEFAULT_IRREGULAR_RULE : DEFAULT_ROUTINE_RULE;
  const rule: IncomeSplitRule = { ...baseRule, ...customRule };

  // Validate main percentages equal 100
  const mainSum = rule.savingPct + rule.livingPct + rule.playingPct;
  if (Math.abs(mainSum - 100) > 0.001) {
    throw new Error(`Total persentase Saving (${rule.savingPct}%) + Living (${rule.livingPct}%) + Playing (${rule.playingPct}%) harus tepat 100%`);
  }

  // Validate saving sub-percentages equal 100
  const savingSubSum = rule.emergencyPct + rule.savingsPct + rule.investPct + rule.goalsPct;
  if (Math.abs(savingSubSum - 100) > 0.001) {
    throw new Error('Total persentase sub-saving (Dana Darurat + Tabungan + Investasi + Tujuan) harus tepat 100%');
  }

  // Calculate high-level portions
  const livingPortion = amount.times(rule.livingPct).dividedBy(100).toFloor();
  const playingPortion = amount.times(rule.playingPct).dividedBy(100).toFloor();
  const savingPortion = amount.minus(livingPortion).minus(playingPortion);

  // Split saving portion into 4 buckets
  const emergencyPortion = savingPortion.times(rule.emergencyPct).dividedBy(100).toFloor();
  const savingsPortion = savingPortion.times(rule.savingsPct).dividedBy(100).toFloor();
  const investPortion = savingPortion.times(rule.investPct).dividedBy(100).toFloor();
  // Goals gets the remainder of the saving portion to guarantee exact saving sub-sum
  const goalsPortion = savingPortion
    .minus(emergencyPortion)
    .minus(savingsPortion)
    .minus(investPortion);

  const allocations: PosAllocationResult[] = [
    { pos: 'LIVING', amount: livingPortion, percentage: rule.livingPct, label: 'Living (Kebutuhan Pokok)' },
    { pos: 'PLAYING', amount: playingPortion, percentage: rule.playingPct, label: 'Playing (Gaya Hidup)' },
    { pos: 'EMERGENCY', amount: emergencyPortion, percentage: (rule.savingPct * rule.emergencyPct) / 100, label: 'Dana Darurat' },
    { pos: 'SAVINGS', amount: savingsPortion, percentage: (rule.savingPct * rule.savingsPct) / 100, label: 'Tabungan Rutin' },
    { pos: 'INVESTMENT', amount: investPortion, percentage: (rule.savingPct * rule.investPct) / 100, label: 'Investasi' },
    { pos: 'GOALS', amount: goalsPortion, percentage: (rule.savingPct * rule.goalsPct) / 100, label: 'Tujuan Terencana' },
  ];

  // Exact penny-rounding verification
  let totalAllocated = Money.zero();
  for (const a of allocations) {
    totalAllocated = totalAllocated.plus(a.amount);
  }

  const residual = amount.minus(totalAllocated);
  if (!residual.isZero()) {
    // Add residual to the largest pos (Living or highest percentage)
    const largestPosIndex = allocations.reduce(
      (maxIdx, curr, idx, arr) => (curr.percentage > arr[maxIdx].percentage ? idx : maxIdx),
      0
    );
    allocations[largestPosIndex].amount = allocations[largestPosIndex].amount.plus(residual);
  }

  const layerMonthTotal = allocations[0].amount.plus(allocations[1].amount);
  const layerStoredTotal = allocations[2].amount
    .plus(allocations[3].amount)
    .plus(allocations[4].amount)
    .plus(allocations[5].amount);

  return {
    incomeType,
    originalAmount: amount,
    isNonIncome: false,
    allocations,
    layerMonthTotal,
    layerStoredTotal,
  };
}


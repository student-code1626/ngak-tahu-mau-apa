import { Money } from '../money/money';

export interface InvariantCheckResult {
  isBalanced: boolean;
  totalWallets: Money;
  layerMonth: Money;
  layerStored: Money;
  totalPos: Money;
  diff: Money;
  message: string;
}

/**
 * Checks the fundamental invariant of WiseFinance:
 * Total Semua Dompet (dalam mata uang utama) = Uang Bulan Ini (Living + Playing) + Uang Tersimpan (Emergency + Savings + Investment + Goals).
 * Selisih harus tepat Rp 0.
 */
export function checkTwoLayerInvariant(
  wallets: { cachedBal: Money | number | string }[],
  posBalances: {
    living: Money | number | string;
    playing: Money | number | string;
    emergency: Money | number | string;
    savings: Money | number | string;
    investment: Money | number | string;
    goals: Money | number | string;
  }
): InvariantCheckResult {
  let totalWallets = Money.zero();
  for (const w of wallets) {
    totalWallets = totalWallets.plus(Money.from(w.cachedBal));
  }

  const living = Money.from(posBalances.living);
  const playing = Money.from(posBalances.playing);
  const layerMonth = living.plus(playing);

  const emergency = Money.from(posBalances.emergency);
  const savings = Money.from(posBalances.savings);
  const investment = Money.from(posBalances.investment);
  const goals = Money.from(posBalances.goals);
  const layerStored = emergency.plus(savings).plus(investment).plus(goals);

  const totalPos = layerMonth.plus(layerStored);
  const diff = totalWallets.minus(totalPos);
  const isBalanced = diff.isZero();

  return {
    isBalanced,
    totalWallets,
    layerMonth,
    layerStored,
    totalPos,
    diff,
    message: isBalanced
      ? 'Invarian dua lapisan seimbang sempurna (Selisih: Rp 0).'
      : `Peringatan: Selisih saldo terdeteksi sebesar ${diff.abs().format('IDR')}. Total dompet (${totalWallets.format('IDR')}) tidak sama dengan total pos (${totalPos.format('IDR')}).`,
  };
}

/**
 * Checks that an atomic Transaction has matching Wallet and Pos totals.
 */
export function checkTransactionAtomicity(
  walletEntries: { amountBase: Money | number | string }[],
  posEntries: { amountBase: Money | number | string }[]
): { isAtomic: boolean; walletSum: Money; posSum: Money; diff: Money } {
  let walletSum = Money.zero();
  for (const we of walletEntries) {
    walletSum = walletSum.plus(Money.from(we.amountBase).abs());
  }

  let posSum = Money.zero();
  for (const pe of posEntries) {
    posSum = posSum.plus(Money.from(pe.amountBase).abs());
  }

  const diff = walletSum.minus(posSum);
  return {
    isAtomic: diff.isZero(),
    walletSum,
    posSum,
    diff,
  };
}


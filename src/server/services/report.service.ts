import { prisma } from '@/lib/db';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { Money } from '@/domain/money/money';

export class ReportService {
  static async getFinancialReport(userId: string) {
    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

    // 1. Wallets Total
    const wallets = await prisma.wallet.findMany({ where: { userId, isArchived: false } });
    const totalWallets = wallets.reduce((acc, w) => acc + Number(w.cachedBal), 0);

    // 2. Assets Total
    const assets = await prisma.asset.findMany({ where: { userId } });
    const totalAssets = assets.reduce((acc, a) => acc + Number(a.currentValue), 0);

    // 3. Debts Total
    const debts = await prisma.debt.findMany({ where: { userId, isClosed: false } });
    const totalDebts = debts.reduce((acc, d) => acc + Number(d.balance), 0);

    // Net Worth = Total Wallets + Total Assets - Total Debts
    const netWorth = totalWallets + totalAssets - totalDebts;

    // 4. Cashflow (Income vs Expense)
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.POSTED,
        date: { gte: sixMonthsAgo },
      },
      include: {
        category: true,
        posEntries: true,
      },
      orderBy: { date: 'asc' },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let livingSpentTotal = 0;
    let playingSpentTotal = 0;

    const monthlyTrends: { [monthKey: string]: { month: string; income: number; expense: number; living: number; playing: number } } = {};

    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('id-ID', { month: 'short' });
      monthlyTrends[key] = { month: monthLabel, income: 0, expense: 0, living: 0, playing: 0 };
    }

    const categoryBreakdown: { [catName: string]: number } = {};

    for (const tx of transactions) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const amt = Number(tx.amountBase);

      if (monthlyTrends[key]) {
        if (tx.type === TransactionType.INCOME) {
          totalIncome += amt;
          monthlyTrends[key].income += amt;
        } else if (tx.type === TransactionType.EXPENSE) {
          totalExpense += amt;
          monthlyTrends[key].expense += amt;

          const catName = tx.category?.name || 'Lainnya';
          categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + amt;

          for (const pe of tx.posEntries) {
            const posAmt = Math.abs(Number(pe.amountBase));
            if (pe.pos === 'LIVING') {
              livingSpentTotal += posAmt;
              monthlyTrends[key].living += posAmt;
            } else if (pe.pos === 'PLAYING') {
              playingSpentTotal += posAmt;
              monthlyTrends[key].playing += posAmt;
            }
          }
        }
      }
    }

    return {
      netWorth: {
        totalWallets,
        totalAssets,
        totalDebts,
        netWorth,
      },
      cashflow: {
        totalIncome,
        totalExpense,
        netCashflow: totalIncome - totalExpense,
      },
      livingVsPlaying: {
        livingSpentTotal,
        playingSpentTotal,
      },
      monthlyTrends: Object.values(monthlyTrends),
      categoryBreakdown: Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value })),
    };
  }
}


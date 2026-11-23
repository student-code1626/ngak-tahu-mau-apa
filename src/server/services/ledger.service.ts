import { prisma } from '@/lib/db';
import { PosType, TransactionStatus } from '@prisma/client';
import Decimal from 'decimal.js';
import { Money } from '@/domain/money/money';
import { checkTwoLayerInvariant } from '@/domain/rules/invariant-checker';

export class LedgerService {
  /**
   * Section 4: Returns the complete two-layer balance summary, wallet balances,
   * pos balances, and real-time invariant health status.
   */
  static async getBalanceSummary(userId: string) {
    // 1. Wallets
    const wallets = await prisma.wallet.findMany({
      where: { userId, isArchived: false },
      orderBy: { createdAt: 'asc' },
    });

    let totalWallets = Money.zero();
    for (const w of wallets) {
      totalWallets = totalWallets.plus(Money.from(w.cachedBal.toString()));
    }

    // 2. Net balance per Pos from PosEntries
    const posSums = await prisma.posEntry.groupBy({
      by: ['pos'],
      where: {
        userId,
        transaction: {
          status: TransactionStatus.POSTED,
        },
      },
      _sum: {
        amountBase: true,
      },
    });

    const posMap: Record<PosType, Money> = {
      LIVING: Money.zero(),
      PLAYING: Money.zero(),
      EMERGENCY: Money.zero(),
      SAVINGS: Money.zero(),
      INVESTMENT: Money.zero(),
      GOALS: Money.zero(),
    };

    for (const p of posSums) {
      if (p._sum.amountBase) {
        posMap[p.pos] = Money.from(p._sum.amountBase.toString());
      }
    }

    // 3. Current active period
    const today = new Date();
    const currentPeriod = await prisma.budgetPeriod.findFirst({
      where: {
        userId,
        startDate: { lte: today },
        endDate: { gte: today },
        isClosed: false,
      },
    });

    // 4. Invariant check
    const invariant = checkTwoLayerInvariant(
      wallets.map((w) => ({ cachedBal: w.cachedBal.toString() })),
      {
        living: posMap.LIVING,
        playing: posMap.PLAYING,
        emergency: posMap.EMERGENCY,
        savings: posMap.SAVINGS,
        investment: posMap.INVESTMENT,
        goals: posMap.GOALS,
      }
    );

    return {
      totalWallets: totalWallets.toString(),
      wallets: wallets.map((w) => ({
        id: w.id,
        name: w.name,
        type: w.type,
        currency: w.currency,
        brandKey: w.brandKey,
        balance: w.cachedBal.toString(),
      })),
      layerMonth: {
        total: invariant.layerMonth.toString(),
        living: posMap.LIVING.toString(),
        playing: posMap.PLAYING.toString(),
        livingBudget: currentPeriod?.livingBudget.toString() || '0',
        playingBudget: currentPeriod?.playingBudget.toString() || '0',
        livingSpent: currentPeriod?.livingSpent.toString() || '0',
        playingSpent: currentPeriod?.playingSpent.toString() || '0',
      },
      layerStored: {
        total: invariant.layerStored.toString(),
        emergency: posMap.EMERGENCY.toString(),
        savings: posMap.SAVINGS.toString(),
        investment: posMap.INVESTMENT.toString(),
        goals: posMap.GOALS.toString(),
      },
      invariant: {
        isBalanced: invariant.isBalanced,
        diff: invariant.diff.toString(),
        message: invariant.message,
      },
      activePeriodId: currentPeriod?.id || null,
    };
  }

  /**
   * Section 4: Retrieve origin history of a specific bucket (seeing where the money came from/went).
   */
  static async getBucketOriginHistory(userId: string, pos: PosType) {
    const entries = await prisma.posEntry.findMany({
      where: {
        userId,
        pos,
        transaction: {
          status: TransactionStatus.POSTED,
        },
      },
      include: {
        transaction: {
          select: {
            id: true,
            title: true,
            date: true,
            type: true,
            note: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return entries.map((e) => ({
      id: e.id,
      transactionId: e.transactionId,
      title: e.transaction.title,
      date: e.transaction.date,
      source: e.source,
      amountBase: e.amountBase.toString(),
      note: e.transaction.note,
    }));
  }

  /**
   * Retrieve paginated transactions history.
   */
  static async getTransactionHistory(
    userId: string,
    filters?: {
      limit?: number;
      offset?: number;
      type?: string;
    }
  ) {
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;

    const where: any = { userId };
    if (filters?.type) {
      where.type = filters.type;
    }

    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: true,
          walletEntries: {
            include: { wallet: true },
          },
          posEntries: true,
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        title: t.title,
        note: t.note,
        date: t.date,
        amount: t.amount.toString(),
        currency: t.currency,
        amountBase: t.amountBase.toString(),
        category: t.category
          ? {
              id: t.category.id,
              name: t.category.name,
              icon: t.category.icon,
              color: t.category.color,
            }
          : null,
        isEmergency: t.isEmergency,
        emergencyFlag: t.emergencyFlag,
        isOverBudget: t.isOverBudget,
        voidReason: t.voidReason,
        walletEntries: t.walletEntries.map((we) => ({
          walletName: we.wallet.name,
          amount: we.amount.toString(),
        })),
        posEntries: t.posEntries.map((pe) => ({
          pos: pe.pos,
          source: pe.source,
          amountBase: pe.amountBase.toString(),
        })),
      })),
      totalCount,
      hasMore: offset + limit < totalCount,
    };
  }
}


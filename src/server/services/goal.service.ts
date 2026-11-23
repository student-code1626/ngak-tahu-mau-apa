import { prisma } from '@/lib/db';
import { Prisma, GoalStatus, PosType, PosEntrySource, TransactionType, TransactionStatus } from '@prisma/client';
import Decimal from 'decimal.js';
import { Money } from '@/domain/money/money';

export class GoalService {
  static async getGoals(userId: string) {
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return goals.map((g) => {
      const target = Number(g.targetAmount);
      const current = Number(g.currentAmount);
      const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      const remaining = Math.max(0, target - current);

      return {
        id: g.id,
        name: g.name,
        targetAmount: target,
        currentAmount: current,
        progress,
        remaining,
        deadline: g.deadline,
        status: g.status,
        reason: g.reason,
      };
    });
  }

  static async createGoal(userId: string, data: { name: string; targetAmount: number; deadline?: Date; reason?: string }) {
    return await prisma.goal.create({
      data: {
        userId,
        name: data.name,
        targetAmount: new Prisma.Decimal(data.targetAmount.toString()),
        currentAmount: new Prisma.Decimal(0),
        deadline: data.deadline || null,
        reason: data.reason || null,
        status: GoalStatus.IN_PROGRESS,
      },
    });
  }

  /**
   * Allocate money to a goal from bucket (e.g. GOALS or SAVINGS).
   */
  static async allocateToGoal(userId: string, goalId: string, amount: number, sourcePos: PosType = 'GOALS') {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const goal = await tx.goal.findUnique({ where: { id: goalId, userId } });
      if (!goal) throw new Error('Tujuan tidak ditemukan');

      const amt = Money.from(amount);
      const idempotencyKey = `goal-alloc-${goalId}-${Date.now()}`;

      // Create ledger transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.POSTED,
          date: new Date(),
          title: `Alokasi Dana Tujuan: ${goal.name}`,
          amount: new Prisma.Decimal(amt.toString()),
          currency: 'IDR',
          fxRate: new Prisma.Decimal(1),
          amountBase: new Prisma.Decimal(amt.toString()),
          idempotencyKey,
        },
      });

      // PosEntry linked to goal
      await tx.posEntry.create({
        data: {
          userId,
          transactionId: transaction.id,
          pos: PosType.GOALS,
          source: PosEntrySource.MOVE_IN,
          amountBase: new Prisma.Decimal(amt.toString()),
          goalId: goal.id,
        },
      });

      // Update goal current amount
      const updated = await tx.goal.update({
        where: { id: goalId },
        data: {
          currentAmount: { increment: new Prisma.Decimal(amt.toString()) },
        },
      });

      return updated;
    });
  }

  /**
   * Section 5.9: Saat dipakai, dicatat sebagai pengeluaran berlabel 'dari Tujuan: <nama>',
   * tujuan ditandai COMPLETED, sisa dana dikembalikan ke pos pilihan pengguna.
   */
  static async spendGoal(userId: string, goalId: string, walletId: string, spendAmount: number, returnExcessPos: PosType = 'SAVINGS') {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const goal = await tx.goal.findUnique({ where: { id: goalId, userId } });
      if (!goal) throw new Error('Tujuan tidak ditemukan');

      const currentFund = Money.from(goal.currentAmount.toString());
      const spend = Money.from(spendAmount);

      if (spend.greaterThan(currentFund)) {
        throw new Error('Nominal pengeluaran melebihi dana yang terkumpul untuk tujuan ini');
      }

      const excess = currentFund.minus(spend);
      const idempotencyKey = `goal-spend-${goalId}-${Date.now()}`;

      // 1. Transaction Header
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.EXPENSE,
          status: TransactionStatus.POSTED,
          date: new Date(),
          title: `Pengeluaran dari Tujuan: ${goal.name}`,
          note: `Realisasi target tujuan ${goal.name}`,
          amount: new Prisma.Decimal(spend.toString()),
          currency: 'IDR',
          fxRate: new Prisma.Decimal(1),
          amountBase: new Prisma.Decimal(spend.toString()),
          idempotencyKey,
        },
      });

      // 2. Wallet Entry (outflow)
      await tx.walletEntry.create({
        data: {
          userId,
          transactionId: transaction.id,
          walletId,
          amount: new Prisma.Decimal(spend.negated().toString()),
          currency: 'IDR',
          amountBase: new Prisma.Decimal(spend.negated().toString()),
        },
      });

      await tx.wallet.update({
        where: { id: walletId },
        data: { cachedBal: { decrement: new Prisma.Decimal(spend.toString()) } },
      });

      // 3. PosEntry Spend
      await tx.posEntry.create({
        data: {
          userId,
          transactionId: transaction.id,
          pos: PosType.GOALS,
          source: PosEntrySource.SPEND,
          amountBase: new Prisma.Decimal(spend.negated().toString()),
          goalId: goal.id,
        },
      });

      // 4. Return excess if any
      if (excess.isPositive()) {
        await tx.posEntry.create({
          data: {
            userId,
            transactionId: transaction.id,
            pos: returnExcessPos,
            source: PosEntrySource.MOVE_IN,
            amountBase: new Prisma.Decimal(excess.toString()),
          },
        });
        await tx.posEntry.create({
          data: {
            userId,
            transactionId: transaction.id,
            pos: PosType.GOALS,
            source: PosEntrySource.MOVE_OUT,
            amountBase: new Prisma.Decimal(excess.negated().toString()),
            goalId: goal.id,
          },
        });
      }

      // 5. Mark Goal as COMPLETED
      await tx.goal.update({
        where: { id: goalId },
        data: {
          status: GoalStatus.COMPLETED,
          currentAmount: new Prisma.Decimal(0),
        },
      });

      return { success: true };
    });
  }
}


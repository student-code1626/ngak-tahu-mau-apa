import { prisma } from '@/lib/db';
import { Prisma, DebtKind, Frequency, PosType, PosEntrySource, TransactionType, TransactionStatus } from '@prisma/client';
import { Money } from '@/domain/money/money';

export class DebtService {
  static async getDebtsAndReceivables(userId: string) {
    const [debts, receivables] = await Promise.all([
      prisma.debt.findMany({
        where: { userId, isClosed: false },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.receivable.findMany({
        where: { userId, isSettled: false },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalDebt = debts.reduce((acc, d) => acc + Number(d.balance), 0);
    const totalReceivable = receivables.reduce((acc, r) => acc + Number(r.remaining), 0);

    return {
      debts: debts.map((d) => ({
        id: d.id,
        name: d.name,
        creditor: d.creditor,
        kind: d.kind,
        principal: Number(d.principal),
        balance: Number(d.balance),
        installment: Number(d.installment),
        frequency: d.frequency,
        dueDate: d.dueDate,
      })),
      receivables: receivables.map((r) => ({
        id: r.id,
        personName: r.personName,
        amount: Number(r.amount),
        remaining: Number(r.remaining),
        note: r.note,
        dueDate: r.dueDate,
      })),
      totalDebt,
      totalReceivable,
    };
  }

  /**
   * Section 5.7: Pinjaman diterima dicatat sebagai NON_INCOME (menambah saldo dompet tanpa membagi ke pos anggaran).
   */
  static async createDebt(
    userId: string,
    data: {
      name: string;
      creditor?: string;
      kind: DebtKind;
      principal: number;
      installment?: number;
      frequency?: Frequency;
      dueDate?: Date;
      receiveToWalletId?: string;
    }
  ) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const debt = await tx.debt.create({
        data: {
          userId,
          name: data.name,
          creditor: data.creditor || null,
          kind: data.kind,
          principal: new Prisma.Decimal(data.principal.toString()),
          balance: new Prisma.Decimal(data.principal.toString()),
          installment: new Prisma.Decimal((data.installment || 0).toString()),
          frequency: data.frequency || Frequency.MONTHLY,
          dueDate: data.dueDate || null,
        },
      });

      // If user received loan money directly into a wallet
      if (data.receiveToWalletId) {
        const amt = Money.from(data.principal);
        const idempotencyKey = `debt-in-${debt.id}-${Date.now()}`;

        const transaction = await tx.transaction.create({
          data: {
            userId,
            type: TransactionType.INCOME,
            status: TransactionStatus.POSTED,
            date: new Date(),
            title: `Penerimaan Pinjaman: ${data.name}`,
            note: `Pinjaman dari ${data.creditor || 'Kreditur'} (Non-Income)`,
            amount: new Prisma.Decimal(amt.toString()),
            currency: 'IDR',
            fxRate: new Prisma.Decimal(1),
            amountBase: new Prisma.Decimal(amt.toString()),
            idempotencyKey,
          },
        });

        // Add to wallet
        await tx.walletEntry.create({
          data: {
            userId,
            transactionId: transaction.id,
            walletId: data.receiveToWalletId,
            amount: new Prisma.Decimal(amt.toString()),
            currency: 'IDR',
            amountBase: new Prisma.Decimal(amt.toString()),
          },
        });

        await tx.wallet.update({
          where: { id: data.receiveToWalletId },
          data: { cachedBal: { increment: new Prisma.Decimal(amt.toString()) } },
        });
      }

      return debt;
    });
  }

  /**
   * Section 5.7: Bayar cicilan hutang.
   * Keluar bertipe 'Bayar hutang' dengan pos sumber pilihan pengguna (Living atau Savings).
   * Sisa hutang berkurang otomatis.
   */
  static async payInstallment(
    userId: string,
    debtId: string,
    walletId: string,
    amount: number,
    posSource: PosType = 'LIVING'
  ) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const debt = await tx.debt.findUnique({ where: { id: debtId, userId } });
      if (!debt) throw new Error('Data hutang tidak ditemukan');

      const amt = Money.from(amount);
      const idempotencyKey = `debt-pay-${debtId}-${Date.now()}`;

      // 1. Transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.EXPENSE,
          status: TransactionStatus.POSTED,
          date: new Date(),
          title: `Bayar Hutang: ${debt.name}`,
          amount: new Prisma.Decimal(amt.toString()),
          currency: 'IDR',
          fxRate: new Prisma.Decimal(1),
          amountBase: new Prisma.Decimal(amt.toString()),
          idempotencyKey,
        },
      });

      // 2. Wallet Entry
      await tx.walletEntry.create({
        data: {
          userId,
          transactionId: transaction.id,
          walletId,
          amount: new Prisma.Decimal(amt.negated().toString()),
          currency: 'IDR',
          amountBase: new Prisma.Decimal(amt.negated().toString()),
        },
      });

      await tx.wallet.update({
        where: { id: walletId },
        data: { cachedBal: { decrement: new Prisma.Decimal(amt.toString()) } },
      });

      // 3. Pos Entry
      await tx.posEntry.create({
        data: {
          userId,
          transactionId: transaction.id,
          pos: posSource,
          source: PosEntrySource.SPEND,
          amountBase: new Prisma.Decimal(amt.negated().toString()),
        },
      });

      // 4. Debt Payment Record & Balance Decrement
      await tx.debtPayment.create({
        data: {
          debtId: debt.id,
          transactionId: transaction.id,
          amountPaid: new Prisma.Decimal(amt.toString()),
          principalPortion: new Prisma.Decimal(amt.toString()),
        },
      });

      const newBalance = Money.from(debt.balance.toString()).minus(amt);
      const isClosed = newBalance.lessThanOrEqualTo(0);

      await tx.debt.update({
        where: { id: debt.id },
        data: {
          balance: new Prisma.Decimal(Math.max(0, newBalance.toNumber()).toString()),
          isClosed,
        },
      });

      return { success: true, remainingBalance: Math.max(0, newBalance.toNumber()) };
    });
  }

  /**
   * Section 5.4: Talangan teman dicatat sebagai piutang (tidak memakan anggaran pengguna).
   */
  static async createReceivable(
    userId: string,
    data: { personName: string; amount: number; note?: string; dueDate?: Date }
  ) {
    return await prisma.receivable.create({
      data: {
        userId,
        personName: data.personName,
        amount: new Prisma.Decimal(data.amount.toString()),
        remaining: new Prisma.Decimal(data.amount.toString()),
        note: data.note || null,
        dueDate: data.dueDate || null,
      },
    });
  }

  /**
   * Section 5.4: Saat teman mengganti talangan, dicatat sebagai pelunasan piutang (NON_INCOME).
   */
  static async settleReceivable(userId: string, receivableId: string, walletId: string, amount: number) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const rec = await tx.receivable.findUnique({ where: { id: receivableId, userId } });
      if (!rec) throw new Error('Data piutang tidak ditemukan');

      const amt = Money.from(amount);
      const idempotencyKey = `rec-settle-${receivableId}-${Date.now()}`;

      // Inflow to wallet as NON_INCOME
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.INCOME,
          status: TransactionStatus.POSTED,
          date: new Date(),
          title: `Pelunasan Talangan: ${rec.personName}`,
          amount: new Prisma.Decimal(amt.toString()),
          currency: 'IDR',
          fxRate: new Prisma.Decimal(1),
          amountBase: new Prisma.Decimal(amt.toString()),
          idempotencyKey,
        },
      });

      await tx.walletEntry.create({
        data: {
          userId,
          transactionId: transaction.id,
          walletId,
          amount: new Prisma.Decimal(amt.toString()),
          currency: 'IDR',
          amountBase: new Prisma.Decimal(amt.toString()),
        },
      });

      await tx.wallet.update({
        where: { id: walletId },
        data: { cachedBal: { increment: new Prisma.Decimal(amt.toString()) } },
      });

      const newRemaining = Money.from(rec.remaining.toString()).minus(amt);
      const isSettled = newRemaining.lessThanOrEqualTo(0);

      await tx.receivable.update({
        where: { id: rec.id },
        data: {
          remaining: new Prisma.Decimal(Math.max(0, newRemaining.toNumber()).toString()),
          isSettled,
        },
      });

      return { success: true };
    });
  }
}


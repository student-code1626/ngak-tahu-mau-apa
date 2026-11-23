import { prisma } from '@/lib/db';
import { Prisma, TransactionType, TransactionStatus, PosType, PosEntrySource } from '@prisma/client';
import Decimal from 'decimal.js';
import { Money } from '@/domain/money/money';
import { convertToAmountBase } from '@/domain/money/fx';
import { splitIncome, IncomeType } from '@/domain/split/income-splitter';
import { evaluateEmergencyExpense } from '@/domain/rules/emergency-evaluator';
import { calculateBudgetPeriod } from '@/domain/period/period-calculator';

export interface RecordIncomeInput {
  userId: string;
  walletId: string;
  amount: number | string | Decimal;
  currency?: string;
  fxRate?: number | string | Decimal;
  incomeType: IncomeType;
  title: string;
  note?: string;
  date?: Date;
  idempotencyKey?: string;
}

export interface RecordExpenseInput {
  userId: string;
  walletId: string;
  amount: number | string | Decimal;
  currency?: string;
  fxRate?: number | string | Decimal;
  title: string;
  categoryId?: string;
  note?: string;
  date?: Date;
  idempotencyKey?: string;
  // Multi-pos source allocations (e.g., Living, Playing, Emergency, Savings)
  posSources: {
    pos: PosType;
    amount: number | string | Decimal;
  }[];
}

export interface RecordTransferInput {
  userId: string;
  transferType: 'WALLET_TO_WALLET' | 'BUCKET_TO_BUCKET';
  amount: number | string | Decimal;
  title?: string;
  note: string;
  date?: Date;
  idempotencyKey?: string;
  // For WALLET_TO_WALLET:
  fromWalletId?: string;
  toWalletId?: string;
  adminFee?: number | string | Decimal;
  // For BUCKET_TO_BUCKET:
  fromPos?: PosType;
  toPos?: PosType;
}

export interface RecordAdjustmentInput {
  userId: string;
  walletId: string;
  actualBalance: number | string | Decimal;
  // When actual < recorded (shortfall/expense):
  shortfallPos?: PosType;
  // When actual > recorded (surplus/income):
  incomeType?: IncomeType;
  note?: string;
  date?: Date;
  idempotencyKey?: string;
}

export class TransactionService {
  /**
   * Helper to ensure active BudgetPeriod exists for user
   */
  static async getOrCreateActivePeriod(tx: Prisma.TransactionClient, userId: string, date = new Date()) {
    let period = await tx.budgetPeriod.findFirst({
      where: {
        userId,
        startDate: { lte: date },
        endDate: { gte: date },
        isClosed: false,
      },
    });

    if (!period) {
      const profile = await tx.profile.findUnique({ where: { userId } });
      const startDay = profile?.budgetStartDay ?? 1;
      const { startDate, endDate } = calculateBudgetPeriod(startDay, date);

      period = await tx.budgetPeriod.create({
        data: {
          userId,
          startDate,
          endDate,
          isClosed: false,
          livingBudget: new Prisma.Decimal(0),
          playingBudget: new Prisma.Decimal(0),
          livingSpent: new Prisma.Decimal(0),
          playingSpent: new Prisma.Decimal(0),
        },
      });
    }

    return period;
  }

  /**
   * 1. RECORD INCOME (Pemasukan)
   * Section 5.2: Splits income into Living, Playing, and Saving buckets (Emergency, Savings, Investment, Goals).
   * NON_INCOME does not split.
   */
  static async recordIncome(input: RecordIncomeInput) {
    const rawAmount = Money.from(input.amount);
    if (rawAmount.isNegative() || rawAmount.isZero()) {
      throw new Error('Nominal pemasukan harus lebih besar dari 0');
    }

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const profile = await tx.profile.findUnique({ where: { userId: input.userId } });
      const baseCurrency = profile?.baseCurrency || 'IDR';
      const currency = input.currency || baseCurrency;

      const fx = convertToAmountBase(rawAmount, currency, baseCurrency, input.fxRate);
      const period = await this.getOrCreateActivePeriod(tx, input.userId, input.date);

      // Fetch user custom income rules if exists
      const userRule = await tx.incomeRule.findUnique({
        where: {
          userId_incomeType: {
            userId: input.userId,
            incomeType: input.incomeType === 'IRREGULAR' ? 'IRREGULAR' : 'ROUTINE',
          },
        },
      });

      const splitOutput = splitIncome(
        fx.amountBase,
        input.incomeType,
        userRule
          ? {
              savingPct: Number(userRule.savingPct),
              livingPct: Number(userRule.livingPct),
              playingPct: Number(userRule.playingPct),
              emergencyPct: Number(userRule.emergencyPct),
              savingsPct: Number(userRule.savingsPct),
              investPct: Number(userRule.investPct),
              goalsPct: Number(userRule.goalsPct),
            }
          : undefined
      );

      const idempotencyKey = input.idempotencyKey || `inc-${input.userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // 1. Create Transaction Header
      const transaction = await tx.transaction.create({
        data: {
          userId: input.userId,
          periodId: period.id,
          type: TransactionType.INCOME,
          status: TransactionStatus.POSTED,
          date: input.date || new Date(),
          title: input.title,
          note: input.note || null,
          amount: new Prisma.Decimal(rawAmount.toString()),
          currency: fx.currency,
          fxRate: new Prisma.Decimal(fx.fxRate.toString()),
          amountBase: new Prisma.Decimal(fx.amountBase.toString()),
          idempotencyKey,
        },
      });

      // 2. Create Wallet Entry (inflow positive)
      await tx.walletEntry.create({
        data: {
          userId: input.userId,
          transactionId: transaction.id,
          walletId: input.walletId,
          amount: new Prisma.Decimal(rawAmount.toString()),
          currency: fx.currency,
          amountBase: new Prisma.Decimal(fx.amountBase.toString()),
        },
      });

      // Update cached wallet balance
      await tx.wallet.update({
        where: { id: input.walletId },
        data: {
          cachedBal: { increment: new Prisma.Decimal(rawAmount.toString()) },
        },
      });

      // 3. Create Pos Entries and update Period Budget
      let livingAdded = new Decimal(0);
      let playingAdded = new Decimal(0);

      for (const alloc of splitOutput.allocations) {
        if (!alloc.amount.isZero()) {
          await tx.posEntry.create({
            data: {
              userId: input.userId,
              transactionId: transaction.id,
              periodId: alloc.pos === 'LIVING' || alloc.pos === 'PLAYING' ? period.id : null,
              pos: alloc.pos,
              source: PosEntrySource.INCOME,
              amountBase: new Prisma.Decimal(alloc.amount.toString()),
            },
          });

          if (alloc.pos === 'LIVING') {
            livingAdded = livingAdded.plus(alloc.amount.raw);
          } else if (alloc.pos === 'PLAYING') {
            playingAdded = playingAdded.plus(alloc.amount.raw);
          }
        }
      }

      // Automatically increase period budget with new income (closes living deficits naturally)
      if (!livingAdded.isZero() || !playingAdded.isZero()) {
        await tx.budgetPeriod.update({
          where: { id: period.id },
          data: {
            livingBudget: { increment: new Prisma.Decimal(livingAdded.toString()) },
            playingBudget: { increment: new Prisma.Decimal(playingAdded.toString()) },
          },
        });
      }

      return {
        transaction,
        split: splitOutput,
        amountBase: fx.amountBase.toString(),
      };
    });
  }

  /**
   * 2. RECORD EXPENSE (Pengeluaran)
   * Section 5.4: Can spend from Living, Playing, Emergency, or Savings.
   * Checks over-budget and flags emergency genuineness without blocking.
   */
  static async recordExpense(input: RecordExpenseInput) {
    const rawAmount = Money.from(input.amount);
    if (rawAmount.isNegative() || rawAmount.isZero()) {
      throw new Error('Nominal pengeluaran harus lebih besar dari 0');
    }

    if (!input.posSources || input.posSources.length === 0) {
      throw new Error('Pilih minimal satu pos sumber dana');
    }

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const profile = await tx.profile.findUnique({ where: { userId: input.userId } });
      const baseCurrency = profile?.baseCurrency || 'IDR';
      const currency = input.currency || baseCurrency;

      const fx = convertToAmountBase(rawAmount, currency, baseCurrency, input.fxRate);
      const period = await this.getOrCreateActivePeriod(tx, input.userId, input.date);

      // Verify posSources total matches total expense
      let posSum = Money.zero();
      for (const ps of input.posSources) {
        posSum = posSum.plus(Money.from(ps.amount));
      }

      if (!posSum.equals(fx.amountBase)) {
        throw new Error(
          `Total alokasi pos sumber (${posSum.format('IDR')}) tidak sama dengan total pengeluaran (${fx.amountBase.format('IDR')})`
        );
      }

      // Check category details for emergency evaluation
      let categoryName = '';
      if (input.categoryId) {
        const cat = await tx.category.findUnique({ where: { id: input.categoryId } });
        categoryName = cat?.name || '';
      }

      const hasEmergencyPos = input.posSources.some((ps) => ps.pos === 'EMERGENCY');
      let emergencyFlag: 'OK' | 'OUTSIDE_EMERGENCY' | null = null;
      if (hasEmergencyPos) {
        const evalRes = evaluateEmergencyExpense(input.title, categoryName, input.note);
        emergencyFlag = evalRes.flag;
      }

      // Check over-budget state for Living/Playing
      let isOverBudget = false;
      const livingSpentNow = input.posSources.find((ps) => ps.pos === 'LIVING');
      const playingSpentNow = input.posSources.find((ps) => ps.pos === 'PLAYING');

      if (livingSpentNow) {
        const currentLivingBudget = new Decimal(period.livingBudget.toString());
        const currentLivingSpent = new Decimal(period.livingSpent.toString());
        if (currentLivingSpent.plus(new Decimal(livingSpentNow.amount.toString())).greaterThan(currentLivingBudget)) {
          isOverBudget = true;
        }
      }

      if (playingSpentNow) {
        const currentPlayingBudget = new Decimal(period.playingBudget.toString());
        const currentPlayingSpent = new Decimal(period.playingSpent.toString());
        if (currentPlayingSpent.plus(new Decimal(playingSpentNow.amount.toString())).greaterThan(currentPlayingBudget)) {
          isOverBudget = true;
        }
      }

      const idempotencyKey = input.idempotencyKey || `exp-${input.userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // 1. Create Transaction Header
      const transaction = await tx.transaction.create({
        data: {
          userId: input.userId,
          periodId: period.id,
          categoryId: input.categoryId || null,
          type: TransactionType.EXPENSE,
          status: TransactionStatus.POSTED,
          date: input.date || new Date(),
          title: input.title,
          note: input.note || null,
          amount: new Prisma.Decimal(rawAmount.toString()),
          currency: fx.currency,
          fxRate: new Prisma.Decimal(fx.fxRate.toString()),
          amountBase: new Prisma.Decimal(fx.amountBase.toString()),
          idempotencyKey,
          isEmergency: hasEmergencyPos,
          emergencyFlag,
          isOverBudget,
        },
      });

      // 2. Create Wallet Entry (outflow negative)
      await tx.walletEntry.create({
        data: {
          userId: input.userId,
          transactionId: transaction.id,
          walletId: input.walletId,
          amount: new Prisma.Decimal(rawAmount.negated().toString()),
          currency: fx.currency,
          amountBase: new Prisma.Decimal(fx.amountBase.negated().toString()),
        },
      });

      // Deduct cached wallet balance
      await tx.wallet.update({
        where: { id: input.walletId },
        data: {
          cachedBal: { decrement: new Prisma.Decimal(rawAmount.toString()) },
        },
      });

      // 3. Create Pos Entries (outflow negative) and update period spent
      let livingDelta = new Decimal(0);
      let playingDelta = new Decimal(0);

      for (const ps of input.posSources) {
        const amt = Money.from(ps.amount);
        if (!amt.isZero()) {
          await tx.posEntry.create({
            data: {
              userId: input.userId,
              transactionId: transaction.id,
              periodId: ps.pos === 'LIVING' || ps.pos === 'PLAYING' ? period.id : null,
              pos: ps.pos,
              source: PosEntrySource.SPEND,
              amountBase: new Prisma.Decimal(amt.negated().toString()),
            },
          });

          if (ps.pos === 'LIVING') {
            livingDelta = livingDelta.plus(amt.raw);
          } else if (ps.pos === 'PLAYING') {
            playingDelta = playingDelta.plus(amt.raw);
          }
        }
      }

      if (!livingDelta.isZero() || !playingDelta.isZero()) {
        await tx.budgetPeriod.update({
          where: { id: period.id },
          data: {
            livingSpent: { increment: new Prisma.Decimal(livingDelta.toString()) },
            playingSpent: { increment: new Prisma.Decimal(playingDelta.toString()) },
          },
        });
      }

      return {
        transaction,
        isOverBudget,
        emergencyFlag,
      };
    });
  }

  /**
   * 3. RECORD TRANSFER (Pindahkan)
   * Wallet to Wallet (with optional admin fee debited to Living).
   * Bucket to Bucket (with mandatory reason note).
   */
  static async recordTransfer(input: RecordTransferInput) {
    const rawAmount = Money.from(input.amount);
    if (rawAmount.isNegative() || rawAmount.isZero()) {
      throw new Error('Nominal transfer harus lebih besar dari 0');
    }

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const profile = await tx.profile.findUnique({ where: { userId: input.userId } });
      const baseCurrency = profile?.baseCurrency || 'IDR';
      const period = await this.getOrCreateActivePeriod(tx, input.userId, input.date);

      const idempotencyKey = input.idempotencyKey || `trf-${input.userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      if (input.transferType === 'WALLET_TO_WALLET') {
        if (!input.fromWalletId || !input.toWalletId) {
          throw new Error('Dompet asal dan tujuan wajib dipilih');
        }
        if (input.fromWalletId === input.toWalletId) {
          throw new Error('Dompet asal dan tujuan tidak boleh sama');
        }

        const adminFee = input.adminFee ? Money.from(input.adminFee) : Money.zero();

        // 1. Transaction Header
        const transaction = await tx.transaction.create({
          data: {
            userId: input.userId,
            periodId: period.id,
            type: TransactionType.TRANSFER,
            status: TransactionStatus.POSTED,
            date: input.date || new Date(),
            title: input.title || 'Transfer Antar Dompet',
            note: input.note || null,
            amount: new Prisma.Decimal(rawAmount.toString()),
            currency: baseCurrency,
            fxRate: new Prisma.Decimal(1),
            amountBase: new Prisma.Decimal(rawAmount.toString()),
            idempotencyKey,
          },
        });

        // 2. From Wallet Entry (Debit: amount + fee)
        const totalDebit = rawAmount.plus(adminFee);
        await tx.walletEntry.create({
          data: {
            userId: input.userId,
            transactionId: transaction.id,
            walletId: input.fromWalletId,
            amount: new Prisma.Decimal(totalDebit.negated().toString()),
            currency: baseCurrency,
            amountBase: new Prisma.Decimal(totalDebit.negated().toString()),
          },
        });

        await tx.wallet.update({
          where: { id: input.fromWalletId },
          data: { cachedBal: { decrement: new Prisma.Decimal(totalDebit.toString()) } },
        });

        // 3. To Wallet Entry (Credit: amount)
        await tx.walletEntry.create({
          data: {
            userId: input.userId,
            transactionId: transaction.id,
            walletId: input.toWalletId,
            amount: new Prisma.Decimal(rawAmount.toString()),
            currency: baseCurrency,
            amountBase: new Prisma.Decimal(rawAmount.toString()),
          },
        });

        await tx.wallet.update({
          where: { id: input.toWalletId },
          data: { cachedBal: { increment: new Prisma.Decimal(rawAmount.toString()) } },
        });

        // 4. Admin fee is recorded as Living expense (Section 5.4 of spec)
        if (!adminFee.isZero()) {
          await tx.posEntry.create({
            data: {
              userId: input.userId,
              transactionId: transaction.id,
              periodId: period.id,
              pos: 'LIVING',
              source: PosEntrySource.SPEND,
              amountBase: new Prisma.Decimal(adminFee.negated().toString()),
            },
          });

          await tx.budgetPeriod.update({
            where: { id: period.id },
            data: { livingSpent: { increment: new Prisma.Decimal(adminFee.toString()) } },
          });
        }

        return { transaction };
      } else {
        // BUCKET_TO_BUCKET
        if (!input.fromPos || !input.toPos) {
          throw new Error('Pos asal dan tujuan wajib dipilih');
        }
        if (input.fromPos === input.toPos) {
          throw new Error('Pos asal dan tujuan tidak boleh sama');
        }
        if (!input.note || input.note.trim().length === 0) {
          throw new Error('Alasan pemindahan antar bucket wajib diisi');
        }

        // 1. Transaction Header
        const transaction = await tx.transaction.create({
          data: {
            userId: input.userId,
            periodId: period.id,
            type: TransactionType.TRANSFER,
            status: TransactionStatus.POSTED,
            date: input.date || new Date(),
            title: `Pindah Bucket: ${input.fromPos} ➔ ${input.toPos}`,
            note: input.note,
            amount: new Prisma.Decimal(rawAmount.toString()),
            currency: baseCurrency,
            fxRate: new Prisma.Decimal(1),
            amountBase: new Prisma.Decimal(rawAmount.toString()),
            idempotencyKey,
          },
        });

        // 2. From Pos Entry (MOVE_OUT)
        await tx.posEntry.create({
          data: {
            userId: input.userId,
            transactionId: transaction.id,
            periodId: input.fromPos === 'LIVING' || input.fromPos === 'PLAYING' ? period.id : null,
            pos: input.fromPos,
            source: PosEntrySource.MOVE_OUT,
            amountBase: new Prisma.Decimal(rawAmount.negated().toString()),
          },
        });

        // 3. To Pos Entry (MOVE_IN)
        await tx.posEntry.create({
          data: {
            userId: input.userId,
            transactionId: transaction.id,
            periodId: input.toPos === 'LIVING' || input.toPos === 'PLAYING' ? period.id : null,
            pos: input.toPos,
            source: PosEntrySource.MOVE_IN,
            amountBase: new Prisma.Decimal(rawAmount.toString()),
          },
        });

        return { transaction };
      }
    });
  }

  /**
   * 4. RECORD ADJUSTMENT (Cocokkan Saldo)
   * Section 5.6: If actual < recorded, allocate shortfall to unrecorded expense.
   * If actual > recorded, allocate surplus to income split.
   */
  static async recordAdjustment(input: RecordAdjustmentInput) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const wallet = await tx.wallet.findUnique({ where: { id: input.walletId } });
      if (!wallet) throw new Error('Dompet tidak ditemukan');

      const recordedBal = Money.from(wallet.cachedBal.toString());
      const actualBal = Money.from(input.actualBalance);
      const diff = actualBal.minus(recordedBal);

      if (diff.isZero()) {
        return { message: 'Saldo sudah cocok, tidak ada perubahan.' };
      }

      const profile = await tx.profile.findUnique({ where: { userId: input.userId } });
      const baseCurrency = profile?.baseCurrency || 'IDR';
      const period = await this.getOrCreateActivePeriod(tx, input.userId, input.date);

      const idempotencyKey = input.idempotencyKey || `adj-${input.userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      if (diff.isNegative()) {
        // Actual < Recorded: Uang fisik berkurang (pengeluaran tidak tercatat)
        const shortfall = diff.abs();
        const pos = input.shortfallPos || PosType.LIVING;

        const transaction = await tx.transaction.create({
          data: {
            userId: input.userId,
            periodId: period.id,
            type: TransactionType.ADJUSTMENT,
            status: TransactionStatus.POSTED,
            date: input.date || new Date(),
            title: `Penyesuaian Saldo (Kurang): ${wallet.name}`,
            note: input.note || 'Pengeluaran tidak tercatat saat pencocokan saldo',
            amount: new Prisma.Decimal(shortfall.toString()),
            currency: wallet.currency,
            fxRate: new Prisma.Decimal(1),
            amountBase: new Prisma.Decimal(shortfall.toString()),
            idempotencyKey,
          },
        });

        // Wallet outflow
        await tx.walletEntry.create({
          data: {
            userId: input.userId,
            transactionId: transaction.id,
            walletId: wallet.id,
            amount: new Prisma.Decimal(shortfall.negated().toString()),
            currency: wallet.currency,
            amountBase: new Prisma.Decimal(shortfall.negated().toString()),
          },
        });

        // Set wallet cachedBal to actual
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { cachedBal: new Prisma.Decimal(actualBal.toString()) },
        });

        // Pos outflow
        await tx.posEntry.create({
          data: {
            userId: input.userId,
            transactionId: transaction.id,
            periodId: pos === 'LIVING' || pos === 'PLAYING' ? period.id : null,
            pos,
            source: PosEntrySource.ADJUSTMENT,
            amountBase: new Prisma.Decimal(shortfall.negated().toString()),
          },
        });

        if (pos === 'LIVING') {
          await tx.budgetPeriod.update({
            where: { id: period.id },
            data: { livingSpent: { increment: new Prisma.Decimal(shortfall.toString()) } },
          });
        } else if (pos === 'PLAYING') {
          await tx.budgetPeriod.update({
            where: { id: period.id },
            data: { playingSpent: { increment: new Prisma.Decimal(shortfall.toString()) } },
          });
        }

        return { transaction, diff: diff.toString() };
      } else {
        // Actual > Recorded: Uang fisik bertambah (ADJUSTMENT_UP)
        const surplus = diff;
        const incomeType = input.incomeType || 'ROUTINE';
        const split = splitIncome(surplus, incomeType);

        const transaction = await tx.transaction.create({
          data: {
            userId: input.userId,
            periodId: period.id,
            type: TransactionType.ADJUSTMENT,
            status: TransactionStatus.POSTED,
            date: input.date || new Date(),
            title: `Penyesuaian Saldo (Lebih): ${wallet.name}`,
            note: input.note || 'Pemasukan tidak tercatat saat pencocokan saldo',
            amount: new Prisma.Decimal(surplus.toString()),
            currency: wallet.currency,
            fxRate: new Prisma.Decimal(1),
            amountBase: new Prisma.Decimal(surplus.toString()),
            idempotencyKey,
          },
        });

        // Wallet inflow
        await tx.walletEntry.create({
          data: {
            userId: input.userId,
            transactionId: transaction.id,
            walletId: wallet.id,
            amount: new Prisma.Decimal(surplus.toString()),
            currency: wallet.currency,
            amountBase: new Prisma.Decimal(surplus.toString()),
          },
        });

        // Set wallet cachedBal to actual
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { cachedBal: new Prisma.Decimal(actualBal.toString()) },
        });

        // Distribute surplus into pos entries according to split
        for (const alloc of split.allocations) {
          if (!alloc.amount.isZero()) {
            await tx.posEntry.create({
              data: {
                userId: input.userId,
                transactionId: transaction.id,
                periodId: alloc.pos === 'LIVING' || alloc.pos === 'PLAYING' ? period.id : null,
                pos: alloc.pos,
                source: PosEntrySource.ADJUSTMENT,
                amountBase: new Prisma.Decimal(alloc.amount.toString()),
              },
            });
          }
        }

        return { transaction, diff: diff.toString() };
      }
    });
  }

  /**
   * 5. VOID TRANSACTION (Pembatalan tanpa menghapus baris fisik)
   * Section 4 of spec: Creates opposite reversing entries, maintains full audit trail.
   */
  static async voidTransaction(userId: string, transactionId: string, voidReason = 'Dibatalkan oleh pengguna') {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const orig = await tx.transaction.findFirst({
        where: { id: transactionId, userId },
        include: { walletEntries: true, posEntries: true },
      });

      if (!orig) throw new Error('Transaksi tidak ditemukan');
      if (orig.status === TransactionStatus.VOIDED) {
        throw new Error('Transaksi sudah pernah dibatalkan');
      }

      // Mark original as VOIDED
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.VOIDED,
          voidReason,
        },
      });

      // Reverse Wallet entries
      for (const we of orig.walletEntries) {
        const revAmount = new Decimal(we.amount.toString()).negated();
        await tx.wallet.update({
          where: { id: we.walletId },
          data: { cachedBal: { increment: new Prisma.Decimal(revAmount.toString()) } },
        });

        await tx.walletEntry.create({
          data: {
            userId,
            transactionId: orig.id,
            walletId: we.walletId,
            amount: new Prisma.Decimal(revAmount.toString()),
            currency: we.currency,
            amountBase: new Prisma.Decimal(new Decimal(we.amountBase.toString()).negated().toString()),
          },
        });
      }

      // Reverse Pos entries
      for (const pe of orig.posEntries) {
        const revAmount = new Decimal(pe.amountBase.toString()).negated();
        await tx.posEntry.create({
          data: {
            userId,
            transactionId: orig.id,
            periodId: pe.periodId,
            pos: pe.pos,
            source: PosEntrySource.ADJUSTMENT,
            amountBase: new Prisma.Decimal(revAmount.toString()),
          },
        });

        // Revert period budget if it was an income or spend in Living/Playing
        if (pe.periodId) {
          if (orig.type === TransactionType.INCOME) {
            if (pe.pos === 'LIVING') {
              await tx.budgetPeriod.update({
                where: { id: pe.periodId },
                data: { livingBudget: { decrement: new Prisma.Decimal(pe.amountBase.toString()) } },
              });
            } else if (pe.pos === 'PLAYING') {
              await tx.budgetPeriod.update({
                where: { id: pe.periodId },
                data: { playingBudget: { decrement: new Prisma.Decimal(pe.amountBase.toString()) } },
              });
            }
          } else if (orig.type === TransactionType.EXPENSE) {
            if (pe.pos === 'LIVING') {
              await tx.budgetPeriod.update({
                where: { id: pe.periodId },
                data: { livingSpent: { decrement: new Prisma.Decimal(pe.amountBase.abs().toString()) } },
              });
            } else if (pe.pos === 'PLAYING') {
              await tx.budgetPeriod.update({
                where: { id: pe.periodId },
                data: { playingSpent: { decrement: new Prisma.Decimal(pe.amountBase.abs().toString()) } },
              });
            }
          }
        }
      }

      return { success: true, voidedTransactionId: orig.id };
    });
  }
}


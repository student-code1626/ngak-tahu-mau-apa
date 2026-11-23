import { prisma } from '@/lib/db';
import Decimal from 'decimal.js';
import { Prisma, PosType, PosEntrySource, TransactionType, TransactionStatus } from '@prisma/client';
import {
  ProfileStepInput,
  WalletsStepInput,
  InitialAllocationInput,
} from '@/domain/rules/onboarding.schema';
import { calculateBudgetPeriod } from '@/domain/period/period-calculator';

export class OnboardingService {
  /**
   * Get user's current onboarding state, profile, and existing wallets.
   */
  static async getState(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    const wallets = await prisma.wallet.findMany({
      where: { userId, isArchived: false },
      orderBy: { createdAt: 'asc' },
    });

    return {
      profile,
      wallets,
      onboardingDone: profile?.onboardingDone ?? false,
      onboardingStep: profile?.onboardingStep ?? 1,
    };
  }

  /**
   * Step 1: Save Profile
   */
  static async saveProfile(userId: string, input: ProfileStepInput) {
    const updated = await prisma.profile.update({
      where: { userId },
      data: {
        displayName: input.displayName,
        budgetStartDay: input.budgetStartDay,
        incomeType: input.incomeType,
        occupation: input.occupation ?? null,
        estIncome: input.estIncome ? new Prisma.Decimal(input.estIncome.toString()) : null,
        primaryGoal: input.primaryGoal ?? null,
        preferredHour: input.preferredHour,
        onboardingStep: 2,
      },
    });

    return updated;
  }

  /**
   * Step 2: Save Wallets
   */
  static async saveWallets(userId: string, input: WalletsStepInput) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Clear any prior draft wallets for clean idempotency if user navigated back
      const existingOpening = await tx.transaction.findFirst({
        where: { userId, type: TransactionType.OPENING },
      });

      if (!existingOpening) {
        await tx.wallet.deleteMany({
          where: { userId },
        });
      }

      const createdWallets = [];
      for (const w of input.wallets) {
        const wallet = await tx.wallet.create({
          data: {
            userId,
            name: w.name,
            type: w.type,
            currency: w.currency || 'IDR',
            brandKey: w.brandKey ?? null,
            cachedBal: new Prisma.Decimal(w.initialBalance.toString()),
          },
        });
        createdWallets.push({
          ...wallet,
          initialBalance: w.initialBalance,
        });
      }

      await tx.profile.update({
        where: { userId },
        data: { onboardingStep: 3 },
      });

      return createdWallets;
    });
  }

  /**
   * Step 3: Complete Initial Allocation via Atomic Ledger Transaction
   * Invariant: Total Semua Dompet = Total Semua Pos (No 'saldo bebas')
   */
  static async completeAllocation(userId: string, input: InitialAllocationInput) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const profile = await tx.profile.findUnique({
        where: { userId },
      });

      if (!profile) {
        throw new Error('Profil pengguna tidak ditemukan');
      }

      const wallets = await tx.wallet.findMany({
        where: { userId, isArchived: false },
      });

      if (wallets.length === 0) {
        throw new Error('Belum ada dompet yang ditambahkan');
      }

      // Calculate total wallets balance
      let totalWallets = new Decimal(0);
      for (const w of wallets) {
        totalWallets = totalWallets.plus(new Decimal(w.cachedBal.toString()));
      }

      // Calculate total allocations
      let totalAllocations = new Decimal(0);
      for (const alloc of input.allocations) {
        totalAllocations = totalAllocations.plus(new Decimal(alloc.amount.toString()));
      }

      // Strict Invariant Check
      const diff = totalWallets.minus(totalAllocations);
      if (!diff.isZero()) {
        throw new Error(
          `Total alokasi (Rp ${totalAllocations.toNumber().toLocaleString('id-ID')}) tidak sama dengan total saldo dompet (Rp ${totalWallets.toNumber().toLocaleString('id-ID')}). Selisih: Rp ${diff.abs().toNumber().toLocaleString('id-ID')}. Seluruh saldo awal wajib dialokasikan tanpa ada saldo bebas.`
        );
      }

      // Calculate initial BudgetPeriod
      const { startDate, endDate } = calculateBudgetPeriod(profile.budgetStartDay);

      // Extract living and playing allocations for period budget
      const livingAlloc = input.allocations.find((a) => a.pos === 'LIVING')?.amount || 0;
      const playingAlloc = input.allocations.find((a) => a.pos === 'PLAYING')?.amount || 0;

      // Create first active budget period
      const budgetPeriod = await tx.budgetPeriod.create({
        data: {
          userId,
          startDate,
          endDate,
          isClosed: false,
          livingBudget: new Prisma.Decimal(livingAlloc.toString()),
          playingBudget: new Prisma.Decimal(playingAlloc.toString()),
          livingSpent: new Prisma.Decimal(0),
          playingSpent: new Prisma.Decimal(0),
        },
      });

      // Create Atomic OPENING Transaction
      const idempotencyKey = `opening-${userId}-${Date.now()}`;
      const openingTx = await tx.transaction.create({
        data: {
          userId,
          periodId: budgetPeriod.id,
          type: TransactionType.OPENING,
          status: TransactionStatus.POSTED,
          date: new Date(),
          title: 'Saldo Awal Onboarding',
          note: 'Inisialisasi dompet dan alokasi bucket awal saat onboarding',
          amount: new Prisma.Decimal(totalWallets.toString()),
          currency: profile.baseCurrency,
          fxRate: new Prisma.Decimal(1),
          amountBase: new Prisma.Decimal(totalWallets.toString()),
          idempotencyKey,
        },
      });

      // Create WalletEntry for each wallet
      for (const w of wallets) {
        const bal = new Decimal(w.cachedBal.toString());
        if (bal.isPositive() && !bal.isZero()) {
          await tx.walletEntry.create({
            data: {
              userId,
              transactionId: openingTx.id,
              walletId: w.id,
              amount: new Prisma.Decimal(bal.toString()),
              currency: w.currency,
              amountBase: new Prisma.Decimal(bal.toString()),
            },
          });
        }
      }

      // Create PosEntry for each allocated pos
      for (const alloc of input.allocations) {
        const amt = new Decimal(alloc.amount.toString());
        if (amt.isPositive() && !amt.isZero()) {
          await tx.posEntry.create({
            data: {
              userId,
              transactionId: openingTx.id,
              periodId: alloc.pos === 'LIVING' || alloc.pos === 'PLAYING' ? budgetPeriod.id : null,
              pos: alloc.pos as PosType,
              source: PosEntrySource.OPENING,
              amountBase: new Prisma.Decimal(amt.toString()),
            },
          });
        }
      }

      // Mark onboarding completed
      await tx.profile.update({
        where: { userId },
        data: {
          onboardingDone: true,
          onboardingStep: 4,
        },
      });

      return {
        success: true,
        transactionId: openingTx.id,
        periodId: budgetPeriod.id,
        totalWallets: totalWallets.toString(),
      };
    });
  }
}

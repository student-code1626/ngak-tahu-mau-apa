import { prisma } from '@/lib/db';
import { Prisma, PosType, PosEntrySource, TransactionType, TransactionStatus } from '@prisma/client';
import { Money } from '@/domain/money/money';

export class AssetService {
  static async getAssets(userId: string) {
    const assets = await prisma.asset.findMany({
      where: { userId },
      include: {
        history: {
          orderBy: { recordedAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalValue = assets.reduce((acc, a) => acc + Number(a.currentValue), 0);

    return {
      assets: assets.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        currentValue: Number(a.currentValue),
        purchaseCost: a.purchaseCost ? Number(a.purchaseCost) : null,
        purchaseDate: a.purchaseDate,
        note: a.note,
        history: a.history.map((h) => ({
          id: h.id,
          value: Number(h.value),
          recordedAt: h.recordedAt,
          note: h.note,
        })),
      })),
      totalValue,
    };
  }

  /**
   * Section 5.8: Pencatatan aset. Jika 'beli aset', mengurangi bucket Investasi dan dompet pembayaran.
   */
  static async createAsset(
    userId: string,
    data: {
      name: string;
      category: string;
      value: number;
      buyFromInvestmentBucket?: boolean;
      walletId?: string;
      note?: string;
    }
  ) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const amt = Money.from(data.value);

      if (data.buyFromInvestmentBucket) {
        if (!data.walletId) throw new Error('Pilih dompet pembayaran untuk pembelian aset');

        const idempotencyKey = `asset-buy-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Transaction
        const transaction = await tx.transaction.create({
          data: {
            userId,
            type: TransactionType.EXPENSE,
            status: TransactionStatus.POSTED,
            date: new Date(),
            title: `Beli Aset: ${data.name}`,
            note: data.note || 'Pembelian aset dari bucket Investasi',
            amount: new Prisma.Decimal(amt.toString()),
            currency: 'IDR',
            fxRate: new Prisma.Decimal(1),
            amountBase: new Prisma.Decimal(amt.toString()),
            idempotencyKey,
          },
        });

        // Debit Wallet
        await tx.walletEntry.create({
          data: {
            userId,
            transactionId: transaction.id,
            walletId: data.walletId,
            amount: new Prisma.Decimal(amt.negated().toString()),
            currency: 'IDR',
            amountBase: new Prisma.Decimal(amt.negated().toString()),
          },
        });

        await tx.wallet.update({
          where: { id: data.walletId },
          data: { cachedBal: { decrement: new Prisma.Decimal(amt.toString()) } },
        });

        // Debit Investment Pos
        await tx.posEntry.create({
          data: {
            userId,
            transactionId: transaction.id,
            pos: PosType.INVESTMENT,
            source: PosEntrySource.SPEND,
            amountBase: new Prisma.Decimal(amt.negated().toString()),
          },
        });
      }

      // Create Asset
      const asset = await tx.asset.create({
        data: {
          userId,
          name: data.name,
          category: data.category,
          currentValue: new Prisma.Decimal(amt.toString()),
          purchaseCost: new Prisma.Decimal(amt.toString()),
          purchaseDate: new Date(),
          note: data.note || null,
        },
      });

      // Initial history point
      await tx.assetValueHistory.create({
        data: {
          assetId: asset.id,
          value: new Prisma.Decimal(amt.toString()),
          note: 'Nilai awal perolehan aset',
        },
      });

      return asset;
    });
  }

  static async updateAssetValue(userId: string, assetId: string, newValue: number, note?: string) {
    const asset = await prisma.asset.findUnique({ where: { id: assetId, userId } });
    if (!asset) throw new Error('Aset tidak ditemukan');

    const amt = Money.from(newValue);

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.assetValueHistory.create({
        data: {
          assetId,
          value: new Prisma.Decimal(amt.toString()),
          note: note || 'Pembaruan nilai estimasi pasar',
        },
      });

      return await tx.asset.update({
        where: { id: assetId },
        data: {
          currentValue: new Prisma.Decimal(amt.toString()),
        },
      });
    });
  }
}


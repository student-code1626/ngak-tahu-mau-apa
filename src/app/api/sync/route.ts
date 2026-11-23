import { NextResponse } from 'next/server';
import { getActiveUserId } from '@/lib/session';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const userId = await getActiveUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        wallets: true,
        transactions: {
          include: {
            walletEntries: true,
            posEntries: true,
          },
          orderBy: { date: 'desc' },
          take: 100,
        },
        goals: true,
        debts: {
          include: { payments: true },
        },
        assets: {
          include: { history: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getActiveUserId();
    const body = await req.json();
    const { state } = body;

    if (!state) {
      return NextResponse.json({ success: false, message: 'Data state tidak ditemukan' }, { status: 400 });
    }

    // Save wallets if provided
    if (Array.isArray(state.wallets) && state.wallets.length > 0) {
      for (const w of state.wallets) {
        if (!w.name) continue;
        const existing = await prisma.wallet.findFirst({
          where: { userId, name: w.name },
        });

        const balanceDec = new Prisma.Decimal(String(w.balance || 0));
        const walletType = (w.type || (w.isBank ? 'BANK' : (w.isEwallet ? 'EWALLET' : 'OTHER'))).toUpperCase();
        const brand = w.brandKey || (w.logoKey ? String(w.logoKey).toLowerCase() : null);

        if (existing) {
          await prisma.wallet.update({
            where: { id: existing.id },
            data: {
              cachedBal: balanceDec,
              brandKey: brand || existing.brandKey,
            },
          });
        } else {
          await prisma.wallet.create({
            data: {
              userId,
              name: w.name,
              type: walletType || 'BANK',
              currency: w.currency || 'IDR',
              cachedBal: balanceDec,
              brandKey: brand,
            },
          });
        }
      }
    }

    // Save profile preferences if provided
    if (state.preferences) {
      await prisma.profile.updateMany({
        where: { userId },
        data: {
          budgetStartDay: Number(state.preferences.budgetStartDay || 1),
          baseCurrency: state.preferences.currency || 'IDR',
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Data berhasil disinkronkan ke database MySQL' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

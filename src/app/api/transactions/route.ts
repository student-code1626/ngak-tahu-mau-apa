import { NextResponse } from 'next/server';
import { getActiveUserId } from '@/lib/session';
import { TransactionService } from '@/server/services/transaction.service';
import { LedgerService } from '@/server/services/ledger.service';

export async function GET(req: Request) {
  try {
    const userId = await getActiveUserId();
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 20;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;
    const type = searchParams.get('type') || undefined;

    const result = await LedgerService.getTransactionHistory(userId, {
      limit,
      offset,
      type,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getActiveUserId();
    const body = await req.json();
    const { action, data } = body;

    if (action === 'INCOME') {
      const result = await TransactionService.recordIncome({
        ...data,
        userId,
      });
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    if (action === 'EXPENSE') {
      const result = await TransactionService.recordExpense({
        ...data,
        userId,
      });
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    if (action === 'TRANSFER') {
      const result = await TransactionService.recordTransfer({
        ...data,
        userId,
      });
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    if (action === 'ADJUSTMENT') {
      const result = await TransactionService.recordAdjustment({
        ...data,
        userId,
      });
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    return NextResponse.json({ error: 'Aksi transaksi tidak valid' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

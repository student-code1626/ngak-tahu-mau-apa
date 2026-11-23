import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DebtService } from '@/server/services/debt.service';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await DebtService.getDebtsAndReceivables(session.user.id);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { action, data } = body;

    if (action === 'CREATE_DEBT') {
      const debt = await DebtService.createDebt(session.user.id, data);
      return NextResponse.json({ success: true, data: debt }, { status: 201 });
    }

    if (action === 'PAY_INSTALLMENT') {
      const result = await DebtService.payInstallment(
        session.user.id,
        data.debtId,
        data.walletId,
        data.amount,
        data.posSource
      );
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'CREATE_RECEIVABLE') {
      const rec = await DebtService.createReceivable(session.user.id, data);
      return NextResponse.json({ success: true, data: rec }, { status: 201 });
    }

    if (action === 'SETTLE_RECEIVABLE') {
      const result = await DebtService.settleReceivable(
        session.user.id,
        data.receivableId,
        data.walletId,
        data.amount
      );
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}


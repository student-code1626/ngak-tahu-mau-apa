import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TransactionService } from '@/server/services/transaction.service';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const reason = body?.reason || 'Dibatalkan oleh pengguna';

    const result = await TransactionService.voidTransaction(
      session.user.id,
      params.id,
      reason
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal membatalkan transaksi' },
      { status: 400 }
    );
  }
}


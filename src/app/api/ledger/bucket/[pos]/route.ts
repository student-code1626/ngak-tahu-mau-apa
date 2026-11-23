import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LedgerService } from '@/server/services/ledger.service';
import { PosType } from '@prisma/client';

export async function GET(
  req: Request,
  { params }: { params: { pos: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pos = params.pos.toUpperCase() as PosType;
    const history = await LedgerService.getBucketOriginHistory(session.user.id, pos);
    return NextResponse.json({ success: true, data: history });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


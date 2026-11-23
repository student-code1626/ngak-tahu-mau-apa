import { NextResponse } from 'next/server';
import { getActiveUserId } from '@/lib/session';
import { LedgerService } from '@/server/services/ledger.service';

export async function GET() {
  try {
    const userId = await getActiveUserId();
    const summary = await LedgerService.getBalanceSummary(userId);
    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

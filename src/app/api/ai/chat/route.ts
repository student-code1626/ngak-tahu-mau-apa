import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AiService } from '@/server/services/ai.service';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { message, conversationId } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ success: false, message: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    const result = await AiService.chat(session.user.id, message, conversationId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


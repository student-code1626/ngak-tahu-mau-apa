import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoalService } from '@/server/services/goal.service';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const goals = await GoalService.getGoals(session.user.id);
    return NextResponse.json({ success: true, data: goals });
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

    if (action === 'CREATE') {
      const goal = await GoalService.createGoal(session.user.id, data);
      return NextResponse.json({ success: true, data: goal }, { status: 201 });
    }

    if (action === 'ALLOCATE') {
      const updated = await GoalService.allocateToGoal(session.user.id, data.goalId, data.amount, data.sourcePos);
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'SPEND') {
      const result = await GoalService.spendGoal(
        session.user.id,
        data.goalId,
        data.walletId,
        data.spendAmount,
        data.returnExcessPos
      );
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}


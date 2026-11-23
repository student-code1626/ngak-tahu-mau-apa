import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OnboardingService } from '@/server/services/onboarding.service';
import {
  profileStepSchema,
  walletsStepSchema,
  initialAllocationStepSchema,
} from '@/domain/rules/onboarding.schema';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const state = await OnboardingService.getState(session.user.id);
    return NextResponse.json({ success: true, data: state });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { step, data } = body;

    if (step === 1) {
      const validated = profileStepSchema.safeParse(data);
      if (!validated.success) {
        return NextResponse.json(
          { success: false, errors: validated.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const updated = await OnboardingService.saveProfile(session.user.id, validated.data);
      return NextResponse.json({ success: true, data: updated });
    }

    if (step === 2) {
      const validated = walletsStepSchema.safeParse(data);
      if (!validated.success) {
        return NextResponse.json(
          { success: false, errors: validated.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const wallets = await OnboardingService.saveWallets(session.user.id, validated.data);
      return NextResponse.json({ success: true, data: wallets });
    }

    if (step === 3) {
      const validated = initialAllocationStepSchema.safeParse(data);
      if (!validated.success) {
        return NextResponse.json(
          { success: false, errors: validated.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const result = await OnboardingService.completeAllocation(session.user.id, validated.data);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, message: 'Invalid onboarding step' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal menyimpan onboarding' },
      { status: 400 }
    );
  }
}


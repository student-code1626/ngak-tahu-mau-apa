import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [profile, incomeRules] = await Promise.all([
      prisma.profile.findUnique({ where: { userId: session.user.id } }),
      prisma.incomeRule.findMany({ where: { userId: session.user.id } }),
    ]);

    return NextResponse.json({ success: true, data: { profile, incomeRules } });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { profile, routineRule, irregularRule } = body;

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Update Profile
      const updatedProfile = await tx.profile.update({
        where: { userId: session.user.id },
        data: {
          displayName: profile.displayName,
          budgetStartDay: Number(profile.budgetStartDay),
          baseCurrency: profile.baseCurrency,
          incomeType: profile.incomeType,
          occupation: profile.occupation || null,
          primaryGoal: profile.primaryGoal || null,
          preferredHour: Number(profile.preferredHour),
        },
      });

      // 2. Update Routine Income Rule
      if (routineRule) {
        await tx.incomeRule.upsert({
          where: {
            userId_incomeType: {
              userId: session.user.id,
              incomeType: 'ROUTINE',
            },
          },
          update: {
            savingPct: new Prisma.Decimal(routineRule.savingPct.toString()),
            livingPct: new Prisma.Decimal(routineRule.livingPct.toString()),
            playingPct: new Prisma.Decimal(routineRule.playingPct.toString()),
            emergencyPct: new Prisma.Decimal(routineRule.emergencyPct.toString()),
            savingsPct: new Prisma.Decimal(routineRule.savingsPct.toString()),
            investPct: new Prisma.Decimal(routineRule.investPct.toString()),
            goalsPct: new Prisma.Decimal(routineRule.goalsPct.toString()),
          },
          create: {
            userId: session.user.id,
            incomeType: 'ROUTINE',
            savingPct: new Prisma.Decimal(routineRule.savingPct.toString()),
            livingPct: new Prisma.Decimal(routineRule.livingPct.toString()),
            playingPct: new Prisma.Decimal(routineRule.playingPct.toString()),
            emergencyPct: new Prisma.Decimal(routineRule.emergencyPct.toString()),
            savingsPct: new Prisma.Decimal(routineRule.savingsPct.toString()),
            investPct: new Prisma.Decimal(routineRule.investPct.toString()),
            goalsPct: new Prisma.Decimal(routineRule.goalsPct.toString()),
          },
        });
      }

      // 3. Update Irregular Income Rule
      if (irregularRule) {
        await tx.incomeRule.upsert({
          where: {
            userId_incomeType: {
              userId: session.user.id,
              incomeType: 'IRREGULAR',
            },
          },
          update: {
            savingPct: new Prisma.Decimal(irregularRule.savingPct.toString()),
            livingPct: new Prisma.Decimal(irregularRule.livingPct.toString()),
            playingPct: new Prisma.Decimal(irregularRule.playingPct.toString()),
          },
          create: {
            userId: session.user.id,
            incomeType: 'IRREGULAR',
            savingPct: new Prisma.Decimal(irregularRule.savingPct.toString()),
            livingPct: new Prisma.Decimal(irregularRule.livingPct.toString()),
            playingPct: new Prisma.Decimal(irregularRule.playingPct.toString()),
            emergencyPct: new Prisma.Decimal('50.00'),
            savingsPct: new Prisma.Decimal('20.00'),
            investPct: new Prisma.Decimal('20.00'),
            goalsPct: new Prisma.Decimal('10.00'),
          },
        });
      }

      return updatedProfile;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}


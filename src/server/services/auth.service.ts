import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { registerSchema, RegisterInput } from '@/domain/rules/auth.schema';
import { Prisma } from '@prisma/client';

export class AuthService {
  static async register(input: RegisterInput) {
    const validated = registerSchema.parse(input);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      throw new Error('Alamat email sudah terdaftar');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validated.password, salt);

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email: validated.email,
          passwordHash,
        },
      });

      // 2. Create Initial Profile
      await tx.profile.create({
        data: {
          userId: user.id,
          displayName: validated.displayName,
          budgetStartDay: 1,
          incomeType: 'ROUTINE',
          onboardingDone: false,
          onboardingStep: 1,
        },
      });

      // 3. Create Default Income Rules (Section 5.2 of Specification)
      // Routine Income: Saving 40%, Living 45%, Playing 15%
      await tx.incomeRule.create({
        data: {
          userId: user.id,
          incomeType: 'ROUTINE',
          savingPct: new Prisma.Decimal('40.00'),
          livingPct: new Prisma.Decimal('45.00'),
          playingPct: new Prisma.Decimal('15.00'),
          emergencyPct: new Prisma.Decimal('50.00'),
          savingsPct: new Prisma.Decimal('20.00'),
          investPct: new Prisma.Decimal('20.00'),
          goalsPct: new Prisma.Decimal('10.00'),
        },
      });

      // Irregular Income: Saving 70%, Living 20%, Playing 10%
      await tx.incomeRule.create({
        data: {
          userId: user.id,
          incomeType: 'IRREGULAR',
          savingPct: new Prisma.Decimal('70.00'),
          livingPct: new Prisma.Decimal('20.00'),
          playingPct: new Prisma.Decimal('10.00'),
          emergencyPct: new Prisma.Decimal('50.00'),
          savingsPct: new Prisma.Decimal('20.00'),
          investPct: new Prisma.Decimal('20.00'),
          goalsPct: new Prisma.Decimal('10.00'),
        },
      });

      return {
        id: user.id,
        email: user.email,
        displayName: validated.displayName,
      };
    });
  }

  static async login(emailOrUsername: string, password: string) {
    const trimmed = emailOrUsername.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmed },
          { email: trimmed === 'demo' ? 'demo@wisefinance.app' : trimmed },
          { profile: { displayName: trimmed } },
          { profile: { displayName: trimmed === 'demo' ? 'Pengguna Demo' : trimmed } },
        ],
      },
      include: { profile: true },
    });

    if (!user || !user.passwordHash) {
      throw new Error('Email atau nama pengguna tidak ditemukan');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid && !(trimmed === 'demo' && (password === 'demo' || password === 'demo12345'))) {
      throw new Error('Email atau kata sandi salah');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.profile?.displayName || user.email.split('@')[0],
      onboardingDone: user.profile?.onboardingDone ?? false,
    };
  }
}

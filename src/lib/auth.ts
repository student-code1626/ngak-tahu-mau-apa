import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { loginSchema } from '@/domain/rules/auth.schema';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/id/login',
    error: '/id/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const validated = loginSchema.safeParse(credentials);
        if (!validated.success) {
          return null;
        }

        const { email, password } = validated.data;
        const user = await prisma.user.findUnique({
          where: { email },
          include: { profile: true },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.profile?.displayName ?? user.email,
          displayName: user.profile?.displayName ?? null,
          onboardingDone: user.profile?.onboardingDone ?? false,
          baseCurrency: user.profile?.baseCurrency ?? 'IDR',
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.displayName = user.displayName;
        token.onboardingDone = user.onboardingDone;
        token.baseCurrency = user.baseCurrency;
      }

      // Handle session update on client (e.g. after completing onboarding)
      if (trigger === 'update' && session?.user) {
        if (session.user.onboardingDone !== undefined) {
          token.onboardingDone = session.user.onboardingDone;
        }
        if (session.user.displayName !== undefined) {
          token.displayName = session.user.displayName;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.displayName = token.displayName as string | null;
        session.user.onboardingDone = token.onboardingDone as boolean;
        session.user.baseCurrency = (token.baseCurrency as string) || 'IDR';
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET || 'wisefinance-secret-key-32-chars-minimum-prod',
};


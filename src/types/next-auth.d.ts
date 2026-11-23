import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      displayName?: string | null;
      onboardingDone?: boolean;
      baseCurrency?: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    displayName?: string | null;
    onboardingDone?: boolean;
    baseCurrency?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    displayName?: string | null;
    onboardingDone?: boolean;
    baseCurrency?: string;
  }
}


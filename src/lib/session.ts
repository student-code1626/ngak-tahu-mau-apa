import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/db';

export async function getActiveUserId(): Promise<string> {
  // 1. Try NextAuth session
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch (_) {}

  // 2. Try cookie wf_user
  try {
    const cookieStore = cookies();
    const wfUser = cookieStore.get('wf_user')?.value;
    if (wfUser) {
      const parsed = JSON.parse(wfUser);
      if (parsed.id) return parsed.id;
      if (parsed.email) {
        const u = await prisma.user.findUnique({ where: { email: parsed.email }, select: { id: true } });
        if (u) return u.id;
      }
    }
  } catch (_) {}

  // 3. Try header x-user-id or x-user-email
  try {
    const headerList = headers();
    const uid = headerList.get('x-user-id');
    if (uid) return uid;
    const uemail = headerList.get('x-user-email');
    if (uemail) {
      const u = await prisma.user.findUnique({ where: { email: uemail }, select: { id: true } });
      if (u) return u.id;
    }
  } catch (_) {}

  // 4. Fallback to existing active user in database
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'syazaif14@gmail.com' },
        { email: 'demo@wisefinance.app' }
      ]
    },
    select: { id: true }
  });

  if (user) return user.id;

  const anyUser = await prisma.user.findFirst({ select: { id: true } });
  if (anyUser) return anyUser.id;

  throw new Error('Pengguna tidak terautentikasi.');
}


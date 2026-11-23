import { NextResponse } from 'next/server';
import { AuthService } from '@/server/services/auth.service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { emailOrUsername, email, username, password } = body;
    const identifier = emailOrUsername || email || username;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: 'Harap isi nama pengguna/email dan kata sandi.' },
        { status: 400 }
      );
    }

    const user = await AuthService.login(identifier, password);
    const res = NextResponse.json({ success: true, user });

    // Set a lightweight auth cookie
    res.cookies.set('wf_user', JSON.stringify(user), {
      httpOnly: false,
      path: '/',
      maxAge: 30 * 24 * 3600,
      sameSite: 'lax',
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal masuk' },
      { status: 401 }
    );
  }
}


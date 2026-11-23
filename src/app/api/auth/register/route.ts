import { NextResponse } from 'next/server';
import { AuthService } from '@/server/services/auth.service';
import { registerSchema } from '@/domain/rules/auth.schema';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, errors: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const user = await AuthService.register(validated.data);
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan saat pendaftaran' },
      { status: 400 }
    );
  }
}


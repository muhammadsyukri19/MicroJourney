import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User, { ensureDefaultUsers } from '@/lib/models/User';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    await ensureDefaultUsers();

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email dan password wajib diisi.' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.password !== String(password)) {
      return NextResponse.json(
        { ok: false, error: 'Email atau password salah. Coba periksa kembali.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        className: user.className || '',
        createdBy: user.createdBy || '',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada server saat verifikasi login.';
    console.error('[POST /api/auth/login]', err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

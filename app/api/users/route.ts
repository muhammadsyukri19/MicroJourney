import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User, { ensureDefaultUsers } from '@/lib/models/User';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await ensureDefaultUsers();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const createdBy = searchParams.get('createdBy');
    const className = searchParams.get('className');

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (createdBy) filter.createdBy = createdBy.toLowerCase();
    if (className) filter.className = className;

    const users = await User.find(filter).sort({ createdAt: -1 }).lean();

    const formatted = users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      password: u.password,
      role: u.role,
      className: u.className || '',
      createdBy: u.createdBy || '',
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ ok: true, data: formatted });
  } catch (err) {
    console.error('[GET /api/users]', err);
    return NextResponse.json(
      { ok: false, error: 'Gagal mengambil data pengguna.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    await ensureDefaultUsers();

    const body = await req.json();
    const { name, email, password, role = 'student', className = '', createdBy = '' } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Nama, email, dan password wajib diisi.' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check existing email
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      // If student with same email, update details
      if (role === 'student' && existing.role === 'student') {
        existing.name = String(name).trim();
        existing.password = String(password);
        existing.className = String(className).trim();
        if (createdBy) existing.createdBy = String(createdBy);
        await existing.save();

        return NextResponse.json({
          ok: true,
          message: 'Akun siswa diperbarui.',
          user: {
            id: existing._id.toString(),
            name: existing.name,
            email: existing.email,
            password: existing.password,
            role: existing.role,
            className: existing.className,
            createdBy: existing.createdBy,
          },
        });
      }

      return NextResponse.json(
        { ok: false, error: 'Email sudah terdaftar untuk akun lain.' },
        { status: 409 }
      );
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: String(password),
      role,
      className: String(className).trim(),
      createdBy: String(createdBy).trim(),
    });

    return NextResponse.json(
      {
        ok: true,
        message: 'Pengguna berhasil didaftarkan.',
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          password: user.password,
          role: user.role,
          className: user.className,
          createdBy: user.createdBy,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/users]', err);
    return NextResponse.json(
      { ok: false, error: 'Gagal mendaftarkan pengguna ke database.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const teacher = searchParams.get('teacher');
    const className = searchParams.get('className') || searchParams.get('class');

    const filter: Record<string, unknown> = { role: 'student' };
    if (teacher) filter.createdBy = teacher.toLowerCase();
    if (className) filter.className = className;

    const students = await User.find(filter).sort({ createdAt: -1 }).lean();
    const formatted = students.map(u => ({
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
    console.error('[GET /api/users/students]', err);
    return NextResponse.json({ ok: false, error: 'Gagal mengambil data siswa' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, email, password, className = '', createdBy = '' } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ ok: false, error: 'Semua kolom wajib diisi' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const student = await User.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          name: String(name).trim(),
          password: String(password),
          role: 'student',
          className: String(className).trim(),
          createdBy: String(createdBy).trim(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      ok: true,
      data: {
        id: student._id.toString(),
        name: student.name,
        email: student.email,
        password: student.password,
        role: student.role,
        className: student.className,
        createdBy: student.createdBy,
      },
    });
  } catch (err) {
    console.error('[POST /api/users/students]', err);
    return NextResponse.json({ ok: false, error: 'Gagal menyimpan data siswa' }, { status: 500 });
  }
}

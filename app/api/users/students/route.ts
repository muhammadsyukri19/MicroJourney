import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';

export async function GET() {
  try {
    await connectDB();
    const students = await User.find({ role: 'student' }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({
      ok: true,
      data: students.map(s => ({
        id: s._id.toString(),
        name: s.name,
        email: s.email,
        role: s.role,
        className: s.className || '-',
        school: s.school || '',
        createdBy: s.createdBy ? s.createdBy.toString() : '',
      }))
    });
  } catch (err) {
    console.error('[GET /api/users/students]', err);
    return NextResponse.json({ ok: false, error: 'Gagal mengambil data siswa' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    // Support single student object or array of students (bulk import)
    const items = Array.isArray(body) ? body : [body];
    const created: any[] = [];

    for (const item of items) {
      if (!item.name || !item.email) continue;
      const normalizedEmail = item.email.trim().toLowerCase();

      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        // Update class or info if already existing
        existing.name = item.name.trim();
        existing.className = item.className || existing.className || '-';
        if (item.password) existing.password = item.password;
        await existing.save();
        created.push({
          id: existing._id.toString(),
          name: existing.name,
          email: existing.email,
          role: existing.role,
          className: existing.className,
        });
      } else {
        const newUser = await User.create({
          name: item.name.trim(),
          email: normalizedEmail,
          password: item.password || `${normalizedEmail.split('@')[0]}123`,
          role: 'student',
          className: item.className || '-',
          school: item.school || 'SMP',
        });
        created.push({
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          className: newUser.className,
        });
      }
    }

    return NextResponse.json({ ok: true, count: created.length, data: created }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/users/students]', err);
    return NextResponse.json({ ok: false, error: 'Gagal menyimpan data siswa ke database' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const id = req.nextUrl.searchParams.get('id');
    const email = req.nextUrl.searchParams.get('email');

    if (!id && !email) {
      return NextResponse.json({ ok: false, error: 'ID atau email diperlukan' }, { status: 400 });
    }

    if (id) {
      await User.findByIdAndDelete(id);
    } else if (email) {
      await User.deleteOne({ email: email.trim().toLowerCase() });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/users/students]', err);
    return NextResponse.json({ ok: false, error: 'Gagal menghapus siswa' }, { status: 500 });
  }
}

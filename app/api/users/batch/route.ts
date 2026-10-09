import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';

interface BatchStudentInput {
  name: string;
  email: string;
  password: string;
  className: string;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { students, createdBy = '' } = body as { students: BatchStudentInput[]; createdBy?: string };

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Data siswa tidak valid atau kosong.' },
        { status: 400 }
      );
    }

    const savedStudents = [];
    const failedStudents: string[] = [];

    for (const item of students) {
      if (!item.name || !item.email || !item.password) {
        failedStudents.push(`${item.name || 'Siswa'} (data tidak lengkap)`);
        continue;
      }

      const normalizedEmail = item.email.trim().toLowerCase();

      try {
        const user = await User.findOneAndUpdate(
          { email: normalizedEmail },
          {
            $set: {
              name: item.name.trim(),
              password: item.password,
              role: 'student',
              className: (item.className || '').trim(),
              createdBy: createdBy.trim(),
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        savedStudents.push({
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          password: user.password,
          role: user.role,
          className: user.className,
          createdBy: user.createdBy,
        });
      } catch (e) {
        console.error(`Failed to upsert student ${item.email}:`, e);
        failedStudents.push(`${item.name} (${normalizedEmail})`);
      }
    }

    return NextResponse.json({
      ok: true,
      count: savedStudents.length,
      users: savedStudents,
      failed: failedStudents,
    });
  } catch (err) {
    console.error('[POST /api/users/batch]', err);
    return NextResponse.json(
      { ok: false, error: 'Gagal memproses pendaftaran massal siswa.' },
      { status: 500 }
    );
  }
}

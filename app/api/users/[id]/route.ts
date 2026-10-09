import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import mongoose from 'mongoose';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;

    let query: Record<string, unknown> = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { _id: id };
    } else {
      query = { email: id.toLowerCase() };
    }

    const deleted = await User.findOneAndDelete(query);
    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: 'Pengguna tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, message: 'Pengguna berhasil dihapus.' });
  } catch (err) {
    console.error('[DELETE /api/users/[id]]', err);
    return NextResponse.json(
      { ok: false, error: 'Gagal menghapus pengguna dari database.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    const body = await req.json();
    const { name, email, password, className } = body;

    let query: Record<string, unknown> = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { _id: id };
    } else {
      query = { email: id.toLowerCase() };
    }

    const user = await User.findOne(query);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Pengguna tidak ditemukan.' },
        { status: 404 }
      );
    }

    if (email) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const conflict = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
        if (conflict) {
          return NextResponse.json(
            { ok: false, error: 'Email sudah digunakan oleh akun lain.' },
            { status: 409 }
          );
        }
        user.email = normalizedEmail;
      }
    }

    if (name) user.name = String(name).trim();
    if (password) user.password = String(password);
    if (className !== undefined) user.className = String(className).trim();

    await user.save();

    return NextResponse.json({
      ok: true,
      message: 'Data pengguna berhasil diperbarui.',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        className: user.className,
        createdBy: user.createdBy,
      },
    });
  } catch (err) {
    console.error('[PUT /api/users/[id]]', err);
    return NextResponse.json(
      { ok: false, error: 'Gagal memperbarui data pengguna.' },
      { status: 500 }
    );
  }
}

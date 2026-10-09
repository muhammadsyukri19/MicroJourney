import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, school, phoneNumber, role = 'teacher' } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, message: 'Harap lengkapi nama, email, dan password' }, { status: 400 });
    }

    if (role === 'teacher' && !school) {
      return NextResponse.json({ success: false, message: 'Harap isi nama sekolah/instansi' }, { status: 400 });
    }

    let isDbConnected = false;
    try {
      await connectDB();
      isDbConnected = true;
    } catch (dbErr) {
      console.warn('[MongoDB Offline] Menggunakan fallback pendaftaran lokal:', dbErr);
    }

    if (isDbConnected) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return NextResponse.json({ success: false, message: 'Email sudah terdaftar' }, { status: 400 });
      }

      const newUser = await User.create({
        name,
        email,
        password, // Disimpan plain text untuk sementara
        school: school || '',
        phoneNumber: phoneNumber || '',
        role
      });

      const token = `mj_token_${newUser._id}_${Date.now()}`;
      const response = NextResponse.json({
        success: true,
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          school: newUser.school,
          phoneNumber: newUser.phoneNumber,
        }
      }, { status: 201 });

      response.cookies.set({
        name: 'auth_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 // 7 Hari
      });

      return response;
    } else {
      // Fallback jika MongoDB tidak terjangkau (offline / network error)
      const fallbackUser = {
        id: `teacher-${Date.now()}`,
        name,
        email,
        role: role as 'teacher' | 'student' | 'superadmin',
        school: school || '',
        phoneNumber: phoneNumber || '',
      };

      const token = `mj_token_local_${Date.now()}`;
      const response = NextResponse.json({
        success: true,
        user: fallbackUser
      }, { status: 201 });

      response.cookies.set({
        name: 'auth_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60
      });

      return response;
    }

  } catch (error: any) {
    console.error('Register API Error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

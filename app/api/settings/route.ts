import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Setting from '@/lib/models/Setting';

const DEFAULT_SETTINGS = {
  stageLocks: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true },
  announcement: 'Selamat datang di media pembelajaran MicroJourney AR IPA Kelas VIII. Selesaikan Tahap 1 hingga Tahap 6 sesuai petunjuk.',
  classList: [
    { id: 'c-1', name: 'VIII-A', academicYear: '2026/2027' },
    { id: 'c-2', name: 'VIII-B', academicYear: '2026/2027' },
    { id: 'c-3', name: 'VIII-C', academicYear: '2026/2027' },
  ]
};

export async function GET() {
  try {
    await connectDB();
    const doc = await Setting.findOne({ key: 'global_config' }).lean();
    if (!doc) {
      return NextResponse.json({ ok: true, data: DEFAULT_SETTINGS });
    }
    return NextResponse.json({ ok: true, data: doc.value });
  } catch (err) {
    console.warn('[GET /api/settings] DB error, using default settings:', err);
    return NextResponse.json({ ok: true, data: DEFAULT_SETTINGS });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const updated = await Setting.findOneAndUpdate(
      { key: 'global_config' },
      { key: 'global_config', value: body },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true, data: updated.value });
  } catch (err) {
    console.error('[POST /api/settings] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menyimpan pengaturan' }, { status: 500 });
  }
}

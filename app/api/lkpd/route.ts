import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import LkpdSubmission from '@/lib/models/LkpdSubmission';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const sessionId = body.sessionId || `manual-${Date.now()}`;

    const updatePayload: Record<string, unknown> = {
      ...(body.studentName !== undefined && { studentName: body.studentName }),
      ...(body.studentClass !== undefined && { studentClass: body.studentClass }),
      sessionId,
      ...(body.lkpd1 !== undefined && { lkpd1: body.lkpd1 }),
      ...(body.lkpd2 !== undefined && { lkpd2: body.lkpd2 }),
      ...(body.lkpd3q1 !== undefined && { lkpd3q1: body.lkpd3q1 }),
      ...(body.lkpd3q2 !== undefined && { lkpd3q2: body.lkpd3q2 }),
      ...(body.lkpd4 !== undefined && { lkpd4: body.lkpd4 }),
      ...(body.commitment !== undefined && { commitment: body.commitment }),
      ...(body.totalParticles !== undefined && { totalParticles: Number(body.totalParticles) }),
      ...(body.mostDangerousOrgan !== undefined && { mostDangerousOrgan: body.mostDangerousOrgan }),
      ...(body.selectedFoods !== undefined && { selectedFoods: body.selectedFoods }),
      ...(body.studentAccountEmail !== undefined && { studentAccountEmail: body.studentAccountEmail }),
      ...(body.assessmentEligible !== undefined && { assessmentEligible: Boolean(body.assessmentEligible) }),
      ...(body.quizCorrect !== undefined && { quizCorrect: Number(body.quizCorrect) }),
      ...(body.quizWrong !== undefined && { quizWrong: Number(body.quizWrong) }),
    };

    const submission = await LkpdSubmission.findOneAndUpdate(
      { sessionId },
      { $set: updatePayload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ ok: true, id: submission._id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/lkpd]', err);
    return NextResponse.json({ ok: false, error: 'Gagal menyimpan data' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const className = searchParams.get('class') || searchParams.get('className');

    const filter: Record<string, unknown> = {};
    if (className) {
      filter.studentClass = className;
    }

    const data = await LkpdSubmission.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return NextResponse.json({ ok: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal mengambil data';
    console.error('[GET /api/lkpd]', err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

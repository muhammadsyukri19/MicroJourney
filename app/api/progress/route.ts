import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Progress from '@/lib/models/Progress';

const DEFAULT_STUDENT_ID = 'student_001';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const studentId = request.nextUrl.searchParams.get('studentId') || DEFAULT_STUDENT_ID;

    // Membaca progres tidak boleh membuat data baru; data dibuat saat tahap pertama selesai
    const progress = await Progress.findOne({ studentId });
    return NextResponse.json(progress ?? { studentId, completedStages: [], currentStage: 1, xp: 0 });
  } catch (error) {
    console.error('GET /api/progress error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { studentId = DEFAULT_STUDENT_ID, completedStage, xpEarned } = body;

    const progress = await Progress.findOneAndUpdate(
      { studentId },
      {
        $addToSet: { completedStages: completedStage },
        $inc: { xp: xpEarned || 0 },
        $set: { currentStage: completedStage + 1 },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(progress);
  } catch (error) {
    console.error('POST /api/progress error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

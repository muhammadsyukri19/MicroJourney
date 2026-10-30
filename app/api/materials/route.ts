import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Setting from '@/lib/models/Setting';

export interface CurriculumMaterial {
  id: string;
  stageNumber: number;
  title: string;
  subtitle: string;
  learningOutcome: string; // Capaian Pembelajaran (CP / TP)
  scientificReference: string; // Leslie et al. 2022 / BRIN 2023
  summary: string;
  videoUrl: string;
  status: 'published' | 'draft' | 'archived';
  estimatedMinutes: number;
  updatedAt?: string;
}

export const DEFAULT_MATERIALS: CurriculumMaterial[] = [
  {
    id: 'mat-001',
    stageNumber: 1,
    title: 'AR Scanner Plastik & Kode Resin Polimer',
    subtitle: 'Stimulation & Investigasi Struktur Polimer',
    learningOutcome: 'Peserta didik mampu mengidentifikasi karakteristik dan kode daur ulang 6 jenis plastik (PET, HDPE, PVC, LDPE, PP, PS) serta menganalisis stabilitas rantai karbon polimer sintetis.',
    scientificReference: 'Leslie et al. (2022) Discovery of microplastics in human blood. Environment International.',
    summary: 'Pengamatan struktur polimer sintetis buatan manusia yang tidak dapat dicerna enzim biologis. Menjelaskan mengapa plastik PET bertahan hingga 450 tahun di biosfer.',
    videoUrl: 'https://www.youtube.com/watch?v=Qjh_g5j7cVo',
    status: 'published',
    estimatedMinutes: 30,
  },
  {
    id: 'mat-002',
    stageNumber: 2,
    title: 'Simulasi Fotodegradasi UV & Abrasi Ombak',
    subtitle: 'Data Collection & Pelapukan Mikroplastik',
    learningOutcome: 'Peserta didik mampu membuktikan secara virtual bagaimana radiasi sinar ultraviolet matahari memutus ikatan karbon polimer dan abrasi mekanis ombak memecah plastik menjadi fragmen < 5mm.',
    scientificReference: 'Thompson et al. (2004) Lost at sea: Where is all the plastic? Science, 304(5672).',
    summary: 'Eksperimen virtual lab interaktif: kombinasi fotooksidasi UV, suhu tinggi, dan energi kinetik ombak laut mendegradasi makroplastik menjadi mikropartikel berbahaya.',
    videoUrl: 'https://www.youtube.com/embed/ju_2NuK5O-E',
    status: 'published',
    estimatedMinutes: 45,
  },
  {
    id: 'mat-003',
    stageNumber: 3,
    title: 'Kontaminasi Rantai Makanan & Bioakumulasi Laut',
    subtitle: 'Data Collection & Trofik Ekologi Laut',
    learningOutcome: 'Peserta didik mampu melacak fenomena biomagnifikasi partikel mikroplastik dari zooplankton penyaring, kerang, garam rakyat, hingga ikan konsumsi manusia.',
    scientificReference: 'BRIN (2023) Kontaminasi Mikroplastik pada Garam Rakyat & Sedimen Pesisir Indonesia.',
    summary: 'Analisis kontaminasi pada 5 sampel pangan harian (garam laut, kerang dara, ikan tongkol, air kemasan, udang). Rata-rata manusia mengonsumsi 5 gram mikroplastik per minggu.',
    videoUrl: 'https://www.youtube.com/watch?v=ju_2NuK5O-E',
    status: 'published',
    estimatedMinutes: 40,
  },
  {
    id: 'mat-004',
    stageNumber: 4,
    title: 'Translokasi Organ Pencernaan & Sirkulasi Vaskular',
    subtitle: 'Data Processing & Anatomi Bioakumulasi',
    learningOutcome: 'Peserta didik mampu menelaah rute perjalanan mikroplastik melalui traktus gastrointestinal (mulut, lambung, vili usus halus) hingga translokasi ke sistem peredaran darah.',
    scientificReference: 'Vethaak & Legler (2021) Microplastics and human health. Science, 371(6530).',
    summary: 'Simulasi visual anatomi tubuh manusia ketika partikel mikroplastik menembus tight junction dinding usus, memicu inflamasi mikro, dan terbawa aliran darah.',
    videoUrl: 'https://www.youtube.com/watch?v=ju_2NuK5O-E',
    status: 'published',
    estimatedMinutes: 35,
  },
  {
    id: 'mat-005',
    stageNumber: 5,
    title: 'E-LKPD Interaktif & Pembuktian Hipotesis',
    subtitle: 'Verification & Evaluasi Kritis',
    learningOutcome: 'Peserta didik mampu menyusun kesimpulan berbasis bukti, menjawab kuis pemahaman mendalam, dan mengevaluasi hipotesis awal mengenai dampak pencemaran plastik.',
    scientificReference: 'Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi (Kurikulum Merdeka IPA Fase D).',
    summary: 'Lembar kerja peserta didik elektronik dengan penilaian otomatis kuis ganda dan evaluasi esai berbasis rubrik saintifik.',
    videoUrl: '',
    status: 'published',
    estimatedMinutes: 50,
  },
  {
    id: 'mat-006',
    stageNumber: 6,
    title: 'Sumpah Aksi Nyata & Advokasi Kebijakan 3R',
    subtitle: 'Generalization & Komitmen Karakter Lingkungan',
    learningOutcome: 'Peserta didik mampu merumuskan janji komitmen pengurangan plastik sekali pakai dan mengidentifikasi peran multi-stakeholder dalam penanganan sampah laut.',
    scientificReference: 'KLHK RI (2023) Rencana Aksi Nasional Penanganan Sampah Laut (RAN PSL).',
    summary: 'Puncak ekspedisi: ikrar komitmen siswa, penyimpanan sertifikat digital, dan sinkronisasi data komprehensif ke dashboard evaluasi guru & admin.',
    videoUrl: '',
    status: 'published',
    estimatedMinutes: 25,
  },
];

export async function GET() {
  try {
    await connectDB();
    const doc = await Setting.findOne({ key: 'curriculum_materials' }).lean();
    if (!doc || !Array.isArray(doc.value) || doc.value.length === 0) {
      return NextResponse.json({ ok: true, data: DEFAULT_MATERIALS });
    }
    return NextResponse.json({ ok: true, data: doc.value });
  } catch (err) {
    console.warn('[GET /api/materials] DB error, using default materials:', err);
    return NextResponse.json({ ok: true, data: DEFAULT_MATERIALS });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    let listToSave: CurriculumMaterial[] = [];

    if (Array.isArray(body)) {
      listToSave = body;
    } else if (body && typeof body === 'object') {
      const doc = await Setting.findOne({ key: 'curriculum_materials' }).lean();
      const currentList: CurriculumMaterial[] = (doc && Array.isArray(doc.value)) ? doc.value : DEFAULT_MATERIALS;

      if (body.id) {
        listToSave = currentList.map(m => m.id === body.id ? { ...m, ...body, updatedAt: new Date().toISOString() } : m);
      } else {
        const newItem: CurriculumMaterial = {
          id: `mat-${Date.now()}`,
          stageNumber: currentList.length + 1,
          status: 'published',
          estimatedMinutes: 30,
          ...body,
          updatedAt: new Date().toISOString(),
        };
        listToSave = [...currentList, newItem];
      }
    }

    const updated = await Setting.findOneAndUpdate(
      { key: 'curriculum_materials' },
      { key: 'curriculum_materials', value: listToSave },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true, data: updated.value, message: 'Materi kurikulum berhasil disimpan.' });
  } catch (err) {
    console.error('[POST /api/materials] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menyimpan materi kurikulum' }, { status: 500 });
  }
}

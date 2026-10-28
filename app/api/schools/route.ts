import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Setting from '@/lib/models/Setting';

export interface SchoolItem {
  id: string;
  npsn: string;
  name: string;
  jenjang: 'SMP' | 'MTs' | 'SMA/MA';
  status: 'Negeri' | 'Swasta';
  akreditasi: 'A' | 'B' | 'C' | 'Belum Terakreditasi';
  city: string;
  province: string;
  address: string;
  principal: string;
  phone: string;
  isActive: boolean;
  createdAt?: string;
}

export const DEFAULT_SCHOOLS: SchoolItem[] = [
  {
    id: 'sch-001',
    npsn: '10105342',
    name: 'SMP Negeri 1 Banda Aceh',
    jenjang: 'SMP',
    status: 'Negeri',
    akreditasi: 'A',
    city: 'Kota Banda Aceh',
    province: 'Aceh',
    address: 'Jl. Prof. A. Majid Ibrahim I No. 1, Kampung Baru',
    principal: 'Dra. Rasyidah, M.Pd.',
    phone: '(0651) 22345',
    isActive: true,
  },
  {
    id: 'sch-002',
    npsn: '10105344',
    name: 'SMP Negeri 3 Banda Aceh',
    jenjang: 'SMP',
    status: 'Negeri',
    akreditasi: 'A',
    city: 'Kota Banda Aceh',
    province: 'Aceh',
    address: 'Jl. Prof. A. Majid Ibrahim No. 7',
    principal: 'Drs. Syarifuddin, M.Pd.',
    phone: '(0651) 21102',
    isActive: true,
  },
  {
    id: 'sch-003',
    npsn: '10114751',
    name: 'MTs Negeri 1 Model Banda Aceh',
    jenjang: 'MTs',
    status: 'Negeri',
    akreditasi: 'A',
    city: 'Kota Banda Aceh',
    province: 'Aceh',
    address: 'Jl. Pocut Baren No. 114, Keudah',
    principal: 'Hj. Junaidah, S.Ag., M.Pd.',
    phone: '(0651) 23891',
    isActive: true,
  },
  {
    id: 'sch-004',
    npsn: '10107293',
    name: 'SMP Labschool USK Banda Aceh',
    jenjang: 'SMP',
    status: 'Swasta',
    akreditasi: 'A',
    city: 'Kota Banda Aceh',
    province: 'Aceh',
    address: 'Komplek Universitas Syiah Kuala, Darussalam',
    principal: 'Dr. Muhammad Nasir, M.Si.',
    phone: '(0651) 75522',
    isActive: true,
  },
];

export async function GET() {
  try {
    await connectDB();
    const doc = await Setting.findOne({ key: 'schools_list' }).lean();
    if (!doc || !Array.isArray(doc.value) || doc.value.length === 0) {
      return NextResponse.json({ ok: true, data: DEFAULT_SCHOOLS });
    }
    return NextResponse.json({ ok: true, data: doc.value });
  } catch (err) {
    console.warn('[GET /api/schools] DB error, using default schools:', err);
    return NextResponse.json({ ok: true, data: DEFAULT_SCHOOLS });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    let listToSave: SchoolItem[] = [];

    // Support single item push or full list replacement
    if (Array.isArray(body)) {
      listToSave = body;
    } else if (body && typeof body === 'object') {
      const doc = await Setting.findOne({ key: 'schools_list' }).lean();
      const currentList: SchoolItem[] = (doc && Array.isArray(doc.value)) ? doc.value : DEFAULT_SCHOOLS;

      if (body.id) {
        // Edit existing or append
        const exists = currentList.some(s => s.id === body.id);
        if (exists) {
          listToSave = currentList.map(s => s.id === body.id ? { ...s, ...body } : s);
        } else {
          listToSave = [body as SchoolItem, ...currentList];
        }
      } else {
        const newItem: SchoolItem = {
          id: `sch-${Date.now()}`,
          ...body,
          isActive: body.isActive ?? true,
        };
        listToSave = [newItem, ...currentList];
      }
    }

    const updated = await Setting.findOneAndUpdate(
      { key: 'schools_list' },
      { key: 'schools_list', value: listToSave },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true, data: updated.value, message: 'Data sekolah berhasil disimpan.' });
  } catch (err) {
    console.error('[POST /api/schools] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menyimpan data sekolah' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID sekolah wajib disertakan.' }, { status: 400 });
    }

    const doc = await Setting.findOne({ key: 'schools_list' }).lean();
    const currentList: SchoolItem[] = (doc && Array.isArray(doc.value)) ? doc.value : DEFAULT_SCHOOLS;
    const filtered = currentList.filter(s => s.id !== id);

    await Setting.findOneAndUpdate(
      { key: 'schools_list' },
      { key: 'schools_list', value: filtered },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true, message: 'Sekolah berhasil dihapus.', data: filtered });
  } catch (err) {
    console.error('[DELETE /api/schools] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menghapus data sekolah' }, { status: 500 });
  }
}

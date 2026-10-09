import { NextResponse } from 'next/server';

export interface StakeholderPair {
  id: string;
  role: string;
  task: string;
  impact?: string;
  active?: boolean;
}

// Default initial stakeholder matching pairs (Based on Systemic Responsibility Literature)
let memoryStore: StakeholderPair[] = [
  {
    id: 'siswa',
    role: '🧑‍🎓 Siswa / Pelajar',
    task: 'Membawa tumbler & menolak sedotan plastik sekali pakai di kantin',
    impact: 'Duta lingkungan & menekan limbah botol plastik sekali pakai di lingkungan sekolah'
  },
  {
    id: 'pemerintah',
    role: '🏛️ Pemerintah & Regulator',
    task: 'Membuat kebijakan larangan kantong plastik & regulasi cukai limbah polimer',
    impact: 'Leverage point hulu terbesar untuk menekan 60% limbah plastik skala nasional'
  },
  {
    id: 'pabrik',
    role: '🏭 Industri & Produsen',
    task: 'Mengganti kemasan sintetis berbahan PET/PP dengan bioplastik ramah lingkungan',
    impact: 'Mencegah terbentuknya mikroplastik beracun yang sulit terurai sejak tahap manufaktur'
  },
  {
    id: 'masyarakat',
    role: '👨‍👩‍👧‍👦 Orang Tua & Keluarga',
    task: 'Selalu membawa tas belanja kain sendiri & memilah sampah dari rumah',
    impact: 'Mencegah akumulasi sampah anorganik yang terseret ke muara sungai dan laut'
  },
  {
    id: 'ritel',
    role: '🏪 Supermarket & Ritel',
    task: 'Menyediakan wadah refill & tidak menyediakan kantong plastik belanja',
    impact: 'Mendorong budaya gaya hidup berkelanjutan pada transaksi belanja harian'
  }
];

export async function GET() {
  return NextResponse.json({ ok: true, data: memoryStore });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.role || !body.task) {
      return NextResponse.json({ ok: false, error: 'Role dan Task wajib diisi' }, { status: 400 });
    }

    const newItem: StakeholderPair = {
      id: body.id || `stk-${Date.now()}`,
      role: body.role,
      task: body.task,
      impact: body.impact || 'Mendukung keberlanjutan ekosistem laut',
      active: true
    };

    memoryStore.push(newItem);
    return NextResponse.json({ ok: true, data: newItem });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID diperlukan' }, { status: 400 });
    }

    memoryStore = memoryStore.filter(item => item.id !== id);
    return NextResponse.json({ ok: true, message: 'Item berhasil dihapus' });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

/**
 * lib/dragDropData.ts
 * Data untuk aktivitas drag & drop dan materi interaktif Tahap 3.
 * Semua konten dapat dimodifikasi di sini tanpa menyentuh komponen UI.
 */

export interface DragItem {
  id: string;
  label: string;
  description: string;
  /** Posisi urutan yang benar (1-indexed) */
  correctOrder: number;
}

export interface MateriCard {
  icon: string;
  title: string;
  description: string;
  highlight?: string;
}

// ─── Soal Drag & Drop ──────────────────────────────────────────────────────────
// Urutan yang BENAR adalah berdasarkan nilai `correctOrder` (1 = pertama, dst.)
export const MICROPLASTIC_JOURNEY_ITEMS: DragItem[] = [
  {
    id: 'step-1',
    label: 'Sampah Plastik di Lingkungan',
    description: 'Botol, kantong, sedotan, dan kemasan plastik yang dibuang sembarangan',
    correctOrder: 1,
  },
  {
    id: 'step-2',
    label: 'Terfragmentasi Menjadi Mikroplastik',
    description: 'UV matahari, ombak laut, dan angin memecah plastik menjadi partikel < 5mm',
    correctOrder: 2,
  },
  {
    id: 'step-3',
    label: 'Mikroplastik Mencemari Sungai/Laut',
    description: 'Partikel terbawa aliran air dan tersebar ke seluruh ekosistem perairan',
    correctOrder: 3,
  },
  {
    id: 'step-4',
    label: 'Dimakan oleh Ikan & Makhluk Laut',
    description: 'Organisme laut salah mengira partikel plastik sebagai plankton dan memakannya',
    correctOrder: 4,
  },
  {
    id: 'step-5',
    label: 'Ikan Dikonsumsi Manusia',
    description: 'Mikroplastik di dalam tubuh ikan masuk ke rantai makanan manusia',
    correctOrder: 5,
  },
];

// ─── Kartu Materi Ringkasan Visual ─────────────────────────────────────────────
export const STAGE3_MATERI_CARDS: MateriCard[] = [
  {
    icon: 'science',
    title: 'Apa itu Mikroplastik?',
    description:
      'Partikel plastik berukuran kurang dari 5 milimeter yang tidak dapat terurai secara alami oleh lingkungan.',
    highlight: '< 5 mm',
  },
  {
    icon: 'wb_sunny',
    title: 'Proses Pelapukan',
    description:
      'Sinar UV matahari, ombak laut, dan cuaca memecah plastik besar menjadi jutaan partikel kecil yang tidak kasat mata.',
    highlight: 'UV + Ombak + Angin',
  },
  {
    icon: 'waves',
    title: 'Penyebaran di Alam',
    description:
      'Mikroplastik terbawa sungai, angin, dan hujan hingga mencapai lautan dan sumber air minum kita.',
    highlight: '94% Lautan Tercemar',
  },
  {
    icon: 'set_meal',
    title: 'Masuk ke Rantai Makanan',
    description:
      'Ikan dan kerang menyaring partikel mikro dari air. Riset BRIN menunjukkan rata-rata 28-90 partikel per 100g daging kerang.',
    highlight: '28–90 partikel/100g',
  },
];

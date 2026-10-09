'use client';

import { motion } from 'framer-motion';
import MateriBentoCard, { BentoSummaryCard } from '@/components/molecules/materi/MateriBentoCard';

const SUMMARY_CARDS: BentoSummaryCard[] = [
  {
    badge: 'KIMIA & BAHAN',
    title: 'Polimer Sintetis Ikatan C-C',
    desc: 'Plastik seperti PET, LDPE, dan PP tersusun dari rantai karbon sintetis yang sangat kuat. Bakteri alami tidak memiliki enzim khusus untuk memutus ikatan kimia buatan manusia ini.',
    icon: 'science',
    accent: '#006591',
  },
  {
    badge: 'FISIKA LINGKUNGAN',
    title: 'Fotodegradasi & Ombak Laut',
    desc: 'Faktor radiasi ultraviolet (UV) meretakkan permukaan plastik. Hantaman energi fisik gelombang laut menghancurkannya menjadi serpihan mikro (0.1 µm – 5 mm).',
    icon: 'tsunami',
    accent: '#d27b22',
  },
  {
    badge: 'BIOLOGI LAUT',
    title: 'Bioakumulasi & Biomagnifikasi',
    desc: 'Biota laut seperti kerang filter-feeder menyaring partikel tanpa sengaja. Konsentrasi racun meningkat seiring tingkatan rantai makanan hingga sampai ke piring manusia.',
    icon: 'waves',
    accent: '#006e2f',
  },
  {
    badge: 'ANATOMI MANUSIA',
    title: 'Penyerapan Usus & Pembuluh Darah',
    desc: 'Partikel mikroplastik berkuran nano (<10 µm) sanggup menembus dinding vili usus halus dan terbawa sirkulasi darah ke organ vital seperti ginjal dan hati.',
    icon: 'cardiology',
    accent: '#ba1a1a',
  },
];

export default function MateriSummaryGrid() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12"
    >
      {SUMMARY_CARDS.map((card, idx) => (
        <MateriBentoCard key={idx} card={card} />
      ))}
    </motion.div>
  );
}

'use client';

import { motion } from 'framer-motion';
import YouTubePlayer from '@/components/ui/YouTubePlayer';
import MateriTakeawayCard, { TakeawayItem } from '@/components/molecules/materi/MateriTakeawayCard';

const KEY_TAKEAWAYS: TakeawayItem[] = [
  {
    id: 1,
    title: 'Pelapukan Mikroplastik',
    desc: 'Botol PET butuh 450 tahun untuk terurai. Sinar UV & gelombang memecahnya jadi potongan < 5mm.',
    icon: 'wb_sunny',
    color: '#d27b22',
    bg: '#fff8ec',
  },
  {
    id: 2,
    title: 'Bioakumulasi Ekosistem Laut',
    desc: 'Plankton & kerang menyaring air tercemar. Mikroplastik mengendap di jaringan tubuh ikan.',
    icon: 'waves',
    color: '#006591',
    bg: '#e4f1f9',
  },
  {
    id: 3,
    title: 'Ancaman Sistem Pencernaan',
    desc: 'Asam lambung (HCl) tidak dapat mencerna polimer sintetis. Partikel masuk ke usus halus & darah.',
    icon: 'vital_signs',
    color: '#ba1a1a',
    bg: '#fce8e6',
  },
];

interface MateriVideoSectionProps {
  onSwitchToPdf: () => void;
}

export default function MateriVideoSection({ onSwitchToPdf }: MateriVideoSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12 items-start"
    >
      {/* Left Side: Video Player Container */}
      <div className="lg:col-span-7 bg-white rounded-3xl p-5 md:p-6 shadow-xl border-2 border-[#006591]/20 flex flex-col">
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#006591]/10 text-[#006591] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">play_circle</span>
            </div>
            <div>
              <h3 className="font-bold text-[#083b54] text-base font-[family-name:var(--font-outfit)]">
                Video Simulasi Pelapukan
              </h3>
              <p className="text-[11px] text-slate-500">Durasi Pembelajaran: 4 Menit</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#6bff8f]/20 text-[#006e2f] text-[10px] font-extrabold font-[family-name:var(--font-mono)] border border-[#006e2f]/20">
            HD QUALIFIED
          </span>
        </div>

        <YouTubePlayer
          url="https://www.youtube.com/watch?v=3D6tIkBV2RM"
          title="Video Penjelasan Bahaya Mikroplastik"
        />
      </div>

      {/* Right Side: Key Takeaways Card Panel */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-[#006591]/20">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
            <span className="material-symbols-outlined text-[#006591] text-2xl">checklist</span>
            <h3 className="font-extrabold text-[#083b54] text-lg font-[family-name:var(--font-outfit)]">
              Catatan Kunci Video
            </h3>
          </div>

          <div className="space-y-3">
            {KEY_TAKEAWAYS.map((item) => (
              <MateriTakeawayCard key={item.id} item={item} />
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Ingin membaca versi teks lengkap?</span>
            <button
              onClick={onSwitchToPdf}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#006591] hover:underline"
            >
              <span>Buka Modul PDF</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

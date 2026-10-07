'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetStageTitle?: string;
}

export default function GuestLimitModal({ isOpen, onClose, targetStageTitle }: Props) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[32px] p-7 md:p-8 shadow-2xl border-4 border-[#e4f1f9] text-[#191c1e] font-[family-name:var(--font-inter)] overflow-hidden"
        >
          {/* Top Decorative Header */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#006591]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-[#f0a345]/15 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[#f2f4f6] text-[#6e7881] hover:bg-[#e4f1f9] hover:text-[#006591] flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-xl font-bold">close</span>
          </button>

          {/* Icon Badge */}
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#006591] to-[#004c6e] flex items-center justify-center shadow-lg shadow-[#006591]/30 text-white relative">
              <span className="material-symbols-outlined text-4xl">lock</span>
              <div className="absolute -bottom-1 -right-1 bg-[#f0a345] text-[#3b2313] text-[10px] font-extrabold px-2 py-0.5 rounded-full border-2 border-white font-[family-name:var(--font-outfit)]">
                2/6 MAKS
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-2xl font-extrabold text-[#083b54] text-center font-[family-name:var(--font-outfit)] mb-2">
            Fitur Terkunci untuk Tamu 🔒
          </h3>

          <p className="text-[#527788] text-sm text-center leading-relaxed mb-6">
            Mode Tamu hanya mendapatkan akses ke <strong className="text-[#006591]">Tahap 1 & Tahap 2</strong>.
            {targetStageTitle && (
              <span className="block mt-1 text-[#ba1a1a] font-semibold">
                Untuk mengakses &quot;{targetStageTitle}&quot;, kamu wajib login atau mendaftar terlebih dahulu.
              </span>
            )}
          </p>

          {/* Benefits Box */}
          <div className="bg-[#f7f9fb] border-2 border-[#e4f1f9] rounded-2xl p-4 mb-6 space-y-2.5">
            <p className="text-xs font-bold text-[#083b54] font-[family-name:var(--font-outfit)] uppercase tracking-wider mb-1">
              Keuntungan Mendaftar Akun:
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-[#3e4850]">
              <span className="material-symbols-outlined text-[#006e2f] text-base">check_circle</span>
              Akses penuh Tahap 3 s/d 6 (Kontaminasi & Sumpah)
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#3e4850]">
              <span className="material-symbols-outlined text-[#006e2f] text-base">check_circle</span>
              Penyimpanan otomatis nilai LKPD ke Dashboard Guru
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#3e4850]">
              <span className="material-symbols-outlined text-[#006e2f] text-base">check_circle</span>
              Unduh Sertifikat Resmi Penjaga Samudra
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/login')}
              className="w-full py-4 rounded-xl text-white font-extrabold text-base transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2 font-[family-name:var(--font-outfit)]"
              style={{
                background: 'linear-gradient(to bottom, #f0a345, #d27b22)',
                border: '2px solid #8e4912',
                color: '#3b2313',
                boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3), 0 5px 12px rgba(142,73,18,0.3)',
              }}
            >
              <span className="material-symbols-outlined">login</span>
              Login / Masuk Akun
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#f2f4f6] hover:bg-[#e4f1f9] text-[#527788] hover:text-[#006591] font-bold text-xs transition-colors"
            >
              Kembali ke Peta Ekspedisi
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

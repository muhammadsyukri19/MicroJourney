'use client';

import { motion } from 'framer-motion';

export default function MateriPdfSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative z-10 bg-white rounded-3xl p-5 md:p-6 mb-12 shadow-xl border-2 border-[#006591]/20 flex flex-col"
    >
      {/* Header controls for PDF */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#e4f1f9] text-[#006591] rounded-2xl flex items-center justify-center flex-shrink-0 font-bold shadow-sm">
            <span className="material-symbols-outlined text-2xl">description</span>
          </div>
          <div>
            <h3 className="font-extrabold text-[#083b54] text-lg font-[family-name:var(--font-outfit)]">
              Buku Modul Ajar — Sampah Plastik &amp; Ekosistem
            </h3>
            <p className="text-xs text-slate-500">Mata Pelajaran IPA Kelas VIII · Kurikulum Merdeka</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <a
            href="/docs/Modul_Sampah_Plastik.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#083b54] font-bold text-xs transition-all border border-slate-300 shadow-xs active:scale-95"
          >
            <span className="material-symbols-outlined text-base">open_in_new</span>
            <span>Tab Baru</span>
          </a>
          <a
            href="/docs/Modul_Sampah_Plastik.pdf"
            download="Modul_Sampah_Plastik_IPA_VIII.pdf"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#006591] hover:bg-[#004c6e] text-white font-bold text-xs transition-all shadow-md active:scale-95 font-[family-name:var(--font-outfit)]"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>Unduh PDF</span>
          </a>
        </div>
      </div>

      {/* PDF Viewer Container */}
      <div className="w-full h-[650px] md:h-[820px] bg-slate-100 rounded-2xl overflow-hidden shadow-inner relative border border-slate-200">
        <iframe
          src="/docs/Modul_Sampah_Plastik.pdf#toolbar=1"
          className="absolute top-0 left-0 w-full h-full border-none"
          title="Preview Modul PDF"
        />
      </div>
    </motion.div>
  );
}

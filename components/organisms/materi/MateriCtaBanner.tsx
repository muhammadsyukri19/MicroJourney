'use client';

import Link from 'next/link';

export default function MateriCtaBanner() {
  return (
    <div
      className="relative z-10 rounded-3xl p-8 md:p-10 text-white shadow-2xl overflow-hidden text-center max-w-4xl mx-auto"
      style={{
        background: 'linear-gradient(135deg, #083b54 0%, #006591 50%, #004c6e 100%)',
        border: '2px solid rgba(255,255,255,0.15)',
      }}
    >
      {/* Inner background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#6bff8f]/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#f0a345]/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        <span className="material-symbols-outlined text-5xl mb-3 text-[#6bff8f] inline-block animate-bounce">
          explore
        </span>
        <h2 className="font-[family-name:var(--font-outfit)] text-2xl md:text-3xl font-extrabold mb-3">
          Siap Membuktikan Pengetahuan Sainsmu?
        </h2>
        <p className="text-blue-100 text-xs md:text-sm max-w-lg mx-auto mb-6 leading-relaxed">
          Mulai ekspedisi 6 tahap MicroJourney AR. Scan sampah plastik di sekitarmu dan ikuti simulasi laboratorium virtual!
        </p>

        <Link
          href="/journey/tahap-1"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-extrabold text-[#3b2313] text-sm md:text-base shadow-lg transition-transform hover:scale-105 active:scale-95 font-[family-name:var(--font-outfit)]"
          style={{
            background: 'linear-gradient(to bottom, #f0a345, #d27b22)',
            border: '2px solid #8e4912',
            boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.2), 0 6px 16px rgba(0,0,0,0.3)',
          }}
        >
          <span>Mulai Ekspedisi Tahap 1</span>
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}

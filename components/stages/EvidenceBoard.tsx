'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';

const TOKENS = [
  { id: 't-manusia', label: 'Kelalaian Manusia / Pembuangan Plastik', icon: 'delete_forever', targetSlot: 's-akar' },
  { id: 't-alam', label: 'Fotodegradasi Lingkungan & Abrasi Fisik', icon: 'weather_mix', targetSlot: 's-proses' },
  { id: 't-distribusi', label: 'Kontaminasi Rantai Pangan (Biomagnifikasi)', icon: 'set_meal', targetSlot: 's-jalur' },
  { id: 't-klinis', label: 'Penyumbatan Mekanis Usus Halus', icon: 'coronavirus', targetSlot: 's-efek' },
];

const SLOTS = [
  { id: 's-akar', title: '1. Akar Masalah', accepts: 't-manusia', num: '1' },
  { id: 's-proses', title: '2. Proses Alam', accepts: 't-alam', num: '2' },
  { id: 's-jalur', title: '3. Jalur Distribusi', accepts: 't-distribusi', num: '3' },
  { id: 's-efek', title: '4. Efek Patologis', accepts: 't-klinis', num: '4' },
];

interface EvidenceBoardProps {
  onUnlock: () => void;
}

export default function EvidenceBoard({ onUnlock }: EvidenceBoardProps) {
  const [shuffledTokens, setShuffledTokens] = useState(TOKENS);
  const [matched, setMatched] = useState<Record<string, string>>({}); // slotId -> tokenId
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [errorShake, setErrorShake] = useState<string | null>(null);

  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setShuffledTokens([...TOKENS].sort(() => Math.random() - 0.5));
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' | 'info') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const checkSlotHit = (point: { x: number; y: number }): string | null => {
    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') return null;

    // 1. Direct DOM check at pointer location
    if (typeof document !== 'undefined') {
      const elAtPoint = document.elementFromPoint(point.x, point.y);
      if (elAtPoint) {
        const slotEl = elAtPoint.closest<HTMLElement>('[data-slot-id]');
        if (slotEl) {
          const slotId = slotEl.getAttribute('data-slot-id');
          if (slotId) return slotId;
        }
      }
    }

    // 2. Bounding Box check with generous 40px margin zone around slots
    let bestSlot: string | null = null;
    let minDistance = Infinity;

    Object.keys(slotRefs.current).forEach((slotId) => {
      const el = slotRefs.current[slotId];
      if (el) {
        const rect = el.getBoundingClientRect();
        const margin = 40;

        const isInside =
          point.x >= rect.left - margin &&
          point.x <= rect.right + margin &&
          point.y >= rect.top - margin &&
          point.y <= rect.bottom + margin;

        if (isInside) {
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dist = Math.hypot(point.x - centerX, point.y - centerY);

          if (dist < minDistance) {
            minDistance = dist;
            bestSlot = slotId;
          }
        }
      }
    });

    return bestSlot;
  };

  const handleDrag = (info: PanInfo) => {
    const currentHit = checkSlotHit(info.point);
    setHoveredSlotId(currentHit);
  };

  const attemptMatch = (tokenId: string, slotId: string) => {
    const slot = SLOTS.find((s) => s.id === slotId);
    const token = TOKENS.find((t) => t.id === tokenId);

    if (slot?.accepts === tokenId) {
      const newMatched = { ...matched, [slotId]: tokenId };
      setMatched(newMatched);
      setSelectedTokenId(null);
      playSound('success');
      showFeedback(`✅ Tepat! "${token?.label}" berhasil dipasang pada ${slot.title}.`, 'success');

      if (Object.keys(newMatched).length === SLOTS.length) {
        playSound('unlock');
        showFeedback('🎉 Luar Biasa! Semua rantai bukti berhasil terhubung!', 'success');
        setTimeout(() => onUnlock(), 800);
      }
    } else {
      playSound('error');
      setErrorShake(tokenId);
      showFeedback(`❌ Kurang tepat! "${token?.label}" bukan untuk ${slot?.title}. Coba slot lain!`, 'error');
      setTimeout(() => setErrorShake(null), 500);
    }
  };

  const handleDragEnd = (tokenId: string, info: PanInfo) => {
    const droppedSlotId = checkSlotHit(info.point);
    setDraggingTokenId(null);
    setHoveredSlotId(null);

    if (droppedSlotId) {
      attemptMatch(tokenId, droppedSlotId);
    }
  };

  const handleTokenClick = (tokenId: string) => {
    if (selectedTokenId === tokenId) {
      setSelectedTokenId(null);
    } else {
      setSelectedTokenId(tokenId);
      showFeedback('👆 Ketuk slot tujuan di atas untuk memasang bukti ini.', 'info');
    }
  };

  const handleSlotClick = (slotId: string) => {
    if (matched[slotId]) return;
    if (selectedTokenId) {
      attemptMatch(selectedTokenId, slotId);
    } else {
      showFeedback('💡 Ketuk bukti di bawah terlebih dahulu, lalu ketuk slot ini.', 'info');
    }
  };

  const playSound = (type: 'success' | 'error' | 'unlock') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'unlock') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(900, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.error('Audio error', e);
    }
  };

  return (
    <div className="w-full bg-[#f7f9fb] border-4 border-[#083b54] p-4 md:p-6 rounded-3xl shadow-xl relative mt-4">
      {/* Lakban Dekorasi */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-white/60 backdrop-blur-md rotate-2 border border-white shadow-xs pointer-events-none" />

      <h3
        className="font-extrabold text-xl md:text-2xl text-center text-[#083b54] mb-1 uppercase tracking-wider"
        style={{ fontFamily: 'var(--font-outfit)' }}
      >
        Papan Bukti Detektif
      </h3>

      {/* Petunjuk Interaksi */}
      <div className="bg-[#e4f1f9] border border-[#006591]/30 rounded-xl p-3 mb-5 max-w-xl mx-auto text-center text-xs text-[#083b54]">
        <p className="font-semibold flex items-center justify-center gap-1.5 flex-wrap">
          <span className="material-symbols-outlined text-base text-[#006591]">touch_app</span>
          <span>
            <strong>Cara Main:</strong> Seret (drag) bukti di bawah ke slot target di atas, atau ketuk bukti lalu ketuk slot tujuan!
          </span>
        </p>
      </div>

      {/* Feedback Alert Banner */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 p-3 rounded-xl text-center font-bold text-xs shadow-sm border ${
              feedbackMsg.type === 'success'
                ? 'bg-[#e6f4ea] border-[#006e2f] text-[#006e2f]'
                : feedbackMsg.type === 'error'
                ? 'bg-[#fce8e6] border-[#ba1a1a] text-[#ba1a1a]'
                : 'bg-[#e4f1f9] border-[#006591] text-[#006591]'
            }`}
          >
            {feedbackMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slots Area (Target Drop Zones - 2 cols on mobile, 4 cols on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6 relative w-full">
        {SLOTS.map((slot, index) => {
          const isFilled = !!matched[slot.id];
          const matchedToken = isFilled ? TOKENS.find((t) => t.id === matched[slot.id]) : null;
          const isHovered = hoveredSlotId === slot.id;

          return (
            <div key={slot.id} className="flex flex-col items-center relative w-full">
              {/* Wooden Board Slot */}
              <div
                ref={(el) => {
                  slotRefs.current[slot.id] = el;
                }}
                data-slot-id={slot.id}
                onClick={() => handleSlotClick(slot.id)}
                className={`flex flex-col items-center justify-between relative p-2 sm:p-3 rounded-2xl border-[3px] transition-all duration-300 w-full min-h-[120px] sm:min-h-[170px] cursor-pointer ${
                  isFilled
                    ? 'bg-gradient-to-b from-[#d27b22] to-[#a65d14] border-[#5a300a] shadow-md'
                    : isHovered
                    ? 'bg-[#006591]/20 border-[#6bff8f] scale-105 shadow-lg ring-4 ring-[#6bff8f]/50'
                    : 'bg-gradient-to-b from-[#b8651a] to-[#8b4513] border-[#5a300a] opacity-90 hover:opacity-100'
                }`}
              >
                {/* 4 Corner Bolts */}
                <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full bg-gradient-to-br from-[#ffdd86] to-[#c39400] border border-[#5a300a]" />
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full bg-gradient-to-br from-[#ffdd86] to-[#c39400] border border-[#5a300a]" />
                <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full bg-gradient-to-br from-[#ffdd86] to-[#c39400] border border-[#5a300a]" />
                <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full bg-gradient-to-br from-[#ffdd86] to-[#c39400] border border-[#5a300a]" />

                {/* Judul Slot */}
                <h4
                  className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-center relative z-10 pt-0.5 sm:pt-1 text-[#ffdf9a]"
                  style={{
                    fontFamily: 'var(--font-outfit)',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  }}
                >
                  {slot.title}
                </h4>

                {/* Content Inside Slot */}
                {isFilled && matchedToken ? (
                  <motion.div
                    initial={{ scale: 0.5, rotate: -5 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="w-full bg-white/95 backdrop-blur-xs rounded-xl p-1.5 sm:p-2 border border-[#5a300a] shadow-inner flex flex-col items-center justify-center text-center my-auto relative z-10"
                  >
                    <div className="absolute top-1 right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#006e2f] text-white text-[9px] sm:text-[10px] flex items-center justify-center font-bold">
                      ✓
                    </div>
                    <span className="material-symbols-outlined text-lg sm:text-2xl text-[#006591] mb-0.5">
                      {matchedToken.icon}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-extrabold text-[#083b54] leading-tight line-clamp-2 px-1">
                      {matchedToken.label}
                    </span>
                  </motion.div>
                ) : (
                  // Placeholder ketika kosong
                  <div className="flex flex-col items-center justify-center text-center my-auto text-[#ffdf9a]/70 p-1.5 sm:p-2 border-2 border-dashed border-[#ffdf9a]/30 rounded-xl w-full">
                    <span className="material-symbols-outlined text-xl sm:text-2xl mb-0.5 sm:mb-1 opacity-70">
                      {isHovered ? 'download' : 'add_circle_outline'}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-bold">
                      {isHovered ? 'Lepaskan Di Sini!' : `Kosong`}
                    </span>
                  </div>
                )}
              </div>

              {/* Connecting Arrow for larger screens */}
              {index < SLOTS.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                  <span className="material-symbols-outlined text-[#8b4513] text-2xl drop-shadow-sm">
                    chevron_right
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tokens Pool (Kumpulan Bukti) */}
      <div className="bg-white border-2 border-[#bec8d2] rounded-2xl p-3 sm:p-4 md:p-5 shadow-inner">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <h4 className="text-xs font-extrabold text-[#083b54] uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-[#006591]">grid_view</span>
            <span>Kumpulan Bukti (Seret atau Ketuk ke Target)</span>
          </h4>
          {selectedTokenId && (
            <button
              onClick={() => setSelectedTokenId(null)}
              className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full hover:bg-amber-200"
            >
              Batal Pilih
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:flex lg:flex-wrap lg:justify-center gap-2.5 sm:gap-4 w-full">
          <AnimatePresence>
            {shuffledTokens.map((token) => {
              const isMatched = Object.values(matched).includes(token.id);
              if (isMatched) return null;

              const isSelected = selectedTokenId === token.id;
              const isDragging = draggingTokenId === token.id;

              return (
                <motion.div
                  key={token.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: isSelected ? 1.05 : 1,
                    x: errorShake === token.id ? [-8, 8, -8, 8, 0] : 0,
                  }}
                  transition={{ duration: errorShake === token.id ? 0.4 : 0.2 }}
                  exit={{ opacity: 0, scale: 0 }}
                  drag
                  dragSnapToOrigin
                  onDragStart={() => {
                    setDraggingTokenId(token.id);
                    setSelectedTokenId(token.id);
                  }}
                  onDrag={(_, info) => handleDrag(info)}
                  onDragEnd={(_, info) => handleDragEnd(token.id, info)}
                  onClick={() => handleTokenClick(token.id)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  whileDrag={{
                    scale: 1.08,
                    zIndex: 100,
                    rotate: -2,
                    boxShadow: '0 15px 30px rgba(0,101,145,0.3)',
                  }}
                  className={`token-card w-full lg:w-[165px] h-[95px] sm:h-[105px] rounded-xl p-2 sm:p-2.5 flex flex-col items-center justify-between text-center cursor-grab active:cursor-grabbing transition-all select-none border-2 ${
                    isSelected
                      ? 'bg-[#e4f1f9] border-[#006591] ring-2 ring-[#006591]/40 shadow-lg'
                      : isDragging
                      ? 'bg-white border-[#006591] shadow-xl'
                      : 'bg-[#fcfdfe] border-[#006591]/40 hover:border-[#006591] hover:shadow-md'
                  }`}
                >
                  <div className="w-full flex items-center justify-center pt-0.5">
                    <span className="material-symbols-outlined text-2xl text-[#006591]">
                      {token.icon}
                    </span>
                  </div>

                  <span className="text-[10px] sm:text-[11px] font-bold text-[#083b54] leading-tight my-auto px-0.5">
                    {token.label}
                  </span>

                  <span className="text-[9px] text-[#648796] font-semibold">
                    {isSelected ? '✓ Terpilih' : 'Seret atau Ketuk'}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {Object.keys(matched).length === SLOTS.length && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="col-span-2 w-full p-4 bg-[#e6f4ea] border-2 border-[#006e2f] rounded-xl text-center text-[#006e2f] font-extrabold text-sm flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-2xl">verified</span>
              <span>Seluruh Bukti Berhasil Dipasang! Silakan isi kesimpulan LKPD 4 di bawah.</span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}


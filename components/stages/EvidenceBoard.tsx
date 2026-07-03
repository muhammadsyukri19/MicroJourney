'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';

const TOKENS = [
  { id: 't-manusia', label: 'Kelalaian Manusia / Pembuangan Plastik Sekali Pakai', icon: 'delete_forever' },
  { id: 't-alam', label: 'Fotodegradasi Lingkungan & Abrasi Fisik', icon: 'weather_mix' },
  { id: 't-distribusi', label: 'Kontaminasi Rantai Pangan (Biomagnifikasi)', icon: 'set_meal' },
  { id: 't-klinis', label: 'Penyumbatan Mekanis Usus Halus (Indigestible)', icon: 'coronavirus' },
];

const SLOTS = [
  { id: 's-akar', title: '1. Akar Masalah', accepts: 't-manusia', color: 'border-amber-400', bg: 'bg-amber-50' },
  { id: 's-proses', title: '2. Proses Alam', accepts: 't-alam', color: 'border-blue-400', bg: 'bg-blue-50' },
  { id: 's-jalur', title: '3. Jalur Distribusi', accepts: 't-distribusi', color: 'border-green-400', bg: 'bg-green-50' },
  { id: 's-efek', title: '4. Efek Patologis Klinis', accepts: 't-klinis', color: 'border-red-400', bg: 'bg-red-50' },
];

interface EvidenceBoardProps {
  onUnlock: () => void;
}

export default function EvidenceBoard({ onUnlock }: EvidenceBoardProps) {
  const [shuffledTokens, setShuffledTokens] = useState(TOKENS);
  const [matched, setMatched] = useState<Record<string, string>>({}); // slotId -> tokenId
  const [errorShake, setErrorShake] = useState<string | null>(null); // tokenId

  // Refs for slot hitboxes
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setShuffledTokens([...TOKENS].sort(() => Math.random() - 0.5));
  }, []);

  const handleDragEnd = (tokenId: string, info: PanInfo) => {
    // Determine which slot the pointer is over
    let droppedSlotId: string | null = null;

    Object.keys(slotRefs.current).forEach(slotId => {
      const el = slotRefs.current[slotId];
      if (el) {
        const rect = el.getBoundingClientRect();
        // Check if pointer is inside rect
        if (
          info.point.x >= rect.left &&
          info.point.x <= rect.right &&
          info.point.y >= rect.top &&
          info.point.y <= rect.bottom
        ) {
          droppedSlotId = slotId;
        }
      }
    });

    if (droppedSlotId) {
      const slot = SLOTS.find(s => s.id === droppedSlotId);
      if (slot?.accepts === tokenId) {
        // Correct match!
        const newMatched = { ...matched, [droppedSlotId]: tokenId };
        setMatched(newMatched);
        playSound('success');

        if (Object.keys(newMatched).length === SLOTS.length) {
          playSound('unlock');
          setTimeout(() => onUnlock(), 800);
        }
      } else {
        // Wrong match
        playSound('error');
        setErrorShake(tokenId);
        setTimeout(() => setErrorShake(null), 500);
      }
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
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'unlock') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(900, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) { console.error('Audio failed', e); }
  };

  return (
    <div className="w-full bg-[#f7f9fb] border-4 border-[#083b54] p-6 rounded-3xl shadow-xl relative mt-8">
      {/* Tape decoration */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-white/50 backdrop-blur-md rotate-2 border border-white shadow-sm" />
      <div className="absolute -bottom-3 right-10 w-24 h-6 bg-white/50 backdrop-blur-md -rotate-3 border border-white shadow-sm" />

      <h3 className="font-[family-name:var(--font-outfit)] font-extrabold text-2xl text-center text-[#083b54] mb-2 uppercase tracking-widest">
        Papan Bukti Detektif
      </h3>
      <p className="text-center text-sm text-[#3e4850] mb-8 max-w-lg mx-auto">
        Tarik (drag) token bukti di bawah ke dalam urutan rantai kejadian yang tepat untuk memecahkan kasus ini!
      </p>

      {/* Slots Area */}
      <div className="flex flex-col md:flex-row items-center md:items-stretch justify-center gap-4 mb-12 relative w-full">
        {SLOTS.map((slot, index) => {
          const isFilled = !!matched[slot.id];
          const matchedToken = isFilled ? TOKENS.find(t => t.id === matched[slot.id]) : null;

          return (
            <div key={slot.id} className="flex flex-col md:flex-row items-center gap-4 flex-1 w-full max-w-[240px]">
              {/* Wooden Board Slot */}
              <div 
                ref={el => { slotRefs.current[slot.id] = el; }}
                className={`flex flex-col items-center justify-start relative p-4 rounded-xl border-[3px] border-[#5a300a] transition-all duration-300 w-full shadow-[0_8px_16px_rgba(30,15,5,0.4)] ${
                  isFilled ? 'bg-gradient-to-b from-[#d27b22] to-[#a65d14]' : 'bg-gradient-to-b from-[#b8651a] to-[#8b4513] opacity-80'
                } min-h-[160px]`}
              >
                {/* Inner carved border */}
                <div className="absolute inset-2 border-2 border-[#5a300a]/50 rounded-lg pointer-events-none"></div>
                
                {/* 4 Corner Bolts */}
                <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-gradient-to-br from-[#ffdd86] to-[#c39400] border border-[#5a300a] shadow-inner"></div>
                <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-gradient-to-br from-[#ffdd86] to-[#c39400] border border-[#5a300a] shadow-inner"></div>
                <div className="absolute bottom-1 left-1 w-3 h-3 rounded-full bg-gradient-to-br from-[#ffdd86] to-[#c39400] border border-[#5a300a] shadow-inner"></div>
                <div className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-gradient-to-br from-[#ffdd86] to-[#c39400] border border-[#5a300a] shadow-inner"></div>

                <h4 
                  className={`text-xs font-[family-name:var(--font-outfit)] font-extrabold uppercase tracking-wider mb-3 text-center relative z-10 transition-colors ${isFilled ? 'text-[#ffdf9a]' : 'text-[#ffdf9a]/60'}`}
                  style={{ textShadow: isFilled ? "0 2px 2px rgba(45,20,5,0.8)" : "none" }}
                >
                  {slot.title}
                </h4>
                
                {isFilled && matchedToken && (
                  <motion.div 
                    initial={{ scale: 0, rotate: -10 }} 
                    animate={{ scale: 1, rotate: 0 }} 
                    className="w-full h-full flex flex-col items-center justify-center text-center p-2 bg-white/95 rounded-lg border-2 border-[#5a300a] shadow-inner relative z-10"
                  >
                    <span className="material-symbols-outlined text-3xl mb-1 text-[#083b54]">
                      {matchedToken.icon}
                    </span>
                    <span className="text-[11px] font-bold text-[#191c1e] leading-tight">
                      {matchedToken.label}
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Animated Arrow connecting to next slot */}
              {index < SLOTS.length - 1 && (
                <div className="flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#8b4513] text-3xl md:text-4xl animate-[bounceRight_2s_infinite] hidden md:block" style={{ filter: 'drop-shadow(2px 2px 0px rgba(255,255,255,0.5))' }}>
                    double_arrow
                  </span>
                  <span className="material-symbols-outlined text-[#8b4513] text-3xl animate-bounce md:hidden rotate-90" style={{ filter: 'drop-shadow(2px -2px 0px rgba(255,255,255,0.5))' }}>
                    double_arrow
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tokens Pool */}
      <div className="bg-white border-2 border-[#bec8d2] rounded-2xl p-6 shadow-inner">
        <h4 className="text-xs font-bold text-[#6e7881] uppercase tracking-wider mb-4 text-center">
          Kumpulan Bukti (Seret ke Atas)
        </h4>
        <div className="flex flex-wrap justify-center gap-4">
          <AnimatePresence>
            {shuffledTokens.map((token) => {
              // Hide token from pool if it is already matched
              const isMatched = Object.values(matched).includes(token.id);
              if (isMatched) return null;

              return (
                <motion.div
                  key={token.id}
                  layout
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    x: errorShake === token.id ? [-10, 10, -10, 10, 0] : 0
                  }}
                  transition={{ duration: errorShake === token.id ? 0.4 : 0.2 }}
                  exit={{ opacity: 0, scale: 0 }}
                  drag
                  dragSnapToOrigin
                  onDragEnd={(_, info) => handleDragEnd(token.id, info)}
                  whileDrag={{ scale: 1.05, zIndex: 50, rotate: -2, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                  className="bg-white border-2 border-[#006591] w-[140px] h-[120px] rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing shadow-sm hover:border-[#004c6e] hover:shadow-md"
                >
                  <span className="material-symbols-outlined text-2xl mb-1 text-[#006591]">
                    {token.icon}
                  </span>
                  <span className="text-[10px] font-bold text-[#3e4850] leading-tight">
                    {token.label}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

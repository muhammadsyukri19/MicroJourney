'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { MICROPLASTIC_JOURNEY_ITEMS, type DragItem } from '@/lib/dragDropData';

// ─── SVG Illustrations ────────────────────────────────────────────────────────
const STEP_SVG: Record<string, React.ReactNode> = {
  'step-1': (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
      <circle cx="40" cy="40" r="36" fill="#fce8e6"/>
      <rect x="28" y="34" width="24" height="22" rx="3" fill="#ba1a1a"/>
      <path d="M24 34h32" stroke="#93000a" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M32 34v-6a2 2 0 012-2h12a2 2 0 012 2v6" stroke="#93000a" strokeWidth="2" strokeLinecap="round"/>
      <path d="M34 44c0 0 3-3 12 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
      <path d="M35 50c0 0 3-2 10 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
    </svg>
  ),
  'step-2': (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
      <circle cx="40" cy="40" r="36" fill="#fff8ed"/>
      <circle cx="40" cy="26" r="10" fill="#f0a345"/>
      <path d="M40 16V10M28 26L22 23M52 26L58 23M30 18L25 13M50 18L55 13" stroke="#f0a345" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M28 54 Q40 60 52 54 Q48 46 40 44 Q32 46 28 54Z" fill="#c9e6ff" opacity="0.6"/>
      <circle cx="35" cy="51" r="3" fill="#006591" opacity="0.9"/>
      <circle cx="44" cy="55" r="2" fill="#006591" opacity="0.7"/>
      <circle cx="40" cy="48" r="1.8" fill="#006591" opacity="0.6"/>
    </svg>
  ),
  'step-3': (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
      <circle cx="40" cy="40" r="36" fill="#e4f1f9"/>
      <path d="M12 46 Q26 34 40 46 Q54 58 68 46" stroke="#006591" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M12 55 Q26 43 40 55 Q54 67 68 55" stroke="#006591" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4"/>
      <circle cx="26" cy="42" r="4" fill="#ba1a1a" opacity="0.85"/>
      <circle cx="44" cy="50" r="3" fill="#ba1a1a" opacity="0.7"/>
      <circle cx="58" cy="43" r="2.5" fill="#ba1a1a" opacity="0.6"/>
    </svg>
  ),
  'step-4': (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
      <circle cx="40" cy="40" r="36" fill="#e6f4ea"/>
      <path d="M16 40 Q28 26 44 33 Q62 40 64 40 Q58 50 44 50 Q28 58 16 40Z" fill="#006591" opacity="0.75"/>
      <circle cx="24" cy="39" r="3" fill="white" opacity="0.95"/>
      <circle cx="25" cy="39" r="1.2" fill="#083b54"/>
      <circle cx="38" cy="41" r="2.5" fill="#ba1a1a" opacity="0.8"/>
      <circle cx="46" cy="37" r="2" fill="#ba1a1a" opacity="0.7"/>
    </svg>
  ),
  'step-5': (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
      <circle cx="40" cy="40" r="36" fill="#fff8ed"/>
      <rect x="24" y="42" width="32" height="20" rx="4" fill="#f0a345" opacity="0.25" stroke="#d27b22" strokeWidth="1.5"/>
      <path d="M24 50 L56 50" stroke="#d27b22" strokeWidth="1.5"/>
      <ellipse cx="40" cy="42" rx="14" ry="6" fill="#e8d5b7" stroke="#d27b22" strokeWidth="1.5"/>
      <path d="M32 38 Q40 28 48 38" stroke="#d27b22" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="36" cy="55" r="2" fill="#ba1a1a" opacity="0.8"/>
      <circle cx="44" cy="58" r="2" fill="#ba1a1a" opacity="0.7"/>
    </svg>
  ),
};

const STEP_LABEL: Record<string, string> = {
  'step-1': 'Sampah Plastik',
  'step-2': 'Jadi Mikroplastik',
  'step-3': 'Cemari Perairan',
  'step-4': 'Dimakan Ikan',
  'step-5': 'Masuk ke Tubuh',
};

const STEP_DESC: Record<string, string> = {
  'step-1': 'Plastik dibuang sembarangan.',
  'step-2': 'UV & ombak memecah < 5mm.',
  'step-3': 'Tersebar ke sungai & lautan.',
  'step-4': 'Ikan menelan partikel plastik.',
  'step-5': 'Masuk ke tubuh lewat makanan.',
};

const STEP_BG: Record<string, string> = {
  'step-1': '#fce8e6',
  'step-2': '#fff3e0',
  'step-3': '#e4f1f9',
  'step-4': '#e6f4ea',
  'step-5': '#fff8ed',
};

const STEP_ACCENT: Record<string, string> = {
  'step-1': '#ba1a1a',
  'step-2': '#d27b22',
  'step-3': '#006591',
  'step-4': '#006e2f',
  'step-5': '#d27b22',
};

// ─── Wood Button ──────────────────────────────────────────────────────────────
function WoodButton({ onClick, children, disabled, sm }: {
  onClick: () => void; children: React.ReactNode; disabled?: boolean; sm?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick} disabled={disabled}
      whileHover={!disabled ? { scale: 1.04, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.96 } : {}}
      className={`inline-flex items-center justify-center gap-2 font-extrabold text-[#3b2313] font-[family-name:var(--font-outfit)] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed ${sm ? 'px-5 py-2.5 text-sm' : 'px-8 py-3 text-base'}`}
      style={{
        background: 'linear-gradient(to bottom, #f5b55a, #d27b22)',
        border: '2.5px solid #8e4912',
        boxShadow: disabled ? 'none' : 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.15), 0 6px 16px rgba(142,73,18,0.3)',
      }}
    >{children}</motion.button>
  );
}

// ─── Reorderable Card Component (Desktop Mouse & Touch Mobile Supported) ────────
function DragCard({
  item,
  index,
  totalItems,
  onMoveUp,
  onMoveDown,
}: {
  item: DragItem;
  index: number;
  totalItems: number;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  const accent = STEP_ACCENT[item.id];
  return (
    <Reorder.Item
      value={item}
      id={item.id}
      whileDrag={{ scale: 1.03, boxShadow: `0 8px 25px ${accent}40`, zIndex: 30 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="select-none touch-none flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl md:rounded-3xl border-2 bg-white transition-all cursor-grab active:cursor-grabbing relative"
      style={{
        borderColor: accent,
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
      }}
    >
      {/* Index Badge */}
      <div
        className="flex-shrink-0 w-9 h-9 rounded-full text-white text-sm sm:text-base font-extrabold font-[family-name:var(--font-outfit)] flex items-center justify-center shadow-md"
        style={{ background: accent }}
      >
        {index + 1}
      </div>

      {/* SVG Icon */}
      <div
        className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 p-1.5 rounded-2xl shadow-inner"
        style={{ background: STEP_BG[item.id] }}
      >
        {STEP_SVG[item.id]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-[#083b54] text-sm sm:text-base md:text-lg font-[family-name:var(--font-outfit)] leading-snug">
          {STEP_LABEL[item.id]}
        </p>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
          {STEP_DESC[item.id]}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp(index);
            }}
            disabled={index === 0}
            className="w-7 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors active:scale-90 shadow-xs"
            title="Geser ke atas"
          >
            <span className="material-symbols-outlined text-base">keyboard_arrow_up</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown(index);
            }}
            disabled={index === totalItems - 1}
            className="w-7 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors active:scale-90 shadow-xs"
            title="Geser ke bawah"
          >
            <span className="material-symbols-outlined text-base">keyboard_arrow_down</span>
          </button>
        </div>

        {/* Drag Handle Grip Icon */}
        <div className="p-1.5 text-slate-400 opacity-60 hover:opacity-100 cursor-grab active:cursor-grabbing touch-none flex flex-col gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            </div>
          ))}
        </div>
      </div>
    </Reorder.Item>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Stage3MaterialIntro({ onComplete }: { onComplete: () => void }) {
  const [view, setView] = useState<'learn' | 'drag'>('learn');
  const [items, setItems] = useState<DragItem[]>(() => {
    const arr = [...MICROPLASTIC_JOURNEY_ITEMS];
    do {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    } while (arr.every((x, i) => x.correctOrder === i + 1));
    return arr;
  });

  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [attempts, setAttempts] = useState(0);

  const moveItemUp = useCallback((index: number) => {
    if (index === 0) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
    setFeedback('idle');
  }, []);

  const moveItemDown = useCallback((index: number) => {
    setItems((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
    setFeedback('idle');
  }, []);

  function checkOrder() {
    const ok = items.every((x, i) => x.correctOrder === i + 1);
    setAttempts(a => a + 1);
    setFeedback(ok ? 'correct' : 'wrong');
    if (!ok) setTimeout(() => setFeedback('idle'), 1800);
  }

  const ordered = [...MICROPLASTIC_JOURNEY_ITEMS].sort((a, b) => a.correctOrder - b.correctOrder);

  // The journey layout has a fixed header of h-28 (112px). 
  // We fill exactly the remaining viewport height with overflow-hidden.
  return (
    <div
      className="flex flex-col overflow-y-auto overflow-x-hidden max-w-full relative font-[family-name:var(--font-inter)] w-full min-h-screen bg-[#083b54] pt-28 md:pt-32 pb-16"
      style={{
        background: 'linear-gradient(160deg, #083b54 0%, #006591 45%, #004c6e 100%)',
      }}
    >
      {/* Background blobs */}
      <div className="absolute top-[-80px] right-[-80px] w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: '#6bff8f' }} />
      <div className="absolute bottom-[-80px] left-[-60px] w-96 h-96 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: '#f0a345' }} />
      {/* Bottom Shadow Overlay to blend seamlessly with ocean background */}
      <div className="absolute inset-x-0 bottom-0 h-24 md:h-36 pointer-events-none z-0"
        style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(8,59,84,0.4) 50%, #083b54 100%)" }} />
      {/* Particles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div key={i} className="absolute rounded-full pointer-events-none"
          style={{
            width: 3 + (i % 4), height: 3 + (i % 4),
            background: ['#6bff8f55', '#f0a34555', '#ffffff22', '#c9e6ff44'][i % 4],
            left: `${(i * 43 + 9) % 100}%`, top: `${(i * 61 + 15) % 100}%`,
          }}
          animate={{ y: [0, -18, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 md:px-8 py-4">
        <AnimatePresence mode="wait">

          {/* ═══ VIEW 1: MATERI ═══ */}
          {view === 'learn' && (
            <motion.div key="learn"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-6xl flex flex-col items-center gap-6 md:gap-8 py-4"
            >
              {/* Badge + Title */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-3 shadow-sm"
                  style={{ background: 'rgba(107,255,143,0.12)', border: '1px solid rgba(107,255,143,0.35)', color: '#6bff8f' }}>
                  <motion.span className="w-2 h-2 rounded-full bg-[#6bff8f]"
                    animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                  Tahap 3 · Penguatan Materi
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight font-[family-name:var(--font-outfit)] drop-shadow-md">
                  Dari Sampah{' '}
                  <span className="text-[#6bff8f]">ke Piringmu</span>
                </h1>
              </div>

              {/* Flow — responsive grid cards */}
              <div className="w-full max-w-5xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 justify-items-center">
                {ordered.map((item, i) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="w-full flex flex-col items-center gap-2.5 p-4 sm:p-6 rounded-3xl cursor-default border border-white/20 transition-all shadow-xl"
                    style={{ background: STEP_BG[item.id], boxShadow: `0 8px 24px ${STEP_ACCENT[item.id]}33` }}
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 p-1.5 drop-shadow-md">{STEP_SVG[item.id]}</div>
                    <p className="text-xs sm:text-sm md:text-base font-extrabold text-center text-[#083b54] leading-tight font-[family-name:var(--font-outfit)]">
                      {STEP_LABEL[item.id]}
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-600 text-center leading-relaxed">
                      {STEP_DESC[item.id]}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Stats pills */}
              <div className="flex gap-4 flex-wrap justify-center mt-2">
                {[
                  { val: '< 5 mm', sub: 'Ukuran Mikroplastik' },
                  { val: '94%', sub: 'Lautan Tercemar' },
                  { val: '28–90', sub: 'Partikel/100g Kerang' },
                ].map(f => (
                  <div key={f.sub} className="px-6 py-3 rounded-2xl text-center backdrop-blur-md shadow-md"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <p className="text-white font-extrabold text-xl sm:text-2xl leading-none font-[family-name:var(--font-outfit)]">{f.val}</p>
                    <p className="text-blue-100 text-xs sm:text-sm mt-1">{f.sub}</p>
                  </div>
                ))}
              </div>

              {/* Source Attribution */}
              <p className="text-white/70 text-xs sm:text-sm text-center italic mt-1 font-mono max-w-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-xl">
                Sumber: Diadaptasi dari WWF International (2019) &amp; Riset Pencemaran Pangan Global (BRIN/UNEP).
              </p>

              <WoodButton onClick={() => setView('drag')}>
                Siap Tantangan?
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                  <path d="M3 9 H15 M10 4 L15 9 L10 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </WoodButton>
            </motion.div>
          )}

          {/* ═══ VIEW 2: DRAG & DROP ═══ */}
          {view === 'drag' && (
            <motion.div key="drag"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-3xl flex flex-col items-center gap-5 md:gap-6 py-2"
            >
              {/* Title */}
              <div className="text-center">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white font-[family-name:var(--font-outfit)] mb-2 drop-shadow-md">
                  Susun Urutannya! 🧩
                </h2>
                <p className="text-blue-100 text-sm md:text-base font-medium">
                  <span className="text-[#6bff8f] font-bold">Geser / tekan panah</span> untuk menyusun alur pencemaran mikroplastik yang benar.
                </p>
              </div>

              {/* Drag area */}
              <div className="w-full p-4 sm:p-5 rounded-3xl flex flex-col gap-3 transition-all shadow-2xl"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: `2px solid ${feedback === 'correct' ? '#6bff8f' : feedback === 'wrong' ? '#ff6b6b' : 'rgba(255,255,255,0.2)'}`,
                  backdropFilter: 'blur(20px)',
                  boxShadow: feedback === 'correct' ? '0 0 50px rgba(107,255,143,0.3)' : '0 20px 40px rgba(0,0,0,0.3)',
                }}>
                <Reorder.Group
                  axis="y"
                  values={items}
                  onReorder={(newItems) => {
                    setItems(newItems);
                    setFeedback('idle');
                  }}
                  className="w-full flex flex-col gap-3"
                >
                  {items.map((item, index) => (
                    <DragCard
                      key={item.id}
                      item={item}
                      index={index}
                      totalItems={items.length}
                      onMoveUp={moveItemUp}
                      onMoveDown={moveItemDown}
                    />
                  ))}
                </Reorder.Group>
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {feedback === 'correct' && (
                  <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="w-full py-4 px-6 rounded-2xl text-center shadow-lg"
                    style={{ background: 'rgba(107,255,143,0.15)', border: '2px solid rgba(107,255,143,0.5)' }}>
                    <p className="text-[#6bff8f] text-base md:text-lg font-extrabold font-[family-name:var(--font-outfit)]">
                      🎉 Tepat Sekali! Urutan sudah benar.
                    </p>
                  </motion.div>
                )}
                {feedback === 'wrong' && (
                  <motion.div initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: [0, -8, 8, -5, 5, 0] }}
                    exit={{ opacity: 0 }}
                    className="w-full py-4 px-6 rounded-2xl text-center shadow-lg"
                    style={{ background: 'rgba(186,26,26,0.2)', border: '2px solid rgba(186,26,26,0.5)' }}>
                    <p className="text-[#ff8c8c] text-base font-bold font-[family-name:var(--font-outfit)]">
                      Belum tepat — yuk coba lagi! 💪
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {attempts > 0 && feedback === 'idle' && (
                <p className="text-blue-200 text-xs sm:text-sm font-semibold">Percobaan ke-{attempts} — jangan menyerah!</p>
              )}

              {/* Actions */}
              <div className="flex gap-4 justify-center">
                {feedback !== 'correct' ? (
                  <WoodButton onClick={checkOrder}>
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8 L6 12 L14 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Cek Urutan
                  </WoodButton>
                ) : (
                  <WoodButton onClick={onComplete}>
                    Mulai Uji Makananku!
                    <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                      <path d="M3 9 H15 M10 4 L15 9 L10 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </WoodButton>
                )}
                <motion.button
                  onClick={() => setView('learn')}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  className="px-6 py-3 rounded-xl text-base font-bold text-blue-100 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  ← Materi
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

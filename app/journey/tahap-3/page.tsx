'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useJourneyStore } from '@/lib/journeyStore';
import { FOODS } from '@/lib/foods';
import Stage3MaterialIntro from '@/components/stages/Stage3MaterialIntro';
import StageCompletionModal from '@/components/ui/StageCompletionModal';

type Phase = 'materi' | 'select' | 'reveal' | 'summary';

const LKPD2_OPTIONS = [
  { id: 'a', text: 'Melalui bioakumulasi hewan filter-feeder dan peluruhan polimer dari wadah kemasan' },
  { id: 'b', text: 'Hanya melalui sayuran yang ditanam di tanah tercemar' },
  { id: 'c', text: 'Melalui proses memasak menggunakan kompor gas' },
];
const LKPD2_CORRECT = 'a';

// Accent per food
const FOOD_ACCENT: Record<string, string> = {
  garam:      '#94a3b8',
  kerang:     '#38bdf8',
  air_mineral:'#7dd3fc',
  cilok:      '#fb923c',
  es_teh:     '#a78bfa',  
};

// Background decorators — shared across all phases
function BgDeco() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-10" style={{ background: '#6bff8f' }} />
      <div className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full blur-3xl opacity-10" style={{ background: '#f0a345' }} />
      {/* Bottom Shadow Overlay to blend seamlessly with ocean background */}
      <div className="absolute inset-x-0 bottom-0 h-24 md:h-36 pointer-events-none z-0"
        style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(8,59,84,0.4) 50%, #083b54 100%)" }} />
    </div>
  );
}

// Wood button
function WoodBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <motion.button onClick={onClick} disabled={disabled}
      whileHover={!disabled ? { scale: 1.03, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      className="inline-flex items-center gap-2 px-7 py-3 font-extrabold text-[#3b2313] text-sm font-[family-name:var(--font-outfit)] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: 'linear-gradient(to bottom, #f5b55a, #d27b22)',
        border: '2.5px solid #8e4912',
        boxShadow: disabled ? 'none' : 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.15), 0 6px 16px rgba(142,73,18,0.28)',
      }}
    >{children}</motion.button>
  );
}

// Ghost button
function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button onClick={onClick}
      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
      className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-semibold text-blue-200 hover:text-white transition-colors"
      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
    >{children}</motion.button>
  );
}

// The reveal content is extracted as its own component so useEffect fires AFTER mount
function RevealScreen({
  total, breakdown, onNext, onBack,
}: {
  total: number;
  breakdown: { id: string; name: string; particles: number }[];
  onNext: () => void;
  onBack: () => void;
}) {
  const count = useMotionValue(0);
  const displayCount = useTransform(count, (latest) => Math.round(latest).toLocaleString('id-ID'));

  useEffect(() => {
    const animation = animate(count, total, { duration: 2, ease: "easeOut" });
    return animation.stop;
  }, [total, count]);

  // Determine scary effect level
  const isHighDanger = total > 200;
  const dangerColor = isHighDanger ? '#ba1a1a' : '#f0a345';
  const glowColor = isHighDanger ? 'rgba(186,26,26,0.6)' : 'rgba(240,163,69,0.5)';
  const dangerText = isHighDanger ? 'BAHAYA! KONTAMINASI TINGGI' : 'WASPADA! ADA KONTAMINASI';

  return (
    <div className="relative w-full max-w-full overflow-x-hidden overflow-y-auto flex items-center justify-center min-h-screen py-8 px-4 pt-28 md:pt-32 pb-16 bg-[linear-gradient(160deg,#083b54_0%,#006591_45%,#004c6e_100%)]">
      <BgDeco />

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Scary red overlay if high danger */}
        {isHighDanger && (
          <motion.div 
            animate={{ opacity: [0.05, 0.2, 0.05] }} 
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-[#ba1a1a]" 
          />
        )}
        {Array.from({ length: isHighDanger ? 60 : 40 }, (_, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              width: 2 + (i % 3), height: 2 + (i % 3),
              backgroundColor: isHighDanger 
                ? ['#ba1a1a88', '#ff4d4d66', '#ffffff33'][i % 3]
                : ['#ba1a1a88', '#f0a34566', '#ffffff33'][i % 3],
              left: `${(i * 37 + 5) % 100}%`,
              animation: `fall3 ${2 + (i % 5)}s ${(i % 7) * 0.4}s linear infinite`,
            }} />
        ))}
      </div>
      <style>{`@keyframes fall3 { from { transform: translateY(-20px); opacity:0.8 } to { transform: translateY(100vh); opacity:0 } }`}</style>

      <div className="relative z-10 max-w-lg w-full mx-4 text-center">
        {/* Danger ring */}
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-4"
          style={{ background: `${dangerColor}33`, borderColor: dangerColor, boxShadow: `0 0 30px ${glowColor}` }}>
          <motion.svg 
            animate={{ scale: isHighDanger ? [1, 1.15, 1] : 1 }}
            transition={{ duration: 1, repeat: Infinity }}
            width="32" height="32" viewBox="0 0 28 28" fill="none">
            <path d="M14 5 L25 23 H3 Z" stroke={dangerColor} strokeWidth="2.5" strokeLinejoin="round" fill={`${dangerColor}55`}/>
            <path d="M14 12 V16 M14 20 V20.5" stroke={dangerColor} strokeWidth="2.5" strokeLinecap="round"/>
          </motion.svg>
        </motion.div>

        {/* Scary Alert Box */}
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="inline-block px-4 py-1.5 rounded-lg border mb-5 font-bold text-sm tracking-wider"
          style={{ background: `${dangerColor}22`, borderColor: dangerColor, color: dangerColor }}>
          {dangerText}
        </motion.div>

        <p className="text-white text-base mb-4 font-[family-name:var(--font-inter)] leading-relaxed">
          Sistem mendeteksi ada <span className="font-bold text-red-400">ancaman partikel</span> di makananmu hari ini sebanyak:
        </p>

        {/* Counter */}
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="text-7xl font-black mb-2 font-[family-name:var(--font-outfit)]"
          style={{ color: '#ff4d4d', textShadow: `0 0 40px ${glowColor}` }}>
          <motion.span>{displayCount}</motion.span>
        </motion.div>
        <p className="text-red-200 font-bold text-xl mb-6 uppercase tracking-wider">Partikel Mikroplastik</p>

        {/* Breakdown with food images */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {breakdown.map(item => {
            const food = FOODS.find(f => f.id === item.id);
            return (
              <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}>
                {food?.image && (
                  <div className="w-7 h-7 rounded-lg overflow-hidden relative flex-shrink-0">
                    {/* alt="" di-set kosong agar tidak muncul text duplikat jika gambar telat load */}
                    <Image src={food.image} alt="" fill className="object-cover" sizes="28px" />
                  </div>
                )}
                {item.name}
                <span style={{ color: '#ff8c8c', fontWeight: 'bold' }}>+{item.particles.toLocaleString('id-ID')}</span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <GhostBtn onClick={onBack}>
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Ubah Pilihan Makanan</span>
          </GhostBtn>
          <WoodBtn onClick={onNext}>
            Lihat Dampak ke Organ Tubuh
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8 H13 M9 4 L13 8 L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </WoodBtn>
        </div>
      </div>
    </div>
  );
}

export default function Tahap3() {
  const router = useRouter();
  const { addFood, totalParticles, setTotalParticles, selectedFoods, completeStage, setLkpdAnswer, lkpdAnswers } = useJourneyStore();

  const [phase, setPhase] = useState<Phase>('materi');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const [confirmedBreakdown, setConfirmedBreakdown] = useState<{ id: string; name: string; particles: number }[]>([]);
  const [lkpd2Answer, setLkpd2Answer] = useState<string | null>(lkpdAnswers.lkpd2 || null);
  const [lkpd2Answered, setLkpd2Answered] = useState(!!lkpdAnswers.lkpd2);

  // Live total while user is selecting
  const liveTotal = Array.from(checked).reduce((sum, id) => {
    const f = FOODS.find(x => x.id === id);
    return sum + (f?.particles ?? 0);
  }, 0);

  function toggle(id: string) {
    setChecked(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function handleScan() {
    const breakdown = Array.from(checked).map(id => {
      const f = FOODS.find(x => x.id === id)!;
      return { id, name: f.name, particles: f.particles };
    });
    const total = breakdown.reduce((s, x) => s + x.particles, 0);

    // Commit to store — dedupe
    breakdown.forEach(b => {
      if (!selectedFoods.find(sf => sf.id === b.id)) {
        addFood({ id: b.id, name: b.name, particles: b.particles });
      }
    });
    setTotalParticles(total);

    // Store locally for RevealScreen (avoid timing issues with store)
    setConfirmedTotal(total);
    setConfirmedBreakdown(breakdown);
    setPhase('reveal');
  }

  function handleLkpd2Answer(id: string) {
    if (lkpd2Answered) return;
    setLkpd2Answer(id);
    setLkpd2Answered(true);
    setLkpdAnswer('lkpd2', id);
  }

  const [showCompletionModal, setShowCompletionModal] = useState(false);

  function handleNext() {
    completeStage(3);
    setShowCompletionModal(true);
  }

  const hoveredFood = FOODS.find(f => f.id === hoveredId);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  if (phase === 'materi') {
    return <Stage3MaterialIntro onComplete={() => setPhase('select')} />;
  }

  if (phase === 'reveal') {
    return (
      <RevealScreen
        total={confirmedTotal}
        breakdown={confirmedBreakdown}
        onNext={() => setPhase('summary')}
        onBack={() => setPhase('select')}
      />
    );
  }

  // ─── SELECT PHASE ──────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="relative max-w-full overflow-x-hidden overflow-y-auto flex flex-col w-full min-h-screen bg-[#083b54] pt-28 md:pt-32 pb-16"
        style={{ background: 'linear-gradient(160deg, #083b54 0%, #006591 45%, #004c6e 100%)' }}>
        <BgDeco />

        <div className="relative z-10 flex-1 flex flex-col items-center px-4 md:px-8 pt-4 pb-6">
          <div className="w-full max-w-6xl flex flex-col gap-6 flex-1">

            {/* Header with Back Button */}
            <div className="relative text-center">
              <button
                onClick={() => setPhase('materi')}
                className="absolute left-0 top-0 inline-flex items-center gap-1 text-xs text-blue-200 hover:text-white bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-sm transition-colors"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span className="hidden sm:inline">Materi</span>
              </button>
              <p className="text-[#6bff8f] text-xs font-bold uppercase tracking-widest mb-1">Uji Makanan Hari Ini</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white font-[family-name:var(--font-outfit)]">
                Apa yang Kamu Makan?
              </h2>
              <p className="text-blue-200 text-sm mt-1">Centang semua makanan yang kamu konsumsi hari ini.</p>
            </div>

            {/* Body: food grid + side panel */}
            <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">

              {/* Food Cards */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 content-start">
                {FOODS.map(food => {
                  const isChecked = checked.has(food.id);
                  const accent = FOOD_ACCENT[food.id] ?? '#6bff8f';
                  return (
                    <motion.button key={food.id}
                      onClick={() => toggle(food.id)}
                      onMouseEnter={() => setHoveredId(food.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      whileHover={{ y: -3, scale: 1.01 }}
                      whileTap={{ scale: 0.97 }}
                      className="relative text-left p-4 rounded-2xl border-2 transition-all flex items-center md:flex-col gap-3 md:gap-2"
                      style={{
                        background: isChecked ? `${accent}18` : 'rgba(255,255,255,0.05)',
                        borderColor: isChecked ? accent : 'rgba(255,255,255,0.1)',
                        boxShadow: isChecked ? `0 6px 24px ${accent}25` : 'none',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      {/* Checkmark badge */}
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                        style={{ borderColor: isChecked ? accent : 'rgba(255,255,255,0.25)', background: isChecked ? accent : 'transparent' }}>
                        {isChecked && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4 L3.5 6.5 L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>

                      {/* Food image */}
                      <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 relative"
                        style={{ boxShadow: isChecked ? `0 0 16px ${accent}40` : 'none', transition: 'box-shadow 0.2s' }}>
                        <Image
                          src={food.image}
                          alt={food.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>

                      <div className="pr-5 flex-1">
                        <p className="text-white font-bold text-sm font-[family-name:var(--font-outfit)] leading-tight">
                          {food.name}
                        </p>
                        <p className="text-xs mt-0.5 font-medium" style={{ color: accent }}>
                          {food.particles.toLocaleString('id-ID')} partikel / {food.unit}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Side panel */}
              <div className="w-full md:w-56 flex-shrink-0 flex flex-col gap-3">
                {/* Hover info */}
                <div className="rounded-2xl p-4 flex flex-col justify-center min-h-[120px]"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
                  <AnimatePresence mode="wait">
                    {hoveredFood ? (
                      <motion.div key={hoveredFood.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {/* Food image in panel */}
                        <div className="w-16 h-16 rounded-2xl overflow-hidden mb-3 relative">
                          <Image
                            src={hoveredFood.image}
                            alt={hoveredFood.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                        <p className="text-white font-bold text-sm font-[family-name:var(--font-outfit)] mb-1">{hoveredFood.name}</p>
                        <p className="text-xs font-bold mb-3" style={{ color: FOOD_ACCENT[hoveredFood.id] ?? '#6bff8f' }}>
                          {hoveredFood.particles} partikel / {hoveredFood.unit}
                        </p>
                        <p className="text-blue-200 text-[11px] leading-relaxed">{hoveredFood.justification}</p>
                      </motion.div>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }}
                        className="text-center text-blue-300 text-xs py-2">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="mx-auto mb-2 opacity-50">
                          <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M14 10 V14 M14 17 V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Pilih atau tekan makanan untuk melihat fakta ilmiahnya
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Total */}
                <div className="rounded-2xl p-4 text-center transition-all"
                  style={{
                    background: liveTotal > 0 ? 'rgba(186,26,26,0.18)' : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${liveTotal > 0 ? 'rgba(186,26,26,0.45)' : 'rgba(255,255,255,0.1)'}`,
                    backdropFilter: 'blur(12px)',
                  }}>
                  <p className="text-[10px] uppercase tracking-widest font-bold mb-1"
                    style={{ color: liveTotal > 0 ? '#ff8c8c' : 'rgba(255,255,255,0.4)' }}>
                    Total Partikel
                  </p>
                  <p className="text-3xl font-extrabold font-[family-name:var(--font-outfit)] flex justify-center items-baseline gap-1.5"
                    style={{ color: liveTotal > 0 ? '#ff8c8c' : 'rgba(255,255,255,0.2)' }}>
                    {liveTotal.toLocaleString('id-ID')}
                    {liveTotal > 0 && <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest">partikel / asupan</span>}
                  </p>
                  {checked.size > 0 && (
                    <p className="text-[11px] text-blue-300 mt-1">{checked.size} menu dipilih</p>
                  )}
                </div>

                {/* Scan button */}
                <WoodBtn onClick={handleScan} disabled={checked.size === 0}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="5" width="12" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4 5 V3 a3 3 0 016 0 V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Scan Mikroplastik
                </WoodBtn>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── SUMMARY / LKPD ───────────────────────────────────────────────────────
  return (
    <div className="relative max-w-full overflow-x-hidden overflow-y-auto w-full min-h-screen pt-28 md:pt-32 pb-16"
      style={{ background: 'linear-gradient(160deg, #083b54 0%, #006591 45%, #004c6e 100%)' }}>
      <BgDeco />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">

        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-white font-[family-name:var(--font-outfit)]">Evaluasi Tahap 3</h2>
          <p className="text-blue-200 text-sm mt-1">Jawab pertanyaan berdasarkan pengalamanmu.</p>
        </div>

        {/* LKPD Card */}
        <div className="rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}>
          <div className="bg-[#006591]/20 border border-[#006591]/40 rounded-xl p-4 mb-5">
            <p className="text-blue-100 text-sm font-semibold leading-relaxed">
              Berdasarkan fakta riset yang kamu baca tadi, bagaimana mekanisme utama mikroplastik bisa berpindah ke dalam makanan yang kita konsumsi sehari-hari?
            </p>
          </div>

          <div className="space-y-2.5">
            {LKPD2_OPTIONS.map(opt => {
              const isChosen = lkpd2Answer === opt.id;
              const isCorrect = opt.id === LKPD2_CORRECT;
              let bg = 'rgba(255,255,255,0.04)';
              let border = 'rgba(255,255,255,0.1)';
              let textColor = '#bfdbfe';
              if (lkpd2Answered) {
                if (isChosen && isCorrect)  { bg = 'rgba(107,255,143,0.1)'; border = 'rgba(107,255,143,0.4)'; textColor = '#6bff8f'; }
                else if (isChosen)          { bg = 'rgba(186,26,26,0.13)';  border = 'rgba(186,26,26,0.45)'; textColor = '#ff8c8c'; }
                else if (isCorrect)         { bg = 'rgba(107,255,143,0.05)'; border = 'rgba(107,255,143,0.2)'; textColor = '#6bff8f88'; }
              }
              return (
                <button key={opt.id} onClick={() => handleLkpd2Answer(opt.id)} disabled={lkpd2Answered}
                  className="w-full text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all"
                  style={{ background: bg, borderColor: border, color: textColor, cursor: lkpd2Answered ? 'default' : 'pointer' }}>
                  <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{ borderColor: border }}>
                    {lkpd2Answered && isCorrect ? '✓' : lkpd2Answered && isChosen && !isCorrect ? '✗' : opt.id.toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold">{opt.text}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {lkpd2Answered && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-xl text-sm font-semibold"
                style={lkpd2Answer === LKPD2_CORRECT
                  ? { background: 'rgba(107,255,143,0.1)', border: '1px solid rgba(107,255,143,0.3)', color: '#6bff8f' }
                  : { background: 'rgba(186,26,26,0.12)', border: '1px solid rgba(186,26,26,0.35)', color: '#ff8c8c' }}>
                {lkpd2Answer === LKPD2_CORRECT
                  ? '✓ Tepat! Kerang menyaring air tercemar (bioakumulasi), dan wadah plastik/styrofoam luruh saat terkena makanan panas.'
                  : '✗ Belum tepat. Jawaban yang benar adalah A — bioakumulasi dan peluruhan polimer kemasan.'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between">
          <GhostBtn onClick={() => setPhase('select')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M11 7 H3 M6 3 L2 7 L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Ubah Pilihan
          </GhostBtn>
          <WoodBtn onClick={handleNext} disabled={!lkpd2Answered || lkpd2Answer !== LKPD2_CORRECT}>
            Ke Tahap 4: Organ Dalam
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7 H11 M8 3 L12 7 L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </WoodBtn>
        </div>
      </div>

      <StageCompletionModal
        isOpen={showCompletionModal}
        stageNumber={3}
        stageTitle="Kontaminasi Pangan Laut"
        xpEarned={100}
        nextStagePath="/journey/tahap-4"
        onClose={() => setShowCompletionModal(false)}
      />
    </div>
  );
}

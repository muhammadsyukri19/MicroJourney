'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useJourneyStore } from '@/lib/journeyStore';
import { FOODS } from '@/lib/foods';
import Stage3MaterialIntro from '@/components/stages/Stage3MaterialIntro';
import { useReturnedToStage, useStageBack } from '@/lib/stageBack';
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
function WoodBtn({ onClick, disabled, children, className = '' }: { onClick: () => void; disabled?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <motion.button onClick={onClick} disabled={disabled}
      whileHover={!disabled ? { scale: 1.03, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 min-h-12 font-extrabold text-[#3b2313] text-sm font-[family-name:var(--font-outfit)] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{
        background: 'linear-gradient(to bottom, #f5b55a, #d27b22)',
        border: '2.5px solid #8e4912',
        boxShadow: disabled ? 'none' : 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.15), 0 6px 16px rgba(142,73,18,0.28)',
      }}
    >{children}</motion.button>
  );
}

// The reveal content is extracted as its own component so useEffect fires AFTER mount
function RevealScreen({
  total, breakdown, onNext,
}: {
  total: number;
  breakdown: { id: string; name: string; particles: number }[];
  onNext: () => void;
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

        <div className="flex justify-center">
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

/** Hasil uji terakhir, supaya hasil dan rangkuman tetap sama saat siswa kembali dari Tahap 4 */
let lastScan: { total: number; breakdown: { id: string; name: string; particles: number }[] } | null = null;

export default function Tahap3() {
  const router = useRouter();
  const { addFood, totalParticles, setTotalParticles, selectedFoods, completeStage, setLkpdAnswer, lkpdAnswers } = useJourneyStore();

  const returned = useReturnedToStage(3);
  const [restored] = useState(() => {
    if (!returned) return null;
    if (lastScan) return lastScan;
    if (selectedFoods.length === 0) return null;
    return { total: totalParticles, breakdown: selectedFoods.map(({ id, name, particles }) => ({ id, name, particles })) };
  });
  const [phase, setPhase] = useState<Phase>(restored ? 'summary' : 'materi');
  const [materiAtEnd, setMateriAtEnd] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(restored?.breakdown.map(food => food.id)));
  // Makanan terakhir yang disentuh; di HP tidak ada hover, jadi faktanya mengikuti ketukan
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmedTotal, setConfirmedTotal] = useState(restored?.total ?? 0);
  const [confirmedBreakdown, setConfirmedBreakdown] = useState<{ id: string; name: string; particles: number }[]>(restored?.breakdown ?? []);
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
    setHoveredId(id);
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
    lastScan = { total, breakdown };
    setPhase('reveal');
  }

  function handleLkpd2Answer(id: string) {
    // Jawaban salah boleh diganti; kalau dikunci, siswa tidak bisa lanjut ke Tahap 4
    if (lkpd2Answer === LKPD2_CORRECT) return;
    setLkpd2Answer(id);
    setLkpd2Answered(true);
    setLkpdAnswer('lkpd2', id);
  }

  const [showCompletionModal, setShowCompletionModal] = useState(false);

  function backToMateri() {
    setMateriAtEnd(true);
    setPhase('materi');
  }

  // Rangkuman -> hasil -> pilih makanan -> urutan materi -> materi -> Tahap 2
  useStageBack(() => {
    if (phase === 'summary') setPhase('reveal');
    else if (phase === 'reveal') setPhase('select');
    else if (phase === 'select') backToMateri();
    else return false;
    return true;
  });

  function handleNext() {
    completeStage(3);
    setShowCompletionModal(true);
  }

  const hoveredFood = FOODS.find(f => f.id === hoveredId);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  if (phase === 'materi') {
    return <Stage3MaterialIntro startAtEnd={materiAtEnd} onComplete={() => setPhase('select')} />;
  }

  if (phase === 'reveal') {
    return (
      <RevealScreen
        total={confirmedTotal}
        breakdown={confirmedBreakdown}
        onNext={() => setPhase('summary')}
      />
    );
  }

  // ─── SELECT PHASE ──────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="relative max-w-full overflow-x-hidden flex flex-col w-full min-h-screen bg-[#083b54] pt-24 md:pt-32 pb-28 md:pb-16"
        style={{ background: 'linear-gradient(160deg, #083b54 0%, #006591 45%, #004c6e 100%)' }}>
        <BgDeco />

        <div className="relative z-10 flex-1 flex flex-col items-center px-4 md:px-8">
          <div className="w-full max-w-5xl flex flex-col gap-3 md:gap-6">
            <div className="text-center">
              <p className="text-[#6bff8f] text-xs font-bold uppercase tracking-widest mb-1">Uji Makanan Hari Ini</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white font-[family-name:var(--font-outfit)]">
                Apa yang Kamu Makan?
              </h2>
              <p className="text-blue-200 text-sm mt-1">Ketuk semua yang kamu makan atau minum hari ini, lalu scan.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:gap-5">
              <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-3 content-start">
                {FOODS.map(food => {
                  const isChecked = checked.has(food.id);
                  const accent = FOOD_ACCENT[food.id] ?? '#6bff8f';
                  return (
                    <motion.button key={food.id}
                      onClick={() => toggle(food.id)}
                      onMouseEnter={() => setHoveredId(food.id)}
                      whileTap={{ scale: 0.97 }}
                      aria-pressed={isChecked}
                      className="relative text-left p-2.5 md:p-4 rounded-2xl border-2 transition-colors flex items-center gap-2.5"
                      style={{
                        background: isChecked ? `${accent}26` : 'rgba(255,255,255,0.07)',
                        borderColor: isChecked ? accent : 'rgba(255,255,255,0.14)',
                      }}
                    >
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden flex-shrink-0 relative">
                        <Image src={food.image} alt="" fill className="object-cover" sizes="56px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-[13px] md:text-sm font-[family-name:var(--font-outfit)] leading-tight">
                          {food.name}
                        </p>
                        <p className="text-[11px] mt-0.5 font-medium leading-tight" style={{ color: accent }}>
                          {food.particles.toLocaleString('id-ID')} partikel
                        </p>
                      </div>
                      {isChecked && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[#083b54]" style={{ background: accent }}>
                          <span className="material-symbols-outlined text-sm leading-none font-bold">check</span>
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-3">
                <div className="rounded-2xl p-3.5 md:p-4 min-h-[92px]"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)' }}>
                  {hoveredFood ? (
                    <>
                      <p className="text-white font-bold text-sm font-[family-name:var(--font-outfit)]">{hoveredFood.name}</p>
                      <p className="text-[11px] font-bold mb-1" style={{ color: FOOD_ACCENT[hoveredFood.id] ?? '#6bff8f' }}>
                        {hoveredFood.particles.toLocaleString('id-ID')} partikel / {hoveredFood.unit}
                      </p>
                      <p className="text-blue-100 text-xs leading-relaxed">{hoveredFood.justification}</p>
                    </>
                  ) : (
                    <p className="text-blue-200 text-xs leading-relaxed flex items-center gap-2 h-full">
                      <span className="material-symbols-outlined text-2xl text-[#7dd3fc]">touch_app</span>
                      Ketuk makanan untuk melihat fakta ilmiahnya.
                    </p>
                  )}
                </div>

                {/* Di HP ringkasan dan tombol scan selalu terlihat di bawah layar */}
                <div className="fixed md:static inset-x-0 bottom-0 z-40 flex md:flex-col items-center md:items-stretch gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-0 bg-[#083b54]/95 md:bg-transparent border-t border-white/15 md:border-0">
                  <div className="flex-1 md:rounded-2xl md:p-4 md:text-center md:border md:border-white/15 md:bg-white/5">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-white/60">Total Partikel</p>
                    <p className={`text-xl md:text-3xl font-extrabold font-[family-name:var(--font-outfit)] leading-tight ${liveTotal > 0 ? 'text-[#ff8c8c]' : 'text-white/40'}`}>
                      {liveTotal.toLocaleString('id-ID')}
                    </p>
                    <p className="text-[11px] text-blue-200">{checked.size} menu dipilih</p>
                  </div>
                  <WoodBtn onClick={handleScan} disabled={checked.size === 0} className="flex-shrink-0">
                    <span className="material-symbols-outlined text-lg">search</span>
                    Scan Mikroplastik
                  </WoodBtn>
                </div>
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
              if (isChosen && lkpd2Answered) {
                if (isCorrect) { bg = 'rgba(107,255,143,0.1)'; border = 'rgba(107,255,143,0.4)'; textColor = '#6bff8f'; }
                else           { bg = 'rgba(186,26,26,0.13)';  border = 'rgba(186,26,26,0.45)'; textColor = '#ff8c8c'; }
              }
              return (
                <button key={opt.id} onClick={() => handleLkpd2Answer(opt.id)} disabled={lkpd2Answer === LKPD2_CORRECT}
                  className="w-full text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all"
                  style={{ background: bg, borderColor: border, color: textColor, cursor: lkpd2Answer === LKPD2_CORRECT ? 'default' : 'pointer' }}>
                  <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{ borderColor: border }}>
                    {isChosen && lkpd2Answered
                      ? <span className="material-symbols-outlined text-sm leading-none">{isCorrect ? 'check' : 'close'}</span>
                      : opt.id.toUpperCase()}
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
                  ? 'Tepat! Kerang menyaring air tercemar (bioakumulasi), dan wadah plastik/styrofoam luruh saat terkena makanan panas.'
                  : 'Belum tepat. Ingat lagi fakta riset tadi, lalu pilih jawaban lain.'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-end">
          <WoodBtn onClick={handleNext} disabled={!lkpd2Answered || lkpd2Answer !== LKPD2_CORRECT} className="w-full sm:w-auto">
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

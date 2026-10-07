'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJourneyStore } from '@/lib/journeyStore';
import { ORGANS, Organ } from '@/lib/organs';

type Phase = 'bridge' | 'organs' | 'lkpd';

const FLOW_PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: `${18 + Math.random() * 64}%`,
  delay: `${i * 0.35}s`,
  dur: `${2.2 + Math.random() * 1.2}s`,
  color: ['#ba1a1a','#006591','#c39400'][i%3],
}));

const HOTSPOTS: Record<string, { top: string; left: string; origin: string; scale: number }> = {
  mouth: { top: '15%', left: '50%', origin: '50% 15%', scale: 2.5 },
  stomach: { top: '45%', left: '55%', origin: '55% 45%', scale: 2.5 },
  smallIntestine: { top: '58%', left: '50%', origin: '50% 58%', scale: 2.5 },
  largeIntestine: { top: '55%', left: '50%', origin: '50% 55%', scale: 2.2 },
  blood: { top: '35%', left: '48%', origin: '48% 35%', scale: 2.0 },
};

function HealthBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-[#eceef0] rounded-full h-3 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${pct}%`, backgroundColor: color,
          boxShadow: `0 0 8px ${color}60` }} />
    </div>
  );
}

/* ── Organ SVG shapes ── */
function OrganIllustration({ organId, isActive, isClicked }: { organId: string; isActive: boolean; isClicked: boolean }) {
  const base = isActive ? 'drop-shadow(0 0 14px rgba(186,26,26,0.6))' : isClicked ? 'drop-shadow(0 0 6px rgba(0,110,47,0.4))' : 'none';
  const pulse = isActive ? 'animate-[organPulse_1.4s_ease-in-out_infinite]' : '';

  if (organId === 'mouth') return (
    <svg viewBox="0 0 80 60" width="80" height="60" className={pulse} style={{ filter: base }}>
      <ellipse cx="40" cy="30" rx="35" ry="22" fill={isActive ? '#ba1a1a' : isClicked ? '#6bff8f' : '#fca5a5'} />
      <ellipse cx="40" cy="28" rx="30" ry="16" fill="#7f1d1d" fillOpacity="0.4" />
      {/* Teeth */}
      {[20,28,36,44,52].map((x,i)=>(
        <rect key={i} x={x} y={14} width={6} height={12} rx={3} fill="white" fillOpacity="0.9" />
      ))}
      <ellipse cx="40" cy="36" rx="26" ry="12" fill="#dc2626" fillOpacity="0.6" />
      <ellipse cx="40" cy="38" rx="16" ry="7" fill="#991b1b" fillOpacity="0.5" />
    </svg>
  );

  if (organId === 'stomach') return (
    <svg viewBox="0 0 90 80" width="90" height="80" className={pulse} style={{ filter: base }}>
      <path d="M20,15 Q10,10 12,35 Q14,60 30,68 Q50,74 65,62 Q82,48 78,28 Q74,10 58,8 Q38,4 20,15Z"
        fill={isActive ? '#ba1a1a' : isClicked ? '#6bff8f' : '#fca5a5'} />
      <path d="M22,20 Q14,18 16,38 Q18,56 32,64 Q48,70 62,58 Q76,44 72,28 Q68,14 54,12 Q38,8 22,20Z"
        fill={isActive ? '#991b1b' : isClicked ? '#006e2f' : '#f87171'} fillOpacity="0.7" />
      {/* Fold lines */}
      <path d="M30,30 Q45,25 60,32" stroke="white" strokeWidth="2" fill="none" strokeOpacity="0.5" />
      <path d="M28,44 Q44,38 62,44" stroke="white" strokeWidth="1.5" fill="none" strokeOpacity="0.4" />
      {/* HCl bubbles */}
      {isActive && [35,50,60].map((x,i)=>(
        <circle key={i} cx={x} cy={52} r={4} fill="#fbbf24" fillOpacity="0.8" />
      ))}
    </svg>
  );

  if (organId === 'smallIntestine') return (
    <svg viewBox="0 0 100 100" width="100" height="100" className={pulse} style={{ filter: base }}>
      <path d="M50,10 Q80,10 82,30 Q84,50 60,52 Q38,54 36,70 Q34,85 55,88 Q75,90 78,75"
        stroke={isActive ? '#ba1a1a' : isClicked ? '#006e2f' : '#f87171'} strokeWidth="18" fill="none" strokeLinecap="round" />
      <path d="M50,10 Q80,10 82,30 Q84,50 60,52 Q38,54 36,70 Q34,85 55,88 Q75,90 78,75"
        stroke={isActive ? '#fca5a5' : isClicked ? '#6bff8f' : '#fecaca'} strokeWidth="10" fill="none" strokeLinecap="round" />
      {/* Villi bumps */}
      <path d="M50,10 Q80,10 82,30 Q84,50 60,52 Q38,54 36,70 Q34,85 55,88 Q75,90 78,75"
        stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="3 6" strokeOpacity="0.5" />
    </svg>
  );

  if (organId === 'largeIntestine') return (
    <svg viewBox="0 0 100 90" width="100" height="90" className={pulse} style={{ filter: base }}>
      <path d="M15,75 Q10,30 25,15 Q40,5 55,15 Q70,25 72,40 Q74,55 62,65 Q50,72 35,68"
        stroke={isActive ? '#ba1a1a' : isClicked ? '#006e2f' : '#fb923c'} strokeWidth="22" fill="none" strokeLinecap="round" />
      <path d="M15,75 Q10,30 25,15 Q40,5 55,15 Q70,25 72,40 Q74,55 62,65 Q50,72 35,68"
        stroke={isActive ? '#fca5a5' : isClicked ? '#6bff8f' : '#fed7aa'} strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d="M15,75 Q10,30 25,15 Q40,5 55,15 Q70,25 72,40 Q74,55 62,65 Q50,72 35,68"
        stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="4 8" strokeOpacity="0.4" />
    </svg>
  );

  if (organId === 'blood') return (
    <svg viewBox="0 0 90 80" width="90" height="80" className={pulse} style={{ filter: base }}>
      {/* Heart shape */}
      <path d="M45,68 Q10,45 10,25 Q10,8 25,8 Q35,8 45,20 Q55,8 65,8 Q80,8 80,25 Q80,45 45,68Z"
        fill={isActive ? '#ba1a1a' : isClicked ? '#6bff8f' : '#f87171'} />
      <path d="M45,60 Q16,40 16,24 Q16,14 26,14 Q35,14 45,26 Q55,14 64,14 Q74,14 74,24 Q74,40 45,60Z"
        fill={isActive ? '#991b1b' : isClicked ? '#006e2f' : '#dc2626'} fillOpacity="0.7" />
      {/* Veins */}
      <path d="M35,30 Q40,38 45,35 Q50,32 54,40" stroke="white" strokeWidth="2" fill="none" strokeOpacity="0.6" />
      {/* Microplastic particles when active */}
      {isActive && [28,40,55,48].map((x,i)=>(
        <circle key={i} cx={x} cy={[25,40,28,48][i]} r={3} fill="#006591" fillOpacity="0.8" />
      ))}
    </svg>
  );

  return <div className="w-16 h-16 rounded-full bg-[#fca5a5]" />;
}

export default function Tahap4() {
  const router = useRouter();
  const { completeStage, setLkpdAnswer, addOrganInteraction, setMostDangerousOrgan, organInteractions, lkpdAnswers } = useJourneyStore();
  const [phase, setPhase] = useState<Phase>('bridge');
  const [activeOrgan, setActiveOrgan] = useState<Organ | null>(null);
  const [clickedIds, setClickedIds] = useState<Set<string>>(new Set(organInteractions));
  const [lkpd3q1, setLkpd3q1] = useState(lkpdAnswers.lkpd3q1);
  const [lkpd3q2, setLkpd3q2] = useState(lkpdAnswers.lkpd3q2);

  const allOrgansDone = ORGANS.every(o => clickedIds.has(o.id));

  function handleOrganClick(organ: Organ) {
    setActiveOrgan(organ);
    if (!clickedIds.has(organ.id)) {
      addOrganInteraction(organ.id);
      setClickedIds(prev => new Set([...prev, organ.id]));
    }
  }

  function handleNext() {
    setLkpdAnswer('lkpd3q1', lkpd3q1);
    setLkpdAnswer('lkpd3q2', lkpd3q2);
    if (lkpd3q2) setMostDangerousOrgan(lkpd3q2);
    completeStage(4);
    router.push('/journey/tahap-5');
  }

  const ORGAN_LABELS: Record<string, string> = {
    mouth: 'Mulut', stomach: 'Lambung',
    smallIntestine: 'Usus Halus', largeIntestine: 'Usus Besar', blood: 'Darah',
  };

  return (
    <div className="min-h-[calc(100vh-88px)] bg-[#f7f9fb] flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 adventure-map opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-0 w-80 h-80 bg-[#ba1a1a]/4 rounded-full blur-3xl pointer-events-none" />

      {/* ── Bridge ── */}
      {phase === 'bridge' && (
        <div className="flex-grow flex items-center justify-center px-4 py-8 z-10">
          <div className="max-w-lg w-full">
            <button
              onClick={() => router.push('/journey/tahap-3')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-6 rounded-xl bg-white border border-[#bec8d2] text-[#006591] font-bold text-xs hover:bg-[#e4f1f9] transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Kembali ke Tahap 3 (Kontaminasi Pangan)</span>
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-[#ffdad6] border-2 border-[#ba1a1a]/30 flex items-center justify-center mx-auto mb-4 floating">
                <span className="material-symbols-outlined text-[#ba1a1a] text-3xl">biotech</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white border border-[#bec8d2] px-4 py-1.5 rounded-full mb-4 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#ba1a1a]" />
                <span className="text-[#3e4850] text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider">Jembatan Eksperimen</span>
              </div>
              <h2 className="font-[family-name:var(--font-outfit)] text-2xl md:text-3xl font-bold mb-4 text-[#191c1e]">
                Ingat Eksperimen Tadi?
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-[#006e2f]/20 rounded-2xl p-5 text-center shadow-sm bento-card">
                <div className="text-4xl mb-3">🥗</div>
                <div className="text-sm font-bold text-[#006e2f] mb-2">Gelas A</div>
                <div className="text-[#3e4850] text-xs mb-3">Cuka + daun/kerupuk</div>
                <div className="bg-[#6bff8f]/20 border border-[#006e2f]/20 rounded-lg p-2">
                  <p className="text-[#006e2f] text-xs font-bold">✓ Melunak &amp; hancur</p>
                  <p className="text-[#3e4850] text-[10px] mt-1">Organik = bisa dicerna</p>
                </div>
              </div>
              <div className="bg-white border border-[#ba1a1a]/20 rounded-2xl p-5 text-center shadow-sm bento-card">
                <div className="text-4xl mb-3">🧴</div>
                <div className="text-sm font-bold text-[#ba1a1a] mb-2">Gelas B</div>
                <div className="text-[#3e4850] text-xs mb-3">Cuka + potongan plastik</div>
                <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 rounded-lg p-2">
                  <p className="text-[#ba1a1a] text-xs font-bold">✗ Tetap utuh</p>
                  <p className="text-[#3e4850] text-[10px] mt-1">Plastik = tidak bereaksi</p>
                </div>
              </div>
            </div>

            <div className="bg-white border-l-4 border-[#006591] rounded-xl p-5 mb-6 shadow-sm">
              <p className="text-[#3e4850] text-sm leading-relaxed">
                <strong className="text-[#191c1e]">Pertanyaan:</strong> Mengapa plastik tidak hancur meski direndam cairan asam?
                <br /><br />
                <span className="text-[#006591] font-semibold">Sekarang kita lihat apa yang terjadi di dalam organ tubuhmu...</span>
              </p>
            </div>

            <button onClick={() => setPhase('organs')}
              className="w-full bg-[#ba1a1a] hover:bg-[#93000a] text-white font-bold py-4 rounded-xl text-lg transition-all flex items-center justify-center gap-2 shadow-md shadow-[#ba1a1a]/20 hover:scale-[1.02] active:scale-[0.98]">
              <span className="material-symbols-outlined">visibility</span>
              Masuk ke Organ Pencernaan
            </button>
          </div>
        </div>
      )}

      {/* ── Organ interactive ── */}
      {phase === 'organs' && (
        <div className="flex-grow flex flex-col lg:flex-row max-w-[1400px] mx-auto w-full px-4 py-6 gap-6 z-10">
          <div className="w-full lg:col-span-full mb-1 flex items-center justify-between">
            <button
              onClick={() => setPhase('bridge')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#bec8d2] text-[#006591] font-bold text-xs hover:bg-[#e4f1f9] transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Kembali ke Pengantar</span>
            </button>
          </div>

          {/* Column 1: Left Organ selector (Buttons) */}
          <div className="lg:w-72 flex-shrink-0 flex flex-col">
            <p className="text-[#6e7881] text-xs font-[family-name:var(--font-mono)] mb-3 text-center uppercase tracking-wider">Pilih Organ</p>

            <div className="relative bg-white border border-[#bec8d2] rounded-2xl mx-auto shadow-md w-full flex flex-col items-center gap-3 p-4 py-5">
              {ORGANS.map(organ => {
                const isClicked = clickedIds.has(organ.id);
                const isActive = activeOrgan?.id === organ.id;
                return (
                  <button key={organ.id} onClick={() => handleOrganClick(organ)}
                    className={`w-full rounded-xl p-3 border-2 transition-all duration-200 flex items-center gap-3 hover:scale-105 active:scale-95 ${
                      isActive ? 'bg-[#ffdad6] border-[#ba1a1a] shadow-md'
                      : isClicked ? 'bg-[#6bff8f]/20 border-[#006e2f]/40'
                      : 'bg-[#f7f9fb] border-[#bec8d2] hover:border-[#ba1a1a]/40 hover:bg-[#ffdad6]/30'
                    }`}>
                    {/* Mini organ illustration */}
                    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                      <OrganIllustration organId={organ.id} isActive={isActive} isClicked={isClicked} />
                    </div>
                    <div className="text-left flex-grow">
                      <div className={`text-sm font-bold flex items-center gap-1 ${isActive ? 'text-[#ba1a1a]' : isClicked ? 'text-[#006e2f]' : 'text-[#191c1e]'}`}>
                        {ORGAN_LABELS[organ.id]}
                        {organ.isKeyOrgan && <span className="text-[#c39400] text-xs">★</span>}
                      </div>
                      <div className={`text-xs font-[family-name:var(--font-mono)] ${isActive ? 'text-[#ba1a1a]/70' : 'text-[#6e7881]'}`}>
                        {organ.healthPct}% kondisi
                      </div>
                      {/* Mini health bar */}
                      <div className="w-full bg-[#eceef0] rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width:`${organ.healthPct}%`, backgroundColor: organ.healthColor }} />
                      </div>
                    </div>
                    {isClicked && <span className="material-symbols-outlined text-[#006e2f] text-base flex-shrink-0">check_circle</span>}
                  </button>
                );
              })}
            </div>

            <p className="text-center text-[#6e7881] text-xs mt-3 font-[family-name:var(--font-mono)]">
              {clickedIds.size} / {ORGANS.length} organ diinvestigasi
            </p>
          </div>

          {/* Column 2: Info panel (Middle) */}
          <div className="flex-grow flex flex-col">
            {!activeOrgan ? (
              <div className="flex-grow flex items-center justify-center bg-white border border-[#bec8d2] rounded-2xl shadow-sm">
                <div className="text-center text-[#6e7881] p-8">
                  <span className="material-symbols-outlined text-6xl block mb-4 text-[#bec8d2] floating">touch_app</span>
                  <p className="text-base font-semibold text-[#3e4850] mb-2">Pilih organ di sebelah kiri</p>
                  <p className="text-sm text-[#6e7881]">untuk melihat dampak mikroplastik pada setiap organ pencernaan</p>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#bec8d2] rounded-2xl p-6 shadow-sm flex-grow">
                {/* Header */}
                <div className="flex items-start gap-4 mb-5">
                  <div className="flex-shrink-0">
                    <OrganIllustration organId={activeOrgan.id} isActive={true} isClicked={false} />
                  </div>
                  <div className="flex-grow">
                    <p className="text-xs font-[family-name:var(--font-mono)] text-[#6e7881] uppercase tracking-wider mb-1">Analisis Organ</p>
                    <h3 className="font-[family-name:var(--font-outfit)] text-2xl font-bold flex items-center gap-2 text-[#191c1e] mb-1">
                      {activeOrgan.name}
                      {activeOrgan.isKeyOrgan && (
                        <span className="text-xs bg-[#ffdf9a] border border-[#c39400]/30 text-[#785a00] px-2 py-0.5 rounded-full font-sans">★ Kunci Eksperimen</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-[family-name:var(--font-mono)] text-xl font-bold" style={{ color: activeOrgan.healthColor }}>
                        {activeOrgan.healthPct}%
                      </span>
                      <span className="text-[#6e7881] text-xs">kondisi organ</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                        activeOrgan.healthPct >= 70 ? 'bg-[#6bff8f]/20 border-[#006e2f]/30 text-[#006e2f]' :
                        activeOrgan.healthPct >= 45 ? 'bg-[#ffdf9a]/30 border-[#c39400]/30 text-[#785a00]' :
                        'bg-[#ffdad6] border-[#ba1a1a]/30 text-[#ba1a1a]'
                      }`}>
                        {activeOrgan.healthPct >= 70 ? 'Sehat' : activeOrgan.healthPct >= 45 ? 'Terancam' : 'KRITIS'}
                      </span>
                    </div>
                    <HealthBar pct={activeOrgan.healthPct} color={activeOrgan.healthColor} />
                  </div>
                </div>

                {/* Impact */}
                <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[#ba1a1a] text-base">warning</span>
                    <p className="text-xs font-[family-name:var(--font-mono)] text-[#ba1a1a] uppercase tracking-wider font-semibold">Dampak Mikroplastik</p>
                  </div>
                  <p className="text-[#191c1e] text-sm leading-relaxed">{activeOrgan.impact}</p>
                </div>

                {/* Sci note */}
                <div className="bg-[#c9e6ff]/20 border-l-4 border-[#006591] rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[#006591] text-base">science</span>
                    <p className="text-xs font-[family-name:var(--font-mono)] text-[#006591] uppercase tracking-wider font-semibold">Catatan Ilmiah</p>
                  </div>
                  <p className="text-[#3e4850] text-sm leading-relaxed">{activeOrgan.sciNote}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#f7f9fb] border border-[#bec8d2] rounded-xl p-3 text-center">
                    <div className="font-[family-name:var(--font-mono)] font-bold text-[#ba1a1a] text-lg">
                      +{activeOrgan.particles.toLocaleString()}
                    </div>
                    <div className="text-[#6e7881] text-xs mt-0.5">partikel tertahan</div>
                  </div>
                  <div className="bg-[#f7f9fb] border border-[#bec8d2] rounded-xl p-3 text-center">
                    <div className="font-[family-name:var(--font-mono)] font-bold text-[#785a00] text-lg">
                      {activeOrgan.healthPct < 50 ? '⚠ Kritis' : activeOrgan.healthPct < 70 ? '! Waspada' : '✓ Stabil'}
                    </div>
                    <div className="text-[#6e7881] text-xs mt-0.5">status risiko</div>
                  </div>
                </div>
              </div>
            )}

            {allOrgansDone && (
              <button onClick={() => setPhase('lkpd')}
                className="w-full mt-4 bg-[#006591] hover:bg-[#004c6e] text-white font-bold py-4 rounded-xl text-lg transition-all flex items-center justify-center gap-2 shadow-md shadow-[#006591]/20 hover:scale-[1.01] active:scale-[0.99]">
                Semua Organ Terinvestigasi — Isi Laporan
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            )}
          </div>

          {/* Column 3: The zooming image (Right) */}
          <div className="lg:w-[320px] flex-shrink-0 flex flex-col">
            <p className="text-[#6e7881] text-xs font-[family-name:var(--font-mono)] mb-3 text-center uppercase tracking-wider">Live Feed Anatomi</p>
            <div className="relative bg-white border border-[#bec8d2] rounded-2xl overflow-hidden shadow-md w-full h-[480px]">
              <div 
                className="absolute inset-0 transition-transform duration-700 ease-in-out"
                style={{
                  transform: activeOrgan ? `scale(${HOTSPOTS[activeOrgan.id]?.scale || 1})` : 'scale(1)',
                  transformOrigin: activeOrgan ? HOTSPOTS[activeOrgan.id]?.origin : 'center center'
                }}
              >
                <img src="/organ.png" alt="Anatomi" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── LKPD 3 ── */}
      {phase === 'lkpd' && (
        <div className="flex-grow max-w-xl mx-auto w-full px-4 py-8 z-10">
          <button
            onClick={() => setPhase('organs')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-5 rounded-xl bg-white border border-[#bec8d2] text-[#006591] font-bold text-xs hover:bg-[#e4f1f9] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Kembali ke Anatomi Organ</span>
          </button>
          <div className="bg-white border border-[#bec8d2] rounded-2xl p-6 mb-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-[#ba1a1a] text-white text-xs font-bold px-2 py-0.5 rounded font-[family-name:var(--font-mono)]">LKPD 3</span>
              <h4 className="font-bold text-[#191c1e]">Berdasarkan Eksperimen &amp; Simulasi Organ</h4>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-[#3e4850] text-sm mb-3 leading-relaxed">
                  <span className="text-[#191c1e] font-semibold">Pertanyaan 1:</span> Mengapa asam lambung (HCl) gagal mencerna plastik? Jelaskan menggunakan konsep ikatan polimer!
                </p>
                <textarea value={lkpd3q1} onChange={e => setLkpd3q1(e.target.value)}
                  className="w-full bg-[#f7f9fb] border border-[#bec8d2] rounded-xl p-4 text-[#191c1e] placeholder-[#6e7881] text-sm resize-none h-28 focus:outline-none focus:border-[#006591] focus:ring-1 focus:ring-[#006591] transition-colors"
                  placeholder="Asam lambung (HCl) gagal mencerna plastik karena rantai polimer plastik terdiri dari ikatan C-C sintetis yang..." />
              </div>
              <div>
                <p className="text-[#3e4850] text-sm mb-3 leading-relaxed">
                  <span className="text-[#191c1e] font-semibold">Pertanyaan 2:</span> Di organ mana mikroplastik paling berbahaya menurutmu? Jelaskan alasannya!
                </p>
                <textarea value={lkpd3q2} onChange={e => setLkpd3q2(e.target.value)}
                  className="w-full bg-[#f7f9fb] border border-[#bec8d2] rounded-xl p-4 text-[#191c1e] placeholder-[#6e7881] text-sm resize-none h-28 focus:outline-none focus:border-[#006591] focus:ring-1 focus:ring-[#006591] transition-colors"
                  placeholder="Organ yang paling berbahaya adalah usus halus, karena di sinilah partikel <10μm dapat diserap langsung ke dalam darah dan..." />
              </div>
            </div>
          </div>

          <button onClick={handleNext} disabled={lkpd3q1.length < 20 || lkpd3q2.length < 20}
            className="w-full bg-[#006591] hover:bg-[#004c6e] text-white font-bold py-4 rounded-xl text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#006591]/20 hover:scale-[1.01] active:scale-[0.99]">
            Simpan &amp; Lanjut ke E-LKPD <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      )}
    </div>
  );
}

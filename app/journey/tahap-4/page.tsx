'use client';
import { useReturnedToStage, useStageBack } from '@/lib/stageBack';
import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useJourneyStore } from '@/lib/journeyStore';
import { FULL_PATH, ORGANS, SOURCES, Organ } from '@/lib/organs';
import OrganEvidencePanel from '@/components/stages/OrganEvidencePanel';
import StageCompletionModal from '@/components/ui/StageCompletionModal';

const MicroplasticAR = dynamic(() => import('@/components/stages/MicroplasticAR'), { ssr: false });
const OrganViewer3D = dynamic(() => import('@/components/stages/OrganViewer3D'), { ssr: false });

type Phase = 'bridge' | 'organs' | 'lkpd';

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
  const { totalParticles, completeStage, setLkpdAnswer, addOrganInteraction, setMostDangerousOrgan, organInteractions, lkpdAnswers } = useJourneyStore();
  const returned = useReturnedToStage(4);
  const [phase, setPhase] = useState<Phase>(returned ? 'lkpd' : 'bridge');
  const [activeOrgan, setActiveOrgan] = useState<Organ | null>(null);
  const [showMicroplastic, setShowMicroplastic] = useState(false);
  const [clickedIds, setClickedIds] = useState<Set<string>>(new Set(organInteractions));
  const [lkpd3q1, setLkpd3q1] = useState(lkpdAnswers.lkpd3q1);
  const [lkpd3q2, setLkpd3q2] = useState(lkpdAnswers.lkpd3q2);
  const [showRefModal, setShowRefModal] = useState(false);
  const anatomyRef = useRef<HTMLDivElement>(null);

  const allOrgansDone = ORGANS.every(o => clickedIds.has(o.id));
  const panelInfo = activeOrgan ?? FULL_PATH;

  // Di HP model berada di bawah pilihan, jadi langsung dibawa ke sana
  function showViewer() {
    if (window.innerWidth < 768) {
      window.setTimeout(() => anatomyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }

  function handleOrganClick(organ: Organ) {
    setActiveOrgan(organ);
    if (!clickedIds.has(organ.id)) {
      addOrganInteraction(organ.id);
      setClickedIds(prev => new Set([...prev, organ.id]));
    }
    showViewer();
  }

  function handleFullPathClick() {
    setActiveOrgan(null);
    showViewer();
  }

  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // LKPD -> organ -> jalur lengkap -> pengantar -> Tahap 3
  useStageBack(() => {
    if (phase === 'lkpd') setPhase('organs');
    else if (activeOrgan) setActiveOrgan(null);
    else if (phase === 'organs') setPhase('bridge');
    else return false;
    return true;
  });

  function handleNext() {
    setLkpdAnswer('lkpd3q1', lkpd3q1);
    setLkpdAnswer('lkpd3q2', lkpd3q2);
    if (lkpd3q2) setMostDangerousOrgan(lkpd3q2);
    completeStage(4);
    setShowCompletionModal(true);
  }

  const ORGAN_LABELS: Record<string, string> = {
    mouth: 'Mulut', stomach: 'Lambung',
    smallIntestine: 'Usus Halus', largeIntestine: 'Usus Besar', blood: 'Darah',
  };

  return (
    <div className="min-h-screen pt-24 md:pt-28 pb-10 md:pb-16 bg-[linear-gradient(160deg,#083b54_0%,#006591_45%,#004c6e_100%)] text-white flex flex-col relative overflow-x-hidden">
      {/* Background patterns and glowing Orbs */}
      <div className="absolute inset-0 adventure-map opacity-10 pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#ba1a1a]/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 -right-24 w-96 h-96 bg-[#6bff8f]/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── Modal Referensi Ilmiah ── */}
      {showRefModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#083b54] border-2 border-white/20 rounded-3xl p-6 sm:p-8 max-w-2xl w-full text-white shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setShowRefModal(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div className="flex items-center gap-3 mb-6 border-b border-white/15 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#006591] border border-[#6bff8f]/40 flex items-center justify-center text-[#6bff8f]">
                <span className="material-symbols-outlined text-2xl">menu_book</span>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-outfit)] text-xl sm:text-2xl font-extrabold text-white">
                  Referensi &amp; Kredit Model
                </h3>
                <p className="text-white/70 text-xs sm:text-sm font-[family-name:var(--font-mono)]">
                  Sumber isi panel organ. Ketuk judul untuk membuka.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm">
              {Object.values(SOURCES).map(source => (
                <div key={source.doi} className="bg-white/5 border border-white/10 p-3 rounded-xl">
                  <p className="font-bold text-[#6bff8f] mb-0.5">{source.label}, {source.journal}</p>
                  <a href={`https://doi.org/${source.doi}`} target="_blank" rel="noreferrer" className="text-white/90 leading-relaxed underline underline-offset-2">
                    {source.title}
                  </a>
                </div>
              ))}

              <div className="bg-white/5 border border-[#ffdf9a]/40 p-3 rounded-xl">
                <p className="font-bold text-[#ffdf9a] mb-0.5">Kredit model 3D organ</p>
                <p className="text-white/90 leading-relaxed">
                  <a href="http://lifesciencedb.jp/bp3d/info_en/license/index.html" target="_blank" rel="noreferrer" className="underline underline-offset-2">BodyParts3D</a>, Copyright© 2008 Life Science Integrated Database Center, lisensi{' '}
                  <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en" target="_blank" rel="noreferrer" className="underline underline-offset-2">CC BY-SA 2.1 Jepang</a>.
                  Diubah oleh tim MicroJourney: bagian digabung per organ, poligon disederhanakan, diwarnai, dan ditambah partikel ilustratif. Bentuk organ tidak diubah.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRefModal(false)}
              className="mt-6 w-full py-3 bg-[linear-gradient(180deg,#f0a345_0%,#d27b22_100%)] text-[#3b2313] font-extrabold rounded-xl text-sm hover:brightness-110 transition-all shadow-md"
            >
              Tutup Referensi
            </button>
          </div>
        </div>
      )}

      {/* ── Bridge ── */}
      {phase === 'bridge' && (
        <div className="flex-grow flex flex-col justify-center max-w-7xl mx-auto w-full px-4 sm:px-8 py-4 z-10">
          <div className="w-full">
            <div className="text-center mb-4 md:mb-5">
              <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 px-3 py-0.5 rounded-full mb-1">
                <span className="material-symbols-outlined text-[#ff8c8c] text-base">biotech</span>
                <span className="text-white/90 text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold">Jembatan Eksperimen</span>
              </div>
              <h2 className="font-[family-name:var(--font-outfit)] text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                Ingat Eksperimen Tadi?
              </h2>
            </div>

            {/* 2-Column Side-by-Side Grid (No Scroll Layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-6 items-stretch">
              {/* Left Column: Gelas A & B Cards (7 cols) */}
              <div className="lg:col-span-7 grid grid-cols-2 gap-3 md:gap-4">
                <div className="bg-white/10 backdrop-blur-xl border border-[#6bff8f]/30 rounded-2xl p-3 md:p-5 text-center shadow-2xl bento-card flex flex-col justify-between">
                  <div>
                    <span className="material-symbols-outlined text-4xl md:text-5xl text-[#6bff8f] mb-1">eco</span>
                    <div className="text-base md:text-lg font-extrabold text-[#6bff8f] mb-0.5">Gelas A</div>
                    <div className="text-white/90 text-xs sm:text-sm mb-2 md:mb-4">Cuka + daun/kerupuk</div>
                  </div>
                  <div className="bg-[#6bff8f]/20 border border-[#6bff8f]/40 rounded-xl p-2 md:p-3">
                    <p className="text-[#6bff8f] text-sm font-extrabold">Melunak &amp; hancur</p>
                    <p className="text-white/80 text-xs mt-0.5">Organik = dapat dicerna</p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl border border-[#ff8c8c]/30 rounded-2xl p-3 md:p-5 text-center shadow-2xl bento-card flex flex-col justify-between">
                  <div>
                    <span className="material-symbols-outlined text-4xl md:text-5xl text-[#ff8c8c] mb-1">water_bottle</span>
                    <div className="text-base md:text-lg font-extrabold text-[#ff8c8c] mb-0.5">Gelas B</div>
                    <div className="text-white/90 text-xs sm:text-sm mb-2 md:mb-4">Cuka + potongan plastik</div>
                  </div>
                  <div className="bg-[#ba1a1a]/30 border border-[#ff8c8c]/40 rounded-xl p-2 md:p-3">
                    <p className="text-[#ff8c8c] text-sm font-extrabold">Tetap utuh</p>
                    <p className="text-white/80 text-xs mt-0.5">Plastik = tidak bereaksi</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Question Card + Action Button (5 cols) */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-3 md:gap-4">
                <div className="bg-white/10 backdrop-blur-xl border-l-4 border-[#6bff8f] rounded-2xl p-4 sm:p-6 shadow-2xl flex-grow flex flex-col justify-center">
                  <p className="text-white font-bold text-base sm:text-xl leading-snug">
                    Mengapa plastik tidak hancur meski direndam cairan asam?
                  </p>
                  <p className="text-[#6bff8f] font-semibold text-sm sm:text-base mt-2">
                    Sekarang kita telusuri jalur yang mungkin dilalui, dan apa yang sudah diketahui peneliti.
                  </p>
                </div>

                <button onClick={() => setPhase('organs')}
                  className="w-full bg-[linear-gradient(180deg,#f0a345_0%,#d27b22_100%)] hover:brightness-110 text-[#3b2313] font-extrabold py-4 sm:py-5 rounded-2xl text-base sm:text-xl transition-all flex items-center justify-center gap-3 shadow-[0_6px_0_#9a5310,0_10px_20px_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-[0_2px_0_#9a5310] flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl sm:text-3xl">visibility</span>
                  Masuk ke Organ Pencernaan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Organ interactive ── */}
      {phase === 'organs' && (
        <div className={`flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 py-2 md:py-6 gap-3 md:gap-6 z-10 flex flex-col ${allOrgansDone ? 'pb-24 md:pb-6' : ''}`}>
          <div className="w-full flex items-center justify-between gap-3">
            <p className="text-sm sm:text-base font-bold text-white">
              Ketuk organ untuk menyelidiki{' '}
              <span className="text-[#6bff8f] font-[family-name:var(--font-mono)]">{clickedIds.size}/{ORGANS.length}</span>
            </p>
            <button
              onClick={() => setShowRefModal(true)}
              title="Referensi Ilmiah"
              aria-label="Referensi Ilmiah"
              className="w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 rounded-xl bg-[#006591]/60 hover:bg-[#006591] border border-[#6bff8f]/40 text-[#6bff8f] font-bold text-xs sm:text-sm backdrop-blur-md transition-all shadow-md flex items-center justify-center gap-2 flex-shrink-0"
            >
              <span className="material-symbols-outlined text-lg">menu_book</span>
              <span className="hidden sm:inline">Referensi Ilmiah</span>
            </button>
          </div>

          {/* 3-Column Layout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-6 items-stretch">
            {/* Column 1: Left Organ selector (Buttons) */}
            <div className="md:col-span-2 lg:col-span-3 flex flex-col">
              <p className="hidden md:block text-white/80 text-xs sm:text-sm font-[family-name:var(--font-mono)] mb-3 text-center uppercase tracking-wider font-semibold">Pilih Organ</p>

              <div className="relative md:bg-white/10 md:backdrop-blur-xl md:border md:border-white/20 md:rounded-2xl md:shadow-2xl w-full grid grid-cols-3 lg:grid-cols-1 lg:content-start gap-2 sm:gap-3 md:p-4 flex-grow">
                <button onClick={handleFullPathClick} aria-pressed={!activeOrgan}
                  className={`relative w-full rounded-xl p-2 sm:p-3 border transition-all duration-200 flex flex-col lg:flex-row items-center gap-1 lg:gap-3 active:scale-95 ${
                    !activeOrgan ? 'bg-[#006591]/70 border-[#6bff8f] ring-2 ring-[#6bff8f]/40' : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/15'
                  }`}>
                  <div className="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-3xl sm:text-4xl text-[#6bff8f]">route</span>
                  </div>
                  <div className="w-full text-center lg:text-left flex-grow min-w-0 text-xs sm:text-sm font-bold text-white">Jalur Lengkap</div>
                </button>
                {ORGANS.map(organ => {
                  const isClicked = clickedIds.has(organ.id);
                  const isActive = activeOrgan?.id === organ.id;
                  return (
                    <button key={organ.id} onClick={() => handleOrganClick(organ)}
                      className={`relative w-full rounded-xl p-2 sm:p-3 border transition-all duration-200 flex flex-col lg:flex-row items-center gap-1 lg:gap-3 active:scale-95 ${
                        isActive ? 'bg-[#ba1a1a]/40 border-[#ff8c8c] shadow-[0_0_15px_rgba(255,140,140,0.4)] ring-2 ring-[#ff8c8c]/50'
                        : isClicked ? 'bg-[#006e2f]/30 border-[#6bff8f]/60'
                        : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/15'
                      }`}>
                      {/* Mini organ illustration */}
                      <div className="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 [&>svg]:w-full [&>svg]:h-full">
                        <OrganIllustration organId={organ.id} isActive={isActive} isClicked={isClicked} />
                      </div>
                      <div className="w-full text-center lg:text-left flex-grow min-w-0">
                        <div className={`text-xs sm:text-sm font-bold flex items-center justify-center lg:justify-start gap-1 ${isActive ? 'text-[#ff8c8c]' : isClicked ? 'text-[#6bff8f]' : 'text-white'}`}>
                          <span className="truncate">{ORGAN_LABELS[organ.id]}</span>
                          {organ.isKeyOrgan && <span className="material-symbols-outlined text-[#ffdf9a] text-sm leading-none flex-shrink-0" title="Organ kunci">key</span>}
                        </div>
                      </div>
                      {isClicked && <span className="absolute lg:static top-1 right-1 material-symbols-outlined text-[#6bff8f] text-sm lg:text-lg flex-shrink-0">check_circle</span>}
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Column 2: Info panel (Middle) */}
            <div className="order-3 md:order-none md:col-span-1 lg:col-span-4 flex flex-col">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-5 shadow-2xl flex-grow text-white flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
                    {activeOrgan ? (
                      <OrganIllustration organId={activeOrgan.id} isActive={true} isClicked={false} />
                    ) : (
                      <span className="material-symbols-outlined text-4xl text-[#6bff8f]">route</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-[family-name:var(--font-outfit)] text-xl sm:text-2xl font-extrabold flex items-center gap-2 text-white">
                      <span className="truncate">{panelInfo.name}</span>
                      {activeOrgan?.isKeyOrgan && (
                        <span className="text-[10px] sm:text-xs bg-[#ffdf9a]/20 border border-[#ffdf9a]/50 text-[#ffdf9a] px-2 py-0.5 rounded-full font-sans flex-shrink-0 inline-flex items-center gap-0.5"><span className="material-symbols-outlined text-xs leading-none">key</span>Kunci</span>
                      )}
                    </h3>
                    {!activeOrgan && totalParticles > 0 && (
                      <p className="text-xs text-white/75 leading-snug mt-0.5">
                        Simulasi makananmu di Tahap 3: {totalParticles.toLocaleString('id-ID')} partikel. Ini hitungan ilustrasi, bukan jumlah di dalam tubuhmu.
                      </p>
                    )}
                  </div>
                </div>

                <OrganEvidencePanel key={panelInfo.name} info={panelInfo} />

                <button
                  onClick={() => setShowMicroplastic(true)}
                  className="mt-auto w-full min-h-12 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined text-xl text-[#6bff8f]">category</span>
                  <span>Lihat bentuk mikroplastik 3D</span>
                </button>
              </div>
            </div>

            {/* Column 3: Model 3D (Right) */}
            <div ref={anatomyRef} className="order-2 md:order-none md:col-span-1 lg:col-span-5 flex flex-col scroll-mt-20 md:sticky md:top-24 md:self-start md:h-[calc(100dvh-7.5rem)] md:max-h-[720px]">
              <OrganViewer3D view={panelInfo.view} paused={showMicroplastic} />
            </div>
          </div>

          {/* Full-width Bottom CTA when all organs are completed */}
          {allOrgansDone && (
            <div className="fixed bottom-0 left-0 right-0 p-4 md:relative md:p-0 md:mt-3 z-50 bg-gradient-to-t from-[#004c6e] via-[#004c6e]/80 to-transparent md:bg-none pointer-events-none">
              <button onClick={() => setPhase('lkpd')}
                className="w-full max-w-7xl mx-auto bg-[linear-gradient(180deg,#f0a345_0%,#d27b22_100%)] hover:brightness-110 text-[#3b2313] font-extrabold py-4 rounded-xl text-sm sm:text-xl transition-all flex items-center justify-center gap-2 shadow-[0_4px_0_#9a5310,0_8px_15px_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-[0_2px_0_#9a5310] pointer-events-auto">
                Semua Organ Terinvestigasi — Isi Laporan
                <span className="material-symbols-outlined text-xl sm:text-2xl">arrow_forward</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── LKPD 3 ── */}
      {phase === 'lkpd' && (
        <div className="flex-grow max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 z-10">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 sm:p-8 mb-6 shadow-2xl text-white">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="bg-[#ba1a1a] text-white text-xs sm:text-sm font-bold px-3 py-1 rounded-md font-[family-name:var(--font-mono)]">LKPD 3</span>
              <h4 className="font-bold text-white text-base sm:text-lg">Berdasarkan Eksperimen &amp; Simulasi Organ</h4>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-white/90 text-sm sm:text-base mb-3 leading-relaxed">
                  <span className="text-white font-semibold">Pertanyaan 1:</span> Mengapa asam lambung (HCl) gagal mencerna plastik? Jelaskan menggunakan konsep ikatan polimer!
                </p>
                <textarea value={lkpd3q1} onChange={e => setLkpd3q1(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 rounded-xl p-4 sm:p-5 text-white placeholder-white/40 text-sm sm:text-base resize-none h-32 focus:outline-none focus:border-[#6bff8f] focus:ring-1 focus:ring-[#6bff8f] transition-colors"
                  placeholder="Asam lambung (HCl) gagal mencerna plastik karena rantai polimer plastik terdiri dari ikatan C-C sintetis yang..." />
              </div>
              <div>
                <p className="text-white/90 text-sm sm:text-base mb-3 leading-relaxed">
                  <span className="text-white font-semibold">Pertanyaan 2:</span> Di organ mana mikroplastik paling berbahaya menurutmu? Jelaskan alasannya!
                </p>
                <textarea value={lkpd3q2} onChange={e => setLkpd3q2(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 rounded-xl p-4 sm:p-5 text-white placeholder-white/40 text-sm sm:text-base resize-none h-32 focus:outline-none focus:border-[#6bff8f] focus:ring-1 focus:ring-[#6bff8f] transition-colors"
                  placeholder="Menurutku organ yang paling perlu diperhatikan adalah ..., karena menurut penelitian yang kubaca ..." />
              </div>
            </div>
          </div>

          <button onClick={handleNext} disabled={lkpd3q1.length < 20 || lkpd3q2.length < 20}
            className="w-full bg-[linear-gradient(180deg,#f0a345_0%,#d27b22_100%)] hover:brightness-110 text-white font-extrabold py-4 rounded-xl text-lg sm:text-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_6px_0_#9a5310,0_10px_20px_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-[0_2px_0_#9a5310]">
            Simpan &amp; Lanjut ke E-LKPD <span className="material-symbols-outlined text-2xl">arrow_forward</span>
          </button>
        </div>
      )}

      {showMicroplastic && <MicroplasticAR organName={activeOrgan?.name} onClose={() => setShowMicroplastic(false)} />}

      <StageCompletionModal
        isOpen={showCompletionModal}
        stageNumber={4}
        stageTitle="Organ Pencernaan Manusia"
        xpEarned={100}
        nextStagePath="/journey/tahap-5"
        onClose={() => setShowCompletionModal(false)}
      />
    </div>
  );
}

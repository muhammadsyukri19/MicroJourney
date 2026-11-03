'use client';
import { useEffect, useState } from 'react';

type Phase = 'intro' | 'stomach' | 'intestine' | 'complete';

interface Props {
  onComplete: () => void;
}

export default function Stage4Digestion({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [tick, setTick] = useState(0);
  const [organicDissolved, setOrganicDissolved] = useState(false);
  const [showScratch, setShowScratch] = useState(false);
  const [plasticBlocked, setPlasticBlocked] = useState(false);

  useEffect(() => {
    if (phase !== 'stomach') return;
    const interval = setInterval(() => setTick(t => t + 1), 50);
    const t1 = setTimeout(() => setOrganicDissolved(true), 2500);
    const t2 = setTimeout(() => setShowScratch(true), 4000);
    const t3 = setTimeout(() => setPhase('intestine'), 7000);
    return () => { clearInterval(interval); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'intestine') return;
    const interval = setInterval(() => setTick(t => t + 1), 50);
    const t1 = setTimeout(() => setPlasticBlocked(true), 2000);
    return () => { clearInterval(interval); clearTimeout(t1); };
  }, [phase]);

  // Acid bubble positions
  const bubbles = Array.from({ length: 8 }, (_, i) => ({
    cx: 80 + i * 50,
    cy: 200 + Math.sin((tick * 0.12 + i) * 0.8) * 12,
    r: 6 + (i % 3) * 3,
    op: 0.3 + Math.sin(tick * 0.08 + i) * 0.2,
  }));

  return (
    <div className="relative w-full h-full bg-[#0d0d1a] flex flex-col overflow-hidden">
      {/* Intro */}
      {phase === 'intro' && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="bg-gray-900 border border-red-900/40 p-8 rounded-2xl max-w-lg w-full text-center">
            <span className="material-symbols-outlined text-red-400 text-5xl mb-4 block">biotech</span>
            <h3 className="text-white font-bold text-xl mb-4">Investigasi X-Ray: Organ Dalam</h3>
            <div className="bg-amber-950/50 border border-amber-600/30 rounded-xl p-4 mb-4 text-left">
              <p className="text-amber-300 text-xs font-bold mb-2">Ingat Eksperimen Asam Lambung di Kelas?</p>
              <p className="text-white/70 text-sm">
                Gelas A (cuka + daun) → daun melunak & hancur.<br />
                Gelas B (cuka + plastik) → plastik tetap utuh, tidak bereaksi.
              </p>
            </div>
            <div className="bg-red-950/40 border border-red-600/30 rounded-xl p-4 mb-6 text-left">
              <p className="text-red-300 text-xs font-bold mb-1">Konsep Ilmiah</p>
              <p className="text-white/70 text-xs leading-relaxed">
                Lambung menghasilkan HCl & enzim protease yang mampu mencerna protein organik.
                Namun <strong className="text-white">rantai polimer sintetis plastik</strong> terlalu kuat — tidak bereaksi dengan asam maupun enzim apapun. Inilah yang disebut <em>indigestible</em>.
              </p>
            </div>
            <button
              onClick={() => setPhase('stomach')}
              className="bg-red-700 hover:bg-red-600 text-white font-bold px-8 py-4 rounded-xl transition-colors"
            >
              Aktifkan Mode X-Ray
            </button>
          </div>
        </div>
      )}

      {/* Stomach visualization */}
      {phase === 'stomach' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 gap-4">
          <div className="text-green-400 text-xs font-mono font-bold tracking-widest">
            ◈ X-RAY AKTIF — LAMBUNG MANUSIA
          </div>

          <svg viewBox="0 0 480 320" className="w-full max-w-2xl">
            <defs>
              <radialGradient id="stomachGrad" cx="50%" cy="50%">
                <stop offset="0%" stopColor="rgba(220,80,80,0.05)" />
                <stop offset="100%" stopColor="rgba(180,40,40,0.2)" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Stomach outline */}
            <path d="M100,80 Q60,80 50,140 Q40,220 80,260 Q130,300 200,295 Q310,300 370,260 Q420,220 420,160 Q420,90 360,80 Q300,65 240,70 Q180,75 100,80Z"
              fill="url(#stomachGrad)" stroke="rgba(255,100,100,0.5)" strokeWidth="2.5" />

            {/* HCl acid surface */}
            {bubbles.map((b, i) => (
              <ellipse key={i} cx={b.cx} cy={b.cy} rx={b.r} ry={b.r * 0.5}
                fill={`rgba(150,255,150,${b.op})`} stroke="rgba(100,255,100,0.4)" strokeWidth="1" />
            ))}

            {/* HCl label */}
            <text x="240" y="295" textAnchor="middle" fontSize="11" fill="rgba(120,255,120,0.7)">
              HCl + Enzim Protease
            </text>

            {/* Organic: daun */}
            <g style={{ transition: 'opacity 1.5s ease', opacity: organicDissolved ? 0 : 1 }}>
              <ellipse cx="155" cy="130" rx="28" ry="20" fill="rgba(100,180,60,0.8)" />
              <text x="155" y="134" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">daun</text>
              {/* dissolve particles */}
              {[0, 1, 2, 3].map(i => (
                <circle key={i} cx={130 + i * 14} cy={165 + i * 12} r="4"
                  fill={`rgba(100,200,60,${Math.max(0, 0.8 - tick * 0.005)})`}>
                </circle>
              ))}
            </g>
            {organicDissolved && (
              <text x="155" y="145" textAnchor="middle" fontSize="10" fill="rgba(100,220,80,0.8)">Terlarut</text>
            )}

            {/* Plastic: stays */}
            <rect x="290" y="115" width="50" height="35" rx="6" fill="rgba(41,182,246,0.85)" />
            <text x="315" y="136" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">plastik</text>
            <text x="315" y="148" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.7)">PET</text>

            {/* Scratch marks */}
            {showScratch && (
              <g stroke="rgba(255,80,80,0.9)" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)">
                <line x1="340" y1="105" x2="370" y2="130" />
                <line x1="345" y1="120" x2="380" y2="140" />
                <line x1="338" y1="135" x2="365" y2="155" />
              </g>
            )}

            {/* Plastic arrow down showing it persists */}
            <path d="M315,152 L315,200" stroke="rgba(41,182,246,0.5)" strokeWidth="1.5" strokeDasharray="4,3" />
            <polygon points="310,200 315,210 320,200" fill="rgba(41,182,246,0.5)" />
          </svg>

          {/* Status badges */}
          <div className="flex gap-3 flex-wrap justify-center">
            <div className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-1000 ${organicDissolved ? 'bg-green-900 text-green-300 border border-green-600' : 'bg-green-950/50 text-green-400 border border-green-800'}`}>
              {organicDissolved ? 'Organik: TERURAI SEMPURNA' : 'Organik: bereaksi dengan asam...'}
            </div>
            <div className={`px-4 py-2 rounded-full text-xs font-bold border ${showScratch ? 'bg-red-900 text-red-300 border-red-600' : 'bg-blue-950/50 text-blue-300 border-blue-800'}`}>
              {showScratch ? 'Plastik: MENGGORES DINDING LAMBUNG' : 'Plastik: tidak bereaksi (indigestible)'}
            </div>
          </div>
        </div>
      )}

      {/* Intestine visualization */}
      {phase === 'intestine' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 gap-4">
          <div className="text-green-400 text-xs font-mono font-bold tracking-widest">
            ◈ ZOOM-IN OTOMATIS — VILI USUS HALUS
          </div>

          <svg viewBox="0 0 480 260" className="w-full max-w-2xl">
            {/* Intestine wall */}
            <rect x="0" y="0" width="480" height="260" fill="rgba(160,70,60,0.08)" />
            <rect x="0" y="0" width="480" height="260" fill="none" stroke="rgba(200,100,80,0.2)" strokeWidth="8" rx="12" />

            {/* Vili - finger projections */}
            {Array.from({ length: 7 }, (_, i) => {
              const cx = 34 + i * 64;
              return (
                <g key={i}>
                  <rect x={cx - 16} y={55} width={32} height={130} rx={16}
                    fill="rgba(210,110,90,0.35)" stroke="rgba(255,140,110,0.5)" strokeWidth="1.5" />
                  {/* Absorption dots */}
                  <circle cx={cx} cy={195} r={plasticBlocked ? 3 : 8}
                    fill={`rgba(255,200,50,${plasticBlocked ? 0.2 : 0.5})`}
                    style={{ transition: 'all 1s ease' }}>
                  </circle>
                  {!plasticBlocked && (
                    <circle cx={cx} cy={195} r={8} fill="none" stroke="rgba(255,200,50,0.3)" strokeWidth="1">
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Microplastic particles */}
            {plasticBlocked && Array.from({ length: 10 }, (_, i) => (
              <rect
                key={i}
                x={20 + i * 44 + (i % 2) * 16}
                y={130 + (i % 3) * 8}
                width={10} height={10} rx={2}
                fill="rgba(41,182,246,0.85)"
                style={{
                  transition: `all ${0.5 + i * 0.1}s ease`,
                }}
              />
            ))}

            {/* Labels */}
            <text x="240" y="245" textAnchor="middle" fontSize="11" fill="rgba(255,140,110,0.7)">
              Vili usus halus (tonjolan penyerap sari makanan)
            </text>
            {plasticBlocked && (
              <text x="240" y="25" textAnchor="middle" fontSize="11" fill="rgba(255,80,80,0.9)" fontWeight="bold">
                Penyerapan sari makanan terhambat
              </text>
            )}
          </svg>

          <div className="bg-red-950/40 border border-red-600/30 rounded-xl p-4 max-w-md text-center">
            <p className="text-red-300 text-sm font-bold mb-1">Penyumbatan Vili Usus Terdeteksi</p>
            <p className="text-white/60 text-xs">
              Mikroplastik menumpuk secara mekanis di antara vili usus, menghambat penyerapan nutrisi dan berpotensi menyebabkan peradangan kronis.
            </p>
          </div>

          <button
            onClick={() => setPhase('complete')}
            className="bg-[var(--color-primary)] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2"
          >
            Catat Hasil Pengamatan <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      )}

      {/* Complete */}
      {phase === 'complete' && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="bg-gray-900 border border-green-900/40 p-8 rounded-2xl max-w-sm text-center">
            <span className="material-symbols-outlined text-green-400 text-5xl mb-4 block">science</span>
            <h3 className="text-white font-bold text-xl mb-3">Investigasi Fisiologis Selesai</h3>
            <div className="space-y-2 text-left mb-6">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-base leading-none text-green-400">check</span>
                <p className="text-white/70 text-sm">Asam lambung (HCl) tidak mampu mengurai polimer sintetis plastik</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-base leading-none text-red-400">check</span>
                <p className="text-white/70 text-sm">Partikel plastik tajam menggores dinding lambung</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-base leading-none text-orange-400">check</span>
                <p className="text-white/70 text-sm">Vili usus halus tersumbat — penyerapan nutrisi terganggu</p>
              </div>
            </div>
            <button
              onClick={onComplete}
              className="w-full bg-[var(--color-primary)] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              Isi Laporan E-LKPD <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

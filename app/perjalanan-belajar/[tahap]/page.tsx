'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { stages, getStageById, type Stage } from '@/lib/stagesData';
import { useJourneyStore } from '@/lib/journeyStore';
import { useAuthStore } from '@/lib/authStore';

// Per-stage: background environment, centered AR object, extra left/right panel content
const stageConfig: Record<number, {
  bg: string;
  arObject?: string;
  arObjectAlt?: string;
  leftExtra?: React.ReactNode;
  rightExtra?: React.ReactNode;
}> = {
  1: {
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5_aeekQiaRlY8j3M5PDijhKFT-tsZ1wD0KPee0n38umRA8-G1weOZdYpIs7VJP6jFTnBQfcvTI3hLypfNM7jDhjC2XezZzP1ai-BxT-75Jv0g8aoc_NHIq2sBqx0_6yDSyNSfnti1WLaqJAEqEB3Gz2O8VBjpk1G6q-0balqjztc3FbTl1v05gBcn0-djLL7Lno4k0M76gU0YkhlBowbSVKcMgMFjNMV6-KG33hsPb8tbCbYo-dTj1fLtBdrNIcVLhgPYfZ-Nmw',
    arObject: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZmvIGufJoKC7GBLRcB8jXymU2xlQSBKNw8QYLyU3colAzmLVf4jxXhbV2eK1tu9q8rTrFeiOCDcfaJeFnnoPeaB92r49GYHrycP80O_Yl9EYkcMzN3-Qg_jM3WZ1_TZn4D9VSlOleM_PSd-ArLZ12MBbblB3zWTUV7gCvDSQXh7NJPHGtaZ90weyOtdZ3LD4XgkjxmjXjPAO3usvudsBAvrNhqph3ARhfVKvMgr6DSxt5RXQbPL4GXeblLEQH9w-rT3g3XCOIbA',
    arObjectAlt: 'Plastic bottle AR scan',
  },
  2: {
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMMrubUcAOnIrZf92Tb4yUpvtc1wAUbdY_j2H1rgWqQh4MK-ip7hzWB3TGvQ7is3SaTVhkE7pFsPRRJPeeycL3DBdwvk8MfSmbhiwQyUuXdJgbHDzKvqkhJtcgNYs9A-aDSYAh5N6My4M3lypXCW2UMAfOpjvHZFH-xUEPTq3Bwq4LbTo3z9ubnVAxT70Pc_MLO4KzZno1Os9tPrVXPdTaiV0-hmKFmKem7z6muDXCbUZ9SeXg6cD6oG2yntOGftmQAclQBpomMg',
    arObject: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0aCdn58v3S6CTOoyseRtPJKSaiKHhTFRTL7oDgH3HhyUVMGegOhI9Qg0qpAO1Y4ei-5-DTfopeLJQbyNJ03UFYIpkCaQiGGK8GTZydU_gHQt_jVn03YXD0cEHOG4u9-t54LND1uC1bNLARPlb0mTwygCCXvWlgDWlgCf6FhIcs1p9KVm7ZdpQlwPE9SCFP-4rtLdMHp3D1HXGJBKX5jzg_aZCcE_Tie4jgHo_3jeRPpN9Ct0nYk41AkQp6dfjMvL4sqIPw6oS0A',
    arObjectAlt: 'Plastic bottle weathering simulation',
  },
  3: {
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA06nPWWCGVYLlEG-XR4L-Zj71yd9Iw9M2yTXJKeHPk2xUOQ9F_yNOSwt9gT8PUHElDDbBnFUON_pkJeksQXmRyqf7FjePWQ3GW-1351s87TavxjCWYBbC5p6_F8lO3GxcBgT6PFACtbFNHM5xHrwsqEM9Z93eG75wPSfTfLYr6MDTZ7szVEfnv4WLtVtoXTMXRawTQ81bi-v4TBzUZxhU53EW4F3az5Ojd73bdMBbNuAuNfd6hMzuFWfp2hrzY0BPMWDVbOwmQIw',
    arObject: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsdwO_vT5YWG-R8e0Bwsh8PfEzmpUF0LzjGOUXnohyJQsn0GlKvTxAx8xvDAMxHYPG0vGlLy5duSXApG2JEAiVEsjcyVHgyVT5eYAeb4U5DOmqR7Ail5ZA7n2L0lzBGmo1pUAmg7CbVWvwPTeTuInaL2x7qR0NAb1EvCZczitfEPa07LfeZGwJu02gJK8-Gu7kaj5RhVA_XD3tBUu9HlTZrX3BTGqn0d3Yc-Xoz14oq9X0Dz2ZTiYXLTn0iltVvN7_uH0ohBE0cw',
    arObjectAlt: 'Microplastics in ocean',
  },
  4: {
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5F6RT-ZS8BfHcJJJWoPiVgW7k79vfUt-lL-P0ArfW0qKhzyT5wxxsWLdDsYMPXK2jIybXPW7KpxJZgxlGw6ayiDYb6KTBki43qkud-m91HWPICTEzOVn_9lQ3qQrSiR9ueTQ3yb15t-tBg8OTl-7RSuifaAun9uN6Nun-uQMdxetaEtcmey8_gNei0OuLCiiUxmOLMkJbUcVtdn-18D3vEoyFz6K2HzX8MNrA8fUWt32S-Yt0409IS7vhEWtKwpU6ISSNqjn0OQ',
    arObject: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAs72Bjnc2y_q4UG6n4NJLLyPl3pWczJCeJCHd741RMK9yApAxlTTMYIuBMrFa9X3xBuc4A6UR_I7cdh2h-fkKTbJkLAzgua0uKag_IkirC3h1p8vuNdBubE7yWWrWU2cVE0P0faZtR1eccwl84r7OkPWYK0yov6AIJVpPDtWPBL1Z3tjLEXix6e2DHniyb7fAgySPh9wWYsq-ReYQb-aVdQBSEkGQEw78xxUb5S80FqVNPzgyHlN3qWdLKKUzoFViLVFBROdREaw',
    arObjectAlt: '3D fish model with X-ray visualization',
  },
  5: {
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCz7CICBlhi-SOP9SLUa5F0mXDj1LG20gVuoxgbByT1y1bTZPZERpdoV8ndYumY_F7cYw2FiHWuSpA8hpGt8J1e7mJ0SmOXyZkzg1joJvB6-VVPt2fJsvfend-5i1zKcE-16NLwDYUUVJOrcgTECFoI0oMfJXIjWAgeP3NJ8FCIF8D0P4EEVzRxq0ghNmovYNuQlZYYkUMbdt7wpLpC6_gDsJ5o1vGk-sYudT6S-Kdb5d-8TWEHTRgURtMbeGIKv5olSb4tIuLB2w',
  },
  6: {
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCkgGM3yijKm9HTyQQ-6ESmG1wG_4fzdqZt-a4ykiOA8rx01epYRV5IisjS3fFtJe2Uzi15hJrsPfILDwZTPCn2OPhmXi9mul4WZfvtS7qH8F1XJjVB-SDCxtwL049Oq7DiVoRsbAWE3SwOOy6dyBsQ0bUbqj3UEh0ViWbE_opc0fixNTfFuqETB5rzCrgPusw6iDve-xNxsq-mxmceMO4kVYFef1Jgzl6j84cE98OSaUzoyJyGwtEK2-5lXRyxxPCZGZG0WFq4A',
    arObject: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDy5fAIc5LWusKVlcpUVNobpSd-2i0937BdTSl2Rimqcy0zMFGGBx1yo-SCR_8Vf5d0F9PnPZiXm-ubfMRaeDqNOBPsZh2rAhO7s9EzwC1nkyF8LKNrJyr8Ex_PcrxIOuMf3WniSFV1LES0i16FLLM5bZggyavci70EDWazVfqCUvSg27YBeeILwOR1iFXZrSaJiCt2bbAmy2TlYptHEOLbf4F15rXdQpx2pRrS63Z8eK736U7b_DccWbNE4DXPqlXdeVCt-C8LHQ',
    arObjectAlt: 'Human anatomy microplastic impact',
  },
};

export default function TahapPage() {
  const params = useParams();
  const router = useRouter();
  const stageId = Number(params.tahap);
  const stage = getStageById(stageId);
  const { incrementCorrect, incrementWrong } = useJourneyStore();

  const [quizState, setQuizState] = useState<'idle' | 'answered' | 'correct' | 'wrong'>('idle');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizVisible, setQuizVisible] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  useEffect(() => {
    setQuizState('idle');
    setSelectedOption(null);
    setQuizVisible(true);
    setCompleted(false);
    setXpEarned(0);
  }, [stageId]);

  if (!stage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Tahap tidak ditemukan</p>
          <Link href="/perjalanan-belajar" className="text-[var(--color-primary)] underline">Kembali ke Peta</Link>
        </div>
      </div>
    );
  }

  const nextStage = stages.find((s: Stage) => s.id === stageId + 1);
  const prevStage = stages.find((s: Stage) => s.id === stageId - 1);

  function handleAnswer(idx: number) {
    if (quizState === 'answered') return;
    const option = stage!.quiz.options[idx];
    setSelectedOption(idx);
    setQuizState('answered');

    if (option.isCorrect) {
      setQuizState('correct');
      incrementCorrect();
      setTimeout(() => {
        setQuizVisible(false);
        setCompleted(true);
        setXpEarned(stage!.xpReward);
        if (useAuthStore.getState().currentUser) fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: 'student_001', completedStage: stageId, xpEarned: stage!.xpReward }),
        }).catch(console.error);
      }, 1200);
    } else {
      setQuizState('wrong');
      incrementWrong();
      setTimeout(() => {
        setQuizState('idle');
        setSelectedOption(null);
      }, 1000);
    }
  }

  function getOptionClass(idx: number): string {
    const base = 'w-full py-4 px-6 rounded-xl border-2 transition-all font-semibold text-sm flex justify-between items-center text-left';
    if (quizState === 'idle' || selectedOption !== idx) {
      return `${base} border-[var(--color-outline-variant)] hover:border-[var(--color-secondary)] hover:bg-[var(--color-secondary-container)]/10 cursor-pointer`;
    }
    if (quizState === 'correct') {
      return `${base} border-[var(--color-secondary)] bg-[var(--color-secondary-container)] cursor-default`;
    }
    if (quizState === 'wrong') {
      return `${base} border-[var(--color-error)] bg-[var(--color-error-container)] cursor-default`;
    }
    return `${base} border-[var(--color-outline-variant)] cursor-default`;
  }

  return (
    <div className="bg-[var(--color-background)] text-[var(--color-on-surface)] min-h-screen flex flex-col">
      <Navbar />

      {/* Progress Bar */}
      <div className="bg-[var(--color-surface-container-low)] border-b border-[var(--color-outline-variant)]/30">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/perjalanan-belajar" className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div className="flex items-center gap-2 flex-1">
            {stages.map((s: Stage) => (
              <div key={s.id} className="flex-1 flex items-center gap-1">
                <div className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                  s.id < stageId ? 'bg-[var(--color-secondary)]'
                  : s.id === stageId ? 'bg-[var(--color-primary)]'
                  : 'bg-[var(--color-surface-container-high)]'
                }`} />
              </div>
            ))}
          </div>
          <span className="text-sm font-semibold text-[var(--color-on-surface-variant)]">
            {stageId} / {stages.length}
          </span>
        </div>
      </div>

      <main className="flex-grow flex flex-col md:flex-row relative p-3 md:p-6 gap-6 max-w-[1600px] mx-auto w-full">
        {/* Left Panel: Scientific Log */}
        <aside className="hidden xl:flex flex-col w-80 space-y-6 shrink-0">
          {/* Stage 2: UV Exposure Panel */}
          {stageId === 2 && (
            <div className="glass-panel p-6 rounded-xl shadow-sm border-l-4 border-[var(--color-tertiary)]">
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-[var(--color-tertiary)]">wb_sunny</span>
                <h2 className="font-[family-name:var(--font-plus-jakarta)] text-lg text-[var(--color-tertiary)] font-bold">UV Exposure</h2>
              </div>
              <p className="text-xs text-[var(--color-on-surface-variant)] mb-4">Increase sun intensity to simulate long-term UV degradation.</p>
              <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase font-bold tracking-wider mb-2">INTENSITY LEVEL</p>
              <input type="range" min="0" max="100" defaultValue="25" className="w-full h-2 bg-[var(--color-surface-container)] rounded-lg appearance-none cursor-pointer mb-2" />
              <div className="flex justify-between text-[10px] text-[var(--color-on-surface-variant)] mb-3">
                <span>Low</span><span>Mid</span><span>High</span>
              </div>
              <div className="mt-2 p-2 bg-[var(--color-primary-fixed)] text-[var(--color-on-primary-fixed)] rounded-lg text-xs text-center font-bold">
                Current: Mild Sunlight
              </div>
            </div>
          )}
          <div className="glass-panel p-6 rounded-xl shadow-sm flex flex-col h-full border-l-4 border-[var(--color-primary)]">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-[var(--color-primary)]">assignment</span>
              <h2 className="font-[family-name:var(--font-plus-jakarta)] text-lg text-[var(--color-primary)] font-bold">Scientific Log</h2>
            </div>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
              {stage.scientificFacts.map((fact: string, i: number) => (
                <div key={i} className="bg-[var(--color-surface-container-low)] p-3 rounded-lg border border-[var(--color-outline-variant)]/30">
                  <span className="text-[10px] font-bold text-[var(--color-primary)] block mb-1">LOG #{String(i + 1).padStart(4, '0')}</span>
                  <p className="text-xs leading-relaxed text-[var(--color-on-surface-variant)]">{fact}</p>
                </div>
              ))}
            </div>
            <div className="mt-auto pt-6">
              <div className="flex justify-between text-xs text-[var(--color-on-surface-variant)] mb-2">
                <span>Tahap {stageId} dari {stages.length}</span>
                <span>{Math.round((stageId / stages.length) * 100)}%</span>
              </div>
              <div className="w-full bg-[var(--color-surface-container)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[var(--color-primary)] h-full transition-all duration-500"
                  style={{ width: `${(stageId / stages.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Center: AR Viewport */}
        <section className="flex-grow relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-black group min-h-[400px]">
          {/* Simulated Background */}
          <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-[10s]">
            {stageConfig[stageId]?.bg ? (
              <img src={stageConfig[stageId].bg} alt={stage.title} className="w-full h-full object-cover brightness-75" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/40 via-[var(--color-secondary)]/20 to-[var(--color-primary-container)]/30" />
            )}
          </div>

          {/* Centered AR Object (stage-specific) */}
          {stageConfig[stageId]?.arObject && stageId !== 5 && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="relative w-56 h-56 md:w-80 md:h-80 hover:scale-105 transition-transform duration-300">
                <img
                  src={stageConfig[stageId].arObject}
                  alt={stageConfig[stageId].arObjectAlt ?? ''}
                  className="w-full h-full object-contain drop-shadow-2xl"
                />
                {/* AR bounding corners */}
                <div className="absolute inset-0 border-2 border-[var(--color-primary-container)] rounded-lg confidence-pulse">
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-[var(--color-primary-container)]" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-[var(--color-primary-container)]" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-[var(--color-primary-container)]" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-[var(--color-primary-container)]" />
                </div>
                {/* Stage 2: Wave Force button */}
                {stageId === 2 && (
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-[var(--color-on-secondary-container)] text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap animate-bounce text-xs font-bold">
                    <span className="material-symbols-outlined text-[14px]">waves</span>
                    Click to simulate Wave Force
                  </div>
                )}
                {/* Stage 4: Bio-Sensor label */}
                {stageId === 4 && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-primary-container)] text-white px-3 py-1 rounded-sm text-[10px] font-bold tracking-wider flex items-center gap-1 whitespace-nowrap">
                    <span className="material-symbols-outlined text-[12px]">biotech</span>
                    BIO-SENSOR ACTIVE — 72% PLASTIK
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stage 5: Food Chain Overlay */}
          {stageId === 5 && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-8 py-6 flex flex-col items-center gap-4">
                <p className="text-white/70 text-xs font-bold tracking-widest uppercase">Simulasi Rantai Makanan</p>
                <div className="flex items-center gap-4 md:gap-6">
                  {[
                    { label: 'Plankton', level: 'Level 1', color: 'border-[var(--color-primary-container)]', textColor: 'text-[var(--color-primary-fixed)]', size: 'w-16 h-16', imgSize: 'w-10 h-10', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5UObK2YhJFJMFwvay0b1KRuOkr9dSpjGzacZL1pYZ_mHiZKwvIV6guwWWHzmyRX5akMGW5Mm9-ZLOq2vjNjnHbNKiRm1EWVGt6ATse9Q3zDPaOVTGpCyYKeO-vnat7eNA7YvA66jipuRnsCsrfdIXvUI4sbAwAFhoe7lGw4yC6hxANRzioVZzUQ99tn_ZakVMgW14fA7GkaMfMgxiZSDemLsNt4L-5f7HQzr7ney_9PrrTZiZmKGnA9rDQszjNxj7iHLRUngSXA' },
                    { label: 'Ikan Kecil', level: 'Level 10', color: 'border-[var(--color-secondary-container)]', textColor: 'text-[var(--color-secondary-fixed)]', size: 'w-20 h-20', imgSize: 'w-14 h-14', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBufsFUHR_phG7ZQGH9-4oFqGt3NPBb-pXvO6MDNKUJdn3V5fsY1EtvlCd0ZRuumQQrBEFAGH-VYFQzzB4kv5_WtL5dNNCmD-fYKuTsty1cV88-P406E3y8zsS7qOLG2vry2VkOMPgwiEla5bI84sMvO4r0OQAYTYjh7D9DSISh3BUyX233auPHvWgjeEAG-qx4OIHPULS9Opmxms8HDQrjlMsNsm-Ww3ld0sZL7Tp4I1nn9UdcShsYQVdXPHwAqfzmpyFrni1o9g' },
                    { label: 'Ikan Besar', level: 'Level 100+', color: 'border-yellow-400', textColor: 'text-yellow-300', size: 'w-24 h-24', imgSize: 'w-16 h-16', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVL7WcT6M6yRScBkxCHtYUojFrJeSizg1bW7yKtTaL6xQ39z3vAGGoqTg7LundRF_J2nqlc-GOeOuVIMzrmD6O0UN3AiaNN-8Rjhx8o01THQkhJELhmagjn1uAengCxgLt06g9HbGLFQ5Qycegugs1cQd9QnUITYV3KfQ0q_Xn3ZaRn0Kn6q_9jGV10eClBtfEyyQwsCJBe_0dbM8xObk1bvh-tYSumTmVj7rR5JyWxuX8S7uv4sk6fbpLHKnJYu6a7tu3CI7ssg' },
                  ].map((org, i) => (
                    <div key={org.label} className="flex flex-col items-center gap-2">
                      {i > 0 && (
                        <span className="material-symbols-outlined text-white/60 text-xl absolute" style={{ marginLeft: '-36px' }}>arrow_forward</span>
                      )}
                      <div className={`${org.size} rounded-full bg-white/10 backdrop-blur-sm border-4 ${org.color} flex items-center justify-center overflow-hidden`}>
                        <img src={org.img} alt={org.label} className={`${org.imgSize} object-contain`} />
                      </div>
                      <span className="text-white text-xs font-bold text-center">{org.label}</span>
                      <span className={`text-[10px] font-bold ${org.textColor}`}>{org.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AR Scanline */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="ar-scanline" />
            {/* Bounding Box */}
            <div className="absolute top-1/4 left-1/3 w-1/3 h-1/2 border-2 border-[var(--color-primary-container)] rounded-lg confidence-pulse">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[var(--color-primary-container)] rounded-tl-sm" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[var(--color-primary-container)] rounded-tr-sm" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[var(--color-primary-container)] rounded-bl-sm" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[var(--color-primary-container)] rounded-br-sm" />
              <div className="absolute -top-8 left-0 bg-[var(--color-primary-container)] text-white px-3 py-1 rounded-sm text-[10px] font-bold tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">target</span>
                AR_DETECTION - 98% CONFIDENCE
              </div>
            </div>
            {/* HUD */}
            <div className="absolute bottom-6 left-6 text-white space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[12px] font-bold tracking-widest">LIVE AR FEED</span>
              </div>
              <div className="text-[10px] font-mono opacity-70">STAGE: {stageId.toString().padStart(2, '0')} — {stage.title.toUpperCase()}</div>
            </div>

            {/* Stage Info overlay */}
            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-lg text-white">
              <p className="text-[10px] font-bold opacity-70">MISI SAAT INI</p>
              <p className="text-sm font-bold">{stage.title}</p>
              <p className="text-[11px] opacity-80">+{stage.xpReward} XP</p>
            </div>
          </div>

          {/* Quiz Overlay */}
          {quizVisible && (
            <div className="absolute inset-0 z-40 bg-[var(--color-on-surface)]/30 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="bg-[var(--color-surface)] max-w-md w-full p-10 rounded-2xl shadow-2xl scale-110">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-[var(--color-tertiary-container)] rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[var(--color-on-tertiary-container)] text-3xl">psychology</span>
                  </div>
                </div>
                <h3 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-center mb-3 text-[var(--color-on-surface)]">
                  Pertanyaan Pemantik — Tahap {stageId}
                </h3>
                <div className="bg-[var(--color-primary-fixed)] border-l-4 border-[var(--color-primary)] rounded-lg p-4 mb-5">
                  <p className="text-sm text-[var(--color-on-primary-fixed)] leading-relaxed italic">
                    &ldquo;{stage.pemantik}&rdquo;
                  </p>
                </div>
                <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider text-center mb-2">Setelah dipikirkan, jawab pertanyaan ini:</p>
                <p className="text-base text-center text-[var(--color-on-surface-variant)] mb-6">
                  {stage.quiz.question}
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {stage.quiz.options.map((opt: any, idx: number) => (
                    <button
                      key={idx}
                      className={getOptionClass(idx)}
                      onClick={() => handleAnswer(idx)}
                      disabled={quizState === 'answered' || quizState === 'correct'}
                    >
                      <span>{opt.text}</span>
                      {selectedOption === idx && quizState === 'correct' && (
                        <span className="material-symbols-outlined text-[var(--color-secondary)]">check_circle</span>
                      )}
                      {selectedOption === idx && quizState === 'wrong' && (
                        <span className="material-symbols-outlined text-[var(--color-error)]">cancel</span>
                      )}
                    </button>
                  ))}
                </div>
                {quizState === 'correct' && (
                  <div className="mt-4 p-3 bg-[var(--color-secondary-container)]/40 rounded-lg text-sm text-[var(--color-on-secondary-fixed-variant)] text-center">
                    {stage.quiz.explanation}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Completion overlay */}
          {completed && (
            <div className="absolute inset-0 z-40 bg-[var(--color-secondary)]/20 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="bg-[var(--color-surface)] max-w-sm w-full p-8 rounded-2xl shadow-2xl text-center">
                <div className="w-20 h-20 bg-[var(--color-secondary-container)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-[var(--color-secondary)]" style={{ fontSize: '48px' }}>celebration</span>
                </div>
                <h3 className="font-[family-name:var(--font-plus-jakarta)] text-2xl font-bold text-[var(--color-on-surface)] mb-2">Tahap Selesai!</h3>
                <p className="text-[var(--color-on-surface-variant)] mb-2">{stage.quiz.explanation}</p>
                <div className="inline-flex items-center gap-2 bg-[var(--color-tertiary-fixed)] text-[var(--color-on-tertiary-fixed)] px-4 py-2 rounded-full font-bold mb-6">
                  <span className="material-symbols-outlined">star</span>
                  +{xpEarned} XP
                </div>
                <div className="flex gap-3 justify-center">
                  <Link
                    href="/perjalanan-belajar"
                    className="border-2 border-[var(--color-secondary)] text-[var(--color-secondary)] font-bold px-5 py-2 rounded-xl hover:bg-[var(--color-secondary-container)]/20 transition-all text-sm"
                  >
                    Peta Ekspedisi
                  </Link>
                  {nextStage && (
                    <Link
                      href={`/perjalanan-belajar/${nextStage.id}`}
                      className="bg-[var(--color-primary)] text-[var(--color-on-primary)] font-bold px-5 py-2 rounded-xl hover:bg-[var(--color-surface-tint)] transition-all text-sm flex items-center gap-1"
                    >
                      Tahap Berikutnya <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right Panel */}
        <aside className="flex flex-col w-full md:w-80 space-y-6 shrink-0">
          {/* Stage 2: Environmental Data */}
          {stageId === 2 && (
            <div className="glass-panel p-6 rounded-xl shadow-sm border-r-4 border-[var(--color-error)]">
              <h3 className="font-bold text-[var(--color-primary)] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">monitoring</span> Environmental Data
              </h3>
              <div className="space-y-3 mb-4">
                {[
                  { label: 'Surface Brittleness', val: '10%', trend: '↗', color: 'text-[var(--color-primary)]' },
                  { label: 'Structural Integrity', val: '90%', trend: '↘', color: 'text-[var(--color-error)]' },
                ].map(d => (
                  <div key={d.label} className="bg-[var(--color-surface-container-low)] p-3 rounded-lg">
                    <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1">{d.label}</p>
                    <p className={`text-2xl font-extrabold ${d.color}`}>{d.val} <span className="text-lg">{d.trend}</span></p>
                  </div>
                ))}
              </div>
              <button className="w-full bg-[var(--color-primary-container)] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md">
                <span className="material-symbols-outlined">storm</span>
                SIMULATE STORM SURGE
              </button>
              <p className="text-[10px] text-[var(--color-on-surface-variant)] text-center mt-2 italic">Force-multiplier: x2.5</p>
            </div>
          )}
          {/* Stage 4: Bio-Sensor Status */}
          {stageId === 4 && (
            <div className="glass-panel p-6 rounded-xl shadow-sm border-r-4 border-[var(--color-secondary)]">
              <h3 className="font-bold text-[var(--color-secondary)] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">biotech</span> Status Bio-Sensor
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Polietilen (PE)', val: 72, color: 'bg-[var(--color-error)]' },
                  { label: 'Polipropilen (PP)', val: 18, color: 'bg-orange-500' },
                  { label: 'PET', val: 10, color: 'bg-[var(--color-tertiary)]' },
                ].map(d => (
                  <div key={d.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold">{d.label}</span>
                      <span className="font-bold">{d.val}%</span>
                    </div>
                    <div className="w-full bg-[var(--color-surface-container)] h-2 rounded-full overflow-hidden">
                      <div className={`${d.color} h-full rounded-full`} style={{ width: `${d.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-2 bg-[var(--color-error-container)]/30 rounded-lg text-[10px] text-[var(--color-error)] font-bold text-center">
                Konsentrasi Tinggi Terdeteksi
              </div>
            </div>
          )}
          <div className="glass-panel p-6 rounded-xl shadow-sm border-r-4 border-[var(--color-secondary)]">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-[var(--color-secondary)]">biotech</span>
              <h2 className="font-[family-name:var(--font-plus-jakarta)] text-lg text-[var(--color-secondary)] font-bold">Info Tahap</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wide mb-1">Tahap</p>
                <p className="font-bold text-[var(--color-on-surface)]">{stageId} — {stage.title}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wide mb-1">Deskripsi</p>
                <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed">{stage.description}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wide mb-1">XP Reward</p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--color-tertiary)]">star</span>
                  <span className="font-bold text-[var(--color-tertiary)] text-lg">{stage.xpReward} XP</span>
                </div>
              </div>
            </div>
            <div className="mt-6 p-3 bg-[var(--color-secondary-container)]/20 rounded-lg border border-[var(--color-secondary)]/20">
              <div className="flex gap-2 items-start">
                <span className="material-symbols-outlined text-[var(--color-secondary)] text-sm">info</span>
                <p className="text-[11px] leading-tight text-[var(--color-on-secondary-fixed-variant)]">
                  Jawab pertanyaan dengan benar untuk menyelesaikan tahap ini dan mendapatkan XP.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="mt-auto grid grid-cols-2 gap-3">
            <button
              onClick={() => { setQuizState('idle'); setSelectedOption(null); setQuizVisible(true); setCompleted(false); }}
              className="flex flex-col items-center justify-center p-3 bg-[var(--color-surface-container-low)] hover:bg-[var(--color-surface-container)] transition-colors rounded-xl border border-[var(--color-outline-variant)]/30 active:scale-95 duration-150"
            >
              <span className="material-symbols-outlined text-[var(--color-on-surface-variant)]">refresh</span>
              <span className="text-[10px] mt-1 font-bold">ULANG QUIZ</span>
            </button>
            <button
              className="flex flex-col items-center justify-center p-3 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 transition-colors rounded-xl shadow-lg active:scale-95 duration-150"
              onClick={() => { /* Simulate AR scan */ setQuizVisible(true); }}
            >
              <span className="material-symbols-outlined">photo_camera</span>
              <span className="text-[10px] mt-1 font-bold">CAPTURE</span>
            </button>
          </div>

          {/* Stage Navigation */}
          <div className="flex gap-3">
            {prevStage ? (
              <Link
                href={`/perjalanan-belajar/${prevStage.id}`}
                className="flex-1 text-center py-2 border-2 border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] rounded-xl text-sm font-semibold hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all"
              >
                ← Tahap {prevStage.id}
              </Link>
            ) : <div className="flex-1" />}
            {nextStage && (
              <Link
                href={`/perjalanan-belajar/${nextStage.id}`}
                className="flex-1 text-center py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--color-surface-tint)] transition-all"
              >
                Tahap {nextStage.id} →
              </Link>
            )}
          </div>
        </aside>
      </main>

      <footer className="bg-[var(--color-surface-container-low)] py-4 mt-auto border-t border-[var(--color-outline-variant)]/30">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-6 max-w-[1200px] mx-auto">
          <span className="font-[family-name:var(--font-plus-jakarta)] text-lg text-[var(--color-on-surface)] font-bold">MicroJourney AR</span>
          <p className="text-sm text-[var(--color-on-surface-variant)]">© 2024 MicroJourney AR. Petualangan Ekosistem Digital.</p>
        </div>
      </footer>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJourneyStore } from '@/lib/journeyStore';
import { useAuthStore } from '@/lib/authStore';
import Stage2Weathering from '@/components/stages/Stage2Weathering';
import StageIntro from '@/components/stages/StageIntro';
import GuestLimitModal from '@/components/auth/GuestLimitModal';
import { AnimatePresence } from 'framer-motion';

type Phase = 'intro' | 'main';

export default function Tahap2() {
  const router = useRouter();
  const { completeStage } = useJourneyStore();
  const currentUser = useAuthStore(state => state.currentUser);
  
  const [phase, setPhase] = useState<Phase>('intro');
  const [videoUrl] = useState('https://www.youtube.com/embed/3D6tIkBV2RM');
  const [guestModalOpen, setGuestModalOpen] = useState(false);

  function handleComplete() {
    completeStage(2);
    if (!currentUser) {
      setGuestModalOpen(true);
    } else {
      router.push('/journey/tahap-3');
    }
  }

  return (
    <div className="w-full">
      <GuestLimitModal
        isOpen={guestModalOpen}
        onClose={() => router.push('/journey')}
        targetStageTitle="Tahap 3: Kontaminasi Pangan"
      />

      {/* Intro Phase (takes full screen with hero-bg) */}
      <AnimatePresence>
        {phase === 'intro' && (
          <div className="relative w-full overflow-hidden min-h-[540px] h-[100vh] max-h-[820px] -mt-14 md:-mt-[112px]">
            <StageIntro
              title="Pelapukan Plastik di Alam"
              description="Satu botol plastik butuh 450 tahun untuk terurai. Tapi sebelum itu, ia hancur menjadi jutaan partikel mikro yang mencemari laut. Ikuti simulasi interaktifnya!"
              icon="wb_sunny"
              layout="split"
              actionText="Mulai Simulasi"
              onStart={() => setPhase('main')}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Main Lab Phase (clean bg, no hero-bg) */}
      {phase === 'main' && (
        <div className="relative px-4 py-4 bg-[#f7f9fb] min-h-[calc(100vh-88px)]">
          <div className="max-w-6xl mx-auto mb-3 flex items-center justify-between">
            <button
              onClick={() => setPhase('intro')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#bec8d2] text-[#006591] font-bold text-xs hover:bg-[#e4f1f9] transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Kembali ke Pengantar Tahap 2</span>
            </button>
            <button
              onClick={() => router.push('/journey/tahap-1')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#3e4850] font-semibold text-xs transition-colors"
            >
              <span>← Tahap 1: AR Scanner</span>
            </button>
          </div>
          <Stage2Weathering
            onComplete={handleComplete}
            videoUrl={videoUrl}
          />
        </div>
      )}
    </div>
  );
}


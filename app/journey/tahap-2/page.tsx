'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJourneyStore } from '@/lib/journeyStore';
import { useAuthStore } from '@/lib/authStore';
import Stage2Weathering from '@/components/stages/Stage2Weathering';
import StageIntro from '@/components/stages/StageIntro';
import GuestLimitModal from '@/components/auth/GuestLimitModal';
import StageCompletionModal from '@/components/ui/StageCompletionModal';
import { AnimatePresence, motion } from 'framer-motion';

type Phase = 'intro' | 'main';

export default function Tahap2() {
  const router = useRouter();
  const { completeStage } = useJourneyStore();
  const currentUser = useAuthStore(state => state.currentUser);
  
  const [phase, setPhase] = useState<Phase>('intro');
  const [videoUrl] = useState('https://www.youtube.com/embed/3D6tIkBV2RM');
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  function handleComplete() {
    completeStage(2);
    if (!currentUser) {
      setGuestModalOpen(true);
    } else {
      setShowCompletionModal(true);
    }
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <GuestLimitModal
        isOpen={guestModalOpen}
        onClose={() => router.push('/journey')}
        targetStageTitle="Tahap 3: Kontaminasi Pangan"
      />

      {/* Intro Phase (takes full screen with hero-bg) */}
      <AnimatePresence>
        {phase === 'intro' && (
          <div className="relative w-full overflow-hidden min-h-screen h-[100vh] bg-[#083b54]">
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

      {/* Main Lab Phase (Vibrant Ocean Theme + Background Pattern) */}
      {phase === 'main' && (
        <div className="relative px-4 pt-28 md:pt-32 pb-16 min-h-screen bg-[linear-gradient(160deg,#083b54_0%,#006591_45%,#004c6e_100%)] overflow-x-hidden">
          
          {/* Ambient Glowing Blobs & Ocean Wave Pattern */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-100px] right-[-80px] w-96 h-96 rounded-full blur-3xl opacity-20 bg-[#6bff8f]" />
            <div className="absolute bottom-[-100px] left-[-60px] w-96 h-96 rounded-full blur-3xl opacity-20 bg-[#f0a345]" />
            
            {/* Animated Ocean Particles */}
            {Array.from({ length: 15 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 3 + (i % 4),
                  height: 3 + (i % 4),
                  background: ['#6bff8f66', '#f0a34566', '#ffffff33', '#c9e6ff55'][i % 4],
                  left: `${(i * 37 + 7) % 100}%`,
                  top: `${(i * 53 + 11) % 100}%`,
                }}
                animate={{ y: [0, -20, 0], opacity: [0.3, 0.9, 0.3] }}
                transition={{ duration: 3.5 + (i % 3), repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
              />
            ))}
          </div>

          <div className="relative z-10 max-w-5xl mx-auto mb-4 flex items-center justify-between">
            <button
              onClick={() => setPhase('intro')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md font-bold text-xs transition-all shadow-md active:scale-95"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Pengantar Tahap 2</span>
            </button>
            <button
              onClick={() => router.push('/journey/tahap-1')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-blue-100 hover:text-white border border-white/15 backdrop-blur-md font-semibold text-xs transition-all shadow-md active:scale-95"
            >
              <span>← Tahap 1: AR Scanner</span>
            </button>
          </div>

          <div className="relative z-10">
            <Stage2Weathering
              onComplete={handleComplete}
              videoUrl={videoUrl}
            />
          </div>
        </div>
      )}

      <StageCompletionModal
        isOpen={showCompletionModal}
        stageNumber={2}
        stageTitle="Proses Pelapukan Plastik"
        xpEarned={100}
        nextStagePath="/journey/tahap-3"
        onClose={() => setShowCompletionModal(false)}
      />
    </div>
  );
}


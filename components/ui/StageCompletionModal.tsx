'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MikaMascot from '@/components/MikaMascot';

interface StageCompletionModalProps {
  isOpen: boolean;
  stageNumber: number;
  stageTitle: string;
  xpEarned?: number;
  nextStagePath: string;
  nextStageLabel?: string;
  onClose?: () => void;
}

export default function StageCompletionModal({
  isOpen,
  stageNumber,
  stageTitle,
  xpEarned = 100,
  nextStagePath,
  nextStageLabel,
  onClose,
}: StageCompletionModalProps) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const notes = [523.25, 659.25, 783.99, 1046.50];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
            gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.12);
            osc.stop(ctx.currentTime + idx * 0.12 + 0.3);
          });
        }
      } catch {
        // Audio fallback
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const defaultNextLabel = stageNumber < 6 ? `Lanjut ke Tahap ${stageNumber + 1}` : 'Lihat Rangkuman Ekspedisi';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Background Animated Celebration Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-[radial-gradient(circle,_#6bff8f_0%,_#006591_40%,_transparent_70%)] opacity-30 blur-3xl animate-pulse" />
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-[#f0a345]/20 rounded-full blur-2xl animate-bounce" />
      </div>

      {/* Floating Confetti Elements */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {['🥳', '🎉', '⭐', '🌟', '🏆', '🌊', '🧬', '✨', '🎈', '🎉'].map((emoji, i) => (
            <div
              key={i}
              className="absolute text-xl sm:text-2xl animate-float-particle"
              style={{
                top: `${(i * 18) % 85}%`,
                left: `${(i * 19) % 90}%`,
                animationDelay: `${(i % 4) * 0.3}s`,
                animationDuration: `${3.5 + (i % 3)}s`,
              }}
            >
              {emoji}
            </div>
          ))}
        </div>
      )}

      {/* Main Modal Card */}
      <div className="bg-gradient-to-b from-[#083b54] via-[#006591] to-[#004c6e] border-2 border-[#6bff8f]/60 rounded-3xl p-4 sm:p-7 max-w-sm sm:max-w-md w-full text-center text-white relative z-20 shadow-[0_0_50px_rgba(107,255,143,0.35)] my-auto max-h-screen overflow-y-auto scrollbar-hide">
        
        {/* Top Celebration Badge */}
        <div className="inline-flex items-center gap-1.5 bg-[#6bff8f]/20 border border-[#6bff8f]/60 text-[#6bff8f] px-3.5 py-1 rounded-full text-xs font-extrabold font-[family-name:var(--font-mono)] uppercase tracking-wider mb-4 shadow-md">
          <span className="material-symbols-outlined text-base animate-spin">auto_awesome</span>
          <span>HOREEE! TAHAP {stageNumber} TUNTAS! 🎉</span>
        </div>

        <div className="flex justify-center mb-2 sm:mb-4">
          <MikaMascot
            size={70}
            bubbleSide="top"
            pop
            message={`Horeee! Kamu berhasil menuntaskan Tahap ${stageNumber}!`}
          />
        </div>

        {/* Title */}
        <h2 className="font-[family-name:var(--font-outfit)] text-lg sm:text-2xl font-extrabold text-white mb-1.5 leading-snug mt-2">
          Tahap {stageNumber}: {stageTitle}
        </h2>

        <p className="text-white/80 text-[11px] sm:text-sm mb-4 leading-relaxed">
          Kamu telah menunjukkan pemahaman sains yang luar biasa. Mari lanjutkan ekspedisimu! 🌊✨
        </p>

        {/* Status Badge Banner */}
        <div className="bg-black/30 border border-white/20 rounded-2xl p-2 sm:p-3 mb-4 text-center">
          <div className="bg-[#006e2f]/40 border border-[#6bff8f]/40 rounded-xl p-2 flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-base sm:text-lg text-[#6bff8f]">task_alt</span>
            <span className="font-extrabold text-[10px] sm:text-sm text-[#6bff8f] font-[family-name:var(--font-mono)] uppercase tracking-wider">
              Status: Tahap {stageNumber} Tuntas 100%
            </span>
          </div>
        </div>

        {/* 3D Wooden CTA Button */}
        <button
          onClick={() => {
            if (onClose) onClose();
            router.push(nextStagePath);
          }}
          className="w-full bg-[linear-gradient(180deg,#f0a345_0%,#d27b22_100%)] hover:brightness-110 text-[#3b2313] font-extrabold py-3 sm:py-4 rounded-2xl text-sm sm:text-base transition-all flex items-center justify-center gap-2.5 shadow-[0_4px_0_#9a5310,0_8px_15px_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-[0_2px_0_#9a5310] cursor-pointer"
        >
          <span>{nextStageLabel || defaultNextLabel}</span>
          <span className="material-symbols-outlined text-lg sm:text-xl">arrow_forward</span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatParticle {
          0% { transform: translateY(0px) rotate(0deg); opacity: 1; }
          50% { transform: translateY(-25px) rotate(180deg); opacity: 0.8; }
          100% { transform: translateY(-50px) rotate(360deg); opacity: 0; }
        }
        .animate-float-particle {
          animation: floatParticle infinite ease-in-out;
        }
      ` }} />
    </div>
  );
}

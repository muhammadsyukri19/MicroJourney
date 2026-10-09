'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useJourneyStore } from '@/lib/journeyStore';
import StageIntro from '@/components/stages/StageIntro';
import StageCompletionModal from '@/components/ui/StageCompletionModal';
import { AnimatePresence } from 'framer-motion';

type Phase = 'init' | 'scanning' | 'detected' | 'pemantik';

// Kelas objek yang mencakup botol, gelas, wadah, tempat makan, dan pembungkus plastik
const PLASTIC_CLASSES = [
  'bottle', 'cup', 'wine glass', 'bowl', 'vase', 'dining table',
  'cell phone', 'remote', 'mouse', 'handbag', 'backpack', 'refrigerator'
];

const MIN_DRAW_SCORE = 0.20;
const MANUAL_FALLBACK_DELAY = 12000;

export default function Tahap1() {
  const router = useRouter();
  const { completeStage } = useJourneyStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const activeRef = useRef(true);

  const [phase, setPhase] = useState<Phase>('init');
  const [confidence, setConfidence] = useState(0);
  const [detectedClass, setDetectedClass] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [customModelLoaded, setCustomModelLoaded] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [scanHint, setScanHint] = useState('Arahkan kamera ke botol atau wadah plastik');
  const [lockProgress, setLockProgress] = useState(0);

  const lockProgressRef = useRef(0);

  const playScanPing = useCallback((type: 'lock' | 'beep') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1040, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // Audio context ignore error
    }
  }, []);

  const stopCamera = useCallback(() => {
    activeRef.current = false;
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  async function startCamera() {
    setCameraError(null);
    setModelLoading(true);
    setShowManualFallback(false);
    setScanHint('Menyiapkan sensor kamera...');
    setLockProgress(0);
    lockProgressRef.current = 0;
    activeRef.current = true;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera. Pastikan Anda menggunakan HTTPS atau localhost di Chrome/Edge terbaru.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setPhase('scanning');
      setScanHint('Memuat model AI pendeteksi sampah plastik...');

      const fallbackTimer = window.setTimeout(() => {
        if (activeRef.current) setShowManualFallback(true);
      }, MANUAL_FALLBACK_DELAY);

      // Load TensorFlow & COCO-SSD (dengan opsi custom Teachable Machine)
      const [tf, cocoSsd] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/coco-ssd')
      ]);
      await tf.ready();

      let customModel: any = null;
      try {
        // Cek jika ada custom model lokal Teachable Machine di /models/plastic/model.json
        const response = await fetch('/models/plastic/model.json', { method: 'HEAD' });
        if (response.ok) {
          customModel = await tf.loadLayersModel('/models/plastic/model.json');
          setCustomModelLoaded(true);
        }
      } catch {
        // Custom model belum tersedia, gunakan COCO-SSD yang ditingkatkan
      }

      const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      setModelLoading(false);
      setScanHint('Dekatkan botol/gelas plastik ke tengah sasaran kamera...');

      async function detect() {
        if (!activeRef.current || !videoRef.current || !overlayRef.current) return;
        const video = videoRef.current;
        const canvas = overlayRef.current;
        const ctx = canvas.getContext('2d')!;

        if (video.readyState < 2) {
          animRef.current = requestAnimationFrame(detect);
          return;
        }

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const preds = await model.detect(video, 8, 0.15);
        const bestPrediction = [...preds].sort((a, b) => b.score - a.score)[0];

        // Cari prediktor plastik atau sejenisnya
        const plastic = preds
          .filter(p => PLASTIC_CLASSES.includes(p.class.toLowerCase()) && p.score >= MIN_DRAW_SCORE)
          .sort((a, b) => b.score - a.score)[0];

        if (plastic && activeRef.current) {
          const [x, y, w, h] = plastic.bbox;
          const conf = Math.round(plastic.score * 100);
          setConfidence(conf);
          const mappedName = plastic.class === 'bottle' ? 'Botol Plastik (PET)' : plastic.class === 'cup' ? 'Gelas Plastik (PP)' : 'Kemasan Plastik';
          setDetectedClass(mappedName);

          // Akumulasi lock progress (mengisi +8% per frame saat objek terdeteksi)
          lockProgressRef.current = Math.min(100, lockProgressRef.current + 8);
          setLockProgress(lockProgressRef.current);

          if (lockProgressRef.current % 30 === 0) {
            playScanPing('beep');
          }

          const isLocked = lockProgressRef.current >= 100;
          const color = isLocked ? '#6bff8f' : '#f0a345';

          // Box Deteksi Bergaya AR
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          const radius = 16;
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + w - radius, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
          ctx.lineTo(x + w, y + h - radius);
          ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
          ctx.lineTo(x + radius, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
          ctx.stroke();

          // Label Bubble
          ctx.fillStyle = isLocked ? 'rgba(0,110,47,0.92)' : 'rgba(210,123,34,0.92)';
          ctx.beginPath();
          ctx.roundRect(x + (w / 2) - 90, y - 42, 180, 32, 16);
          ctx.fill();

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 13px var(--font-outfit), sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${mappedName.toUpperCase()} · ${conf}%`, x + (w / 2), y - 21);
          ctx.textAlign = 'left';

          setScanHint(isLocked
            ? '✓ OBJEK TERKUNCI! Menyiapkan Pertanyaan Pemantik...'
            : `Mendeteksi ${mappedName} (${lockProgressRef.current}%)... Tahan posisi kamera.`);

          if (isLocked && activeRef.current) {
            clearTimeout(fallbackTimer);
            playScanPing('lock');
            stopCamera();
            setPhase('detected');
            setTimeout(() => setPhase('pemantik'), 600);
            return;
          }
        } else {
          // Pengurangan lock progress perlahan jika hilang dari layar
          if (lockProgressRef.current > 0) {
            lockProgressRef.current = Math.max(0, lockProgressRef.current - 4);
            setLockProgress(lockProgressRef.current);
          }
          setConfidence(0);
          setDetectedClass('');
          setScanHint(bestPrediction
            ? `AI melihat "${bestPrediction.class}" (${Math.round(bestPrediction.score * 100)}%). Arahkan ke botol/gelas plastik.`
            : 'Belum ada objek terbaca. Pastikan objek terlihat jelas di bawah cahaya.');
        }

        animRef.current = requestAnimationFrame(detect);
      }
      detect();
    } catch (err: unknown) {
      setCameraError(err instanceof Error ? err.message : 'Akses kamera ditolak');
      setModelLoading(false);
      setShowManualFallback(true);
    }
  }

  const [showCompletionModal, setShowCompletionModal] = useState(false);

  function proceed() {
    completeStage(1);
    setShowCompletionModal(true);
  }

  return (
    <div className="relative w-full overflow-hidden min-h-screen h-[100vh] bg-[#083b54]">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
      <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      {phase === 'scanning' && <div className="ar-scanline" />}

      {/* Init Phase with StageIntro */}
      <AnimatePresence>
        {phase === 'init' && !cameraError && (
          <StageIntro
            title="Tahap 1: AR Scanner Plastik"
            description="Arahkan kamera ke botol atau gelas plastik di sekitarmu. AI akan mendeteksi jenis polimer dan potensinya menjadi mikroplastik."
            icon="qr_code_scanner"
            layout="centered"
            actionText="Aktifkan Kamera AI"
            onStart={startCamera}
          />
        )}
      </AnimatePresence>

      {/* Error Access */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f7f9fb] gap-5 p-8 z-20">
          <span className="material-symbols-outlined text-[#ba1a1a] text-6xl">no_photography</span>
          <p className="text-[#3e4850] text-center text-sm leading-relaxed max-w-md font-semibold">{cameraError}</p>
          <div className="flex gap-3">
            <button onClick={startCamera} className="bg-[#006591] text-white font-bold px-6 py-3 rounded-xl">Coba Lagi</button>
            <button onClick={() => setPhase('pemantik')} className="bg-[#f0a345] text-[#3b2313] font-bold px-6 py-3 rounded-xl">Lanjut Manual</button>
          </div>
        </div>
      )}

      {/* Scanning HUD */}
      {phase === 'scanning' && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Target Reticle Brackets */}
          {[
            ['top-8 left-8', 'border-t-4 border-l-4 rounded-tl-3xl'],
            ['top-8 right-8', 'border-t-4 border-r-4 rounded-tr-3xl'],
            ['bottom-8 left-8', 'border-b-4 border-l-4 rounded-bl-3xl'],
            ['bottom-8 right-8', 'border-b-4 border-r-4 rounded-br-3xl']
          ].map(([pos, cls]) => (
            <div key={pos} className={`absolute ${pos} w-16 h-16 ${cls} border-[#6bff8f] opacity-80 shadow-[0_0_15px_rgba(107,255,143,0.5)]`} />
          ))}

          {/* Top Status Badge */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#083b54]/80 backdrop-blur-md px-6 py-2.5 rounded-full border-2 border-[#6bff8f]/30 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6bff8f] animate-ping" />
            <p className="text-[#6bff8f] text-xs font-[family-name:var(--font-outfit)] font-extrabold tracking-wider">
              {modelLoading ? 'MEMUAT MODEL AI...' : customModelLoaded ? 'MODEL KHUSUS PLASTIK AKTIF ✓' : lockProgress > 0 ? `MENILAI OBJEK PLASTIK (${lockProgress}%)` : 'SCANNER MENCARI PLASTIK'}
            </p>
          </div>

          {/* Center Target Circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-dashed border-[#6bff8f]/40 rounded-full flex items-center justify-center pointer-events-none">
            <div className="w-4 h-4 border-t-2 border-l-2 border-[#6bff8f]" />
          </div>

          {/* Lock Progress Indicator Bar */}
          {lockProgress > 0 && (
            <div className="absolute bottom-36 left-1/2 -translate-x-1/2 w-72 bg-[#083b54]/90 backdrop-blur-md border border-[#6bff8f]/40 p-3 rounded-2xl shadow-lg">
              <div className="flex justify-between text-xs text-[#6bff8f] font-bold mb-1.5 font-[family-name:var(--font-outfit)] uppercase">
                <span>{detectedClass || 'Objek Plastik'}</span>
                <span>{lockProgress}%</span>
              </div>
              <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#f0a345] to-[#6bff8f] transition-all duration-150 rounded-full"
                  style={{ width: `${lockProgress}%` }}
                />
              </div>
              <p className="text-center text-white/70 text-[10px] mt-1.5 font-semibold">
                Tahan posisi kamera 1 detik lagi untuk mengunci...
              </p>
            </div>
          )}

          {/* Bottom Scan Hint Box */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[min(90vw,440px)] text-center">
            <p className="bg-[#f0a345] bg-opacity-95 backdrop-blur-md border-2 border-[#8e4912] rounded-[24px] px-5 py-3.5 text-[#3b2313] text-sm font-bold shadow-[0_8px_16px_rgba(0,0,0,0.3)] font-[family-name:var(--font-inter)]">
              {scanHint}
            </p>
          </div>

          {showManualFallback && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto text-center">
              <button
                onClick={() => { stopCamera(); setPhase('pemantik'); }}
                className="text-white/80 hover:text-white text-xs underline font-semibold bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-sm"
              >
                Gagal Scan? Klik di sini untuk simulasi manual
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pemantik modal */}
      {phase === 'pemantik' && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white border-2 border-[#e4f1f9] rounded-3xl max-w-md w-full p-8 shadow-2xl">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 bg-[#6bff8f]/20 border border-[#006e2f]/30 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[#006e2f] text-3xl">check_circle</span>
              </div>
            </div>
            <p className="text-xs font-[family-name:var(--font-mono)] text-[#006e2f] font-extrabold uppercase tracking-widest text-center mb-1">
              Sampah Plastik Terdeteksi ✓
            </p>
            <p className="text-center text-[#6e7881] text-xs mb-5 font-[family-name:var(--font-mono)] font-bold">Jenis: Polietilena Tereftalat (PET) · Usia Penguraian: 450 Tahun</p>

            <h3 className="font-[family-name:var(--font-outfit)] text-xl font-bold text-center mb-4 text-[#083b54]">Pertanyaan Pemantik</h3>

            <div className="bg-[#f2f4f6] border-l-4 border-[#006591] rounded-xl p-5 mb-5">
              <p className="text-[#3e4850] text-sm leading-relaxed italic font-medium">
                &ldquo;Bagaimana mungkin benda padat sintetis ini bisa menembus dan menetap di dalam usus manusia — padahal tubuh kita dirancang untuk mencerna makanan?&rdquo;
              </p>
            </div>

            <p className="text-[#6e7881] text-xs text-center mb-6">Pikirkan jawabannya. Mulai investigasi untuk membuktikannya di Tahap 2.</p>

            <div className="flex flex-col gap-2.5">
              <button onClick={proceed}
                className="w-full bg-[#006591] hover:bg-[#004c6e] text-white font-bold py-4 rounded-xl text-lg transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-[#006591]/30 font-[family-name:var(--font-outfit)]">
                Mulai Investigasi <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              <button onClick={() => { startCamera(); setPhase('scanning'); }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-[#006591] font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 font-[family-name:var(--font-outfit)]">
                <span className="material-symbols-outlined text-base">refresh</span> Scan Ulang Objek
              </button>
            </div>
          </div>
        </div>
      )}

      <StageCompletionModal
        isOpen={showCompletionModal}
        stageNumber={1}
        stageTitle="AR Scanner Kode Plastik"
        xpEarned={100}
        nextStagePath="/journey/tahap-2"
        onClose={() => setShowCompletionModal(false)}
      />
    </div>
  );
}


'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useJourneyStore } from '@/lib/journeyStore';
import StageIntro from '@/components/stages/StageIntro';
import StageCompletionModal from '@/components/ui/StageCompletionModal';
import { AnimatePresence } from 'framer-motion';

type Phase = 'init' | 'scanning' | 'detected' | 'pemantik';

export interface PlasticInfo {
  name: string;
  polymer: string;
  code: string;
  decompositionTime: string;
  example: string;
  description: string;
}

export const PLASTIC_DATA: Record<string, PlasticInfo> = {
  bottle: {
    name: 'Botol Plastik',
    polymer: 'Polietilena Tereftalat (PET / PETE)',
    code: 'KODE 1 · PET',
    decompositionTime: '450 Tahun',
    example: 'Botol air mineral, botol minuman kemasan, botol minyak',
    description: 'Mudah mengalami fotooksidasi akibat paparan sinar UV matahari, memicu pelepasan serat dan serpihan mikroplastik halus.'
  },
  cup: {
    name: 'Gelas / Cup Plastik',
    polymer: 'Polipropilena (PP) / Polistirena (PS)',
    code: 'KODE 5 (PP) / KODE 6 (PS)',
    decompositionTime: '20 – 450 Tahun',
    example: 'Cup minuman boba/kopi, gelas air mineral sekali pakai',
    description: 'Struktur tipis yang mudah getas saat terjemur, cepat terfragmentasi akibat benturan mekanik air menjadi mikropartikel.'
  },
  bowl: {
    name: 'Mangkuk / Wadah Plastik',
    polymer: 'Polipropilena (PP) / HDPE',
    code: 'KODE 5 (PP) / KODE 2 (HDPE)',
    decompositionTime: '100 – 450 Tahun',
    example: 'Mangkuk mie instan, wadah thinwall takeaway, kotak bekal',
    description: 'Sering terpapar suhu tinggi dan asam lemak yang mempercepat degradasi mikro dan leaching zat aditif pemlastis.'
  },
  'wine glass': {
    name: 'Gelas Mika / Wadah Bening',
    polymer: 'Polikarbonat (PC) / Akrilik (PMMA)',
    code: 'KODE 7 · LAINNYA (OTHER)',
    decompositionTime: '400 – 500 Tahun',
    example: 'Gelas mika bening, botol tumbler keras, toples tebal',
    description: 'Plastik kaku keras non-biodegradable yang sangat lambat terurai dan berisiko melepaskan zat bisfenol ke air.'
  },
  vase: {
    name: 'Wadah / Botol Plastik Keras',
    polymer: 'Polivinil Klorida (PVC) / Polietilena',
    code: 'KODE 3 (PVC) / KODE 7',
    decompositionTime: '500 Tahun',
    example: 'Wadah silinder tebal, botol bahan kimia, vas sintetis',
    description: 'Mengandung klorin dan plasticizer (phthalates) yang sangat persisten dan beracun bagi biota perairan.'
  },
};

export function getPlasticInfo(className: string): PlasticInfo {
  const key = className.toLowerCase().trim();
  if (PLASTIC_DATA[key]) {
    return PLASTIC_DATA[key];
  }
  return {
    name: 'Sampah Plastik Kemasan',
    polymer: 'Polimer Campuran Sintetis (Multilayer)',
    code: 'KODE 7 · CAMPURAN',
    decompositionTime: '200 – 450 Tahun',
    example: 'Kemasan sachet makanan ringan, kemasan plastik berlapis',
    description: 'Tersusun dari lapisan polimer berbeda yang sangat sulit didaur ulang dan rentan terburai menjadi mikroplastik di alam.'
  };
}

// HANYA kelas wadah/kemasan plastik relevan pembelajaran mikroplastik (BUKAN rokok, hp, remote, atau kulkas)
const VALID_PLASTIC_CLASSES = ['bottle', 'cup', 'bowl', 'wine glass', 'vase'];

// Ambang batas akurasi minimal (menolak deteksi ngawur seperti rokok 20% atau bungkus rokok 31%)
const MIN_CONFIDENCE = 0.38;

export default function Tahap1() {
  const { completeStage, lkpdAnswers, setLkpdAnswer } = useJourneyStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const activeRef = useRef(true);

  const [phase, setPhase] = useState<Phase>('init');
  const [detectedClass, setDetectedClass] = useState('');
  const [detectedPlasticInfo, setDetectedPlasticInfo] = useState<PlasticInfo>(PLASTIC_DATA.bottle);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [customModelLoaded, setCustomModelLoaded] = useState(false);
  const [scanHint, setScanHint] = useState('Arahkan botol atau gelas plastik ke tengah lingkaran sasaran');
  const [lockProgress, setLockProgress] = useState(0);
  const [isCenterActive, setIsCenterActive] = useState(false);

  const lockProgressRef = useRef(0);

  const playScanPing = useCallback((type: 'lock' | 'beep') => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
    setScanHint('Menyiapkan sensor kamera...');
    setLockProgress(0);
    lockProgressRef.current = 0;
    activeRef.current = true;
    setIsCenterActive(false);

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

      // Load TensorFlow & COCO-SSD (dengan opsi custom Teachable Machine)
      const [tf, cocoSsd] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/coco-ssd')
      ]);
      await tf.ready();

      try {
        const response = await fetch('/models/plastic/model.json', { method: 'HEAD' });
        if (response.ok) {
          await tf.loadLayersModel('/models/plastic/model.json');
          setCustomModelLoaded(true);
        }
      } catch {
        // Custom model belum tersedia, gunakan COCO-SSD
      }

      const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      setModelLoading(false);
      setScanHint('Posisikan botol plastik atau gelas cup ke tengah lingkaran sasaran...');

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

        const preds = await model.detect(video, 8, 0.20);
        const bestPrediction = [...preds].sort((a, b) => b.score - a.score)[0];

        // Cari prediktor plastik target (botol, cup, mangkok) dengan akurasi memadai
        const plastic = preds
          .filter(p => VALID_PLASTIC_CLASSES.includes(p.class.toLowerCase()) && p.score >= MIN_CONFIDENCE)
          .sort((a, b) => b.score - a.score)[0];

        if (plastic && activeRef.current) {
          const [x, y, w, h] = plastic.bbox;
          const conf = Math.round(plastic.score * 100);
          const info = getPlasticInfo(plastic.class);

          // Hitung pusat objek vs pusat frame video (Lingkaran Reticle Tengah)
          const boxCenterX = x + w / 2;
          const boxCenterY = y + h / 2;
          const videoCenterX = (video.videoWidth || 640) / 2;
          const videoCenterY = (video.videoHeight || 480) / 2;

          // Toleransi tengah (area lingkaran reticle)
          const maxDistX = (video.videoWidth || 640) * 0.28;
          const maxDistY = (video.videoHeight || 480) * 0.28;
          const isInCenter = Math.abs(boxCenterX - videoCenterX) <= maxDistX &&
                             Math.abs(boxCenterY - videoCenterY) <= maxDistY;

          setDetectedPlasticInfo(info);
          setDetectedClass(info.name);
          setIsCenterActive(isInCenter);

          if (isInCenter) {
            // Objek di tengah lingkaran sasaran -> Akumulasi progress penguncian
            lockProgressRef.current = Math.min(100, lockProgressRef.current + 10);
            setLockProgress(lockProgressRef.current);

            if (lockProgressRef.current % 30 === 0) {
              playScanPing('beep');
            }

            const isLocked = lockProgressRef.current >= 100;
            const color = isLocked ? '#6bff8f' : '#6bff8f';

            // Gambar Bounding Box Hijau AR di Tengah
            ctx.setLineDash([]);
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
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

            // Label Bubble Hijau Solid
            ctx.fillStyle = isLocked ? 'rgba(0,110,47,0.95)' : 'rgba(8,59,84,0.92)';
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(x + (w / 2) - 110, y - 44, 220, 34, 16);
            } else {
              ctx.rect(x + (w / 2) - 110, y - 44, 220, 34);
            }
            ctx.fill();

            ctx.fillStyle = '#6bff8f';
            ctx.font = 'bold 12px var(--font-outfit), sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`✓ ${info.name.toUpperCase()} · ${conf}%`, x + (w / 2), y - 22);
            ctx.textAlign = 'left';

            setScanHint(isLocked
              ? `✓ ${info.name.toUpperCase()} TERKUNCI! Menyiapkan Lembar Investigasi...`
              : `Menilai ${info.name} di tengah sasaran (${lockProgressRef.current}%)...`);

            if (isLocked && activeRef.current) {
              playScanPing('lock');
              setPhase('detected');
              // Tahan selama 2 detik sebelum membuka lembar modal pemantik
              setTimeout(() => {
                stopCamera();
                setPhase('pemantik');
              }, 2000);
              return;
            }
          } else {
            // Objek terdeteksi tetapi BELUM berada di tengah lingkaran
            if (lockProgressRef.current > 0) {
              lockProgressRef.current = Math.max(0, lockProgressRef.current - 4);
              setLockProgress(lockProgressRef.current);
            }

            // Gambar Bounding Box Garis Putus-putus Kuning (Perintah Geser ke Tengah)
            ctx.setLineDash([8, 6]);
            ctx.strokeStyle = '#f0a345';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);

            // Label Perintah Geser
            ctx.fillStyle = 'rgba(210,123,34,0.92)';
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(x + (w / 2) - 120, y - 44, 240, 34, 16);
            } else {
              ctx.rect(x + (w / 2) - 120, y - 44, 240, 34);
            }
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px var(--font-outfit), sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${info.name.toUpperCase()} · GESER KE TENGAH ⊙`, x + (w / 2), y - 22);
            ctx.textAlign = 'left';

            setScanHint(`Posisikan ${info.name.toLowerCase()} ke dalam lingkaran hijau tengah sasaran...`);
          }
        } else {
          // Tidak ada objek plastik target di layar
          setIsCenterActive(false);
          if (lockProgressRef.current > 0) {
            lockProgressRef.current = Math.max(0, lockProgressRef.current - 5);
            setLockProgress(lockProgressRef.current);
          }
          setDetectedClass('');

          if (bestPrediction) {
            const cls = bestPrediction.class.toLowerCase();
            if (cls === 'remote' || cls === 'cell phone' || cls === 'toothbrush') {
              setScanHint(`AI melihat "${cls}". Objek ini bukan botol/gelas plastik. Gunakan botol plastik atau cup minuman.`);
            } else {
              setScanHint(`AI melihat "${bestPrediction.class}" (${Math.round(bestPrediction.score * 100)}%). Arahkan botol atau gelas plastik ke tengah.`);
            }
          } else {
            setScanHint('Arahkan botol plastik, gelas cup, atau wadah makanan ke tengah lingkaran...');
          }
        }

        if (activeRef.current) {
          animRef.current = requestAnimationFrame(detect);
        }
      }
      detect();
    } catch (err: unknown) {
      setCameraError(err instanceof Error ? err.message : 'Akses kamera ditolak');
      setModelLoading(false);
    }
  }

  const [showCompletionModal, setShowCompletionModal] = useState(false);

  function proceed() {
    completeStage(1);
    setShowCompletionModal(true);
  }

  function selectSimulatedSample(sample: PlasticInfo) {
    stopCamera();
    setDetectedPlasticInfo(sample);
    setPhase('pemantik');
  }

  return (
    <div className="relative w-full overflow-hidden min-h-screen h-[100vh] bg-[#083b54]">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
      <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      {(phase === 'scanning' || phase === 'detected') && <div className="ar-scanline" />}

      {/* Init Phase with StageIntro */}
      <AnimatePresence>
        {phase === 'init' && !cameraError && (
          <StageIntro
            title="Tahap 1: AR Scanner Plastik"
            description="Arahkan kamera ke sampah plastik di sekitarmu (seperti botol plastik, gelas cup, atau wadah makanan). AI akan mendeteksi jenis polimer dan potensinya menjadi mikroplastik."
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
            <button onClick={() => selectSimulatedSample(PLASTIC_DATA.bottle)} className="bg-[#f0a345] text-[#3b2313] font-bold px-6 py-3 rounded-xl">Lanjut Manual</button>
          </div>
        </div>
      )}

      {/* Scanning HUD */}
      {(phase === 'scanning' || phase === 'detected') && (
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

          {/* Top Status Badge - diposisikan di top-28 sm:top-32 agar tidak tertutup header kayu layout */}
          <div className="absolute top-28 sm:top-32 left-1/2 -translate-x-1/2 bg-[#083b54]/85 backdrop-blur-md px-6 py-2.5 rounded-full border-2 border-[#6bff8f]/30 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex items-center gap-2 z-20 transition-all">
            <span className={`w-2.5 h-2.5 rounded-full ${phase === 'detected' || isCenterActive ? 'bg-[#6bff8f] animate-ping' : 'bg-[#f0a345]'}`} />
            <p className="text-[#6bff8f] text-xs font-[family-name:var(--font-outfit)] font-extrabold tracking-wider">
              {phase === 'detected'
                ? `✓ ${detectedPlasticInfo.name.toUpperCase()} TERKUNCI (100%)`
                : modelLoading
                ? 'MEMUAT MODEL AI...'
                : customModelLoaded
                ? 'MODEL KHUSUS PLASTIK AKTIF ✓'
                : lockProgress > 0
                ? `MENGUNCI ${detectedClass ? detectedClass.toUpperCase() : 'OBJEK'} (${lockProgress}%)`
                : isCenterActive
                ? 'OBJEK DI TENGAH SASARAN ⊙'
                : 'POSISIKAN PLASTIK KE TENGAH LINGKARAN'}
            </p>
          </div>

          {/* Center Target Circle (Lingkaran Deteksi Tengah) */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 transition-all duration-300 rounded-full flex items-center justify-center pointer-events-none ${
              phase === 'detected'
                ? 'border-[#6bff8f] bg-[#6bff8f]/20 shadow-[0_0_40px_rgba(107,255,143,0.7)] scale-105'
                : isCenterActive
                ? 'border-[#6bff8f] border-solid bg-[#6bff8f]/10 shadow-[0_0_25px_rgba(107,255,143,0.4)] scale-102'
                : 'border-[#6bff8f]/40 border-dashed'
            }`}
          >
            <div className={`w-4 h-4 border-t-2 border-l-2 transition-colors ${isCenterActive ? 'border-[#6bff8f]' : 'border-[#6bff8f]/60'}`} />
          </div>

          {/* Lock Progress Indicator Bar */}
          {lockProgress > 0 && (
            <div className="absolute bottom-36 left-1/2 -translate-x-1/2 w-72 bg-[#083b54]/95 backdrop-blur-md border border-[#6bff8f]/40 p-3 rounded-2xl shadow-lg z-20">
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
                {phase === 'detected' ? `✓ ${detectedPlasticInfo.name} terkunci! Membuka investigasi...` : 'Tahan di tengah lingkaran untuk mengunci...'}
              </p>
            </div>
          )}

          {/* Bottom Scan Hint Box */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[min(90vw,460px)] text-center z-20">
            <p className="bg-[#f0a345] bg-opacity-95 backdrop-blur-md border-2 border-[#8e4912] rounded-[24px] px-5 py-3 text-[#3b2313] text-xs sm:text-sm font-bold shadow-[0_8px_16px_rgba(0,0,0,0.3)] font-[family-name:var(--font-inter)]">
              {scanHint}
            </p>
          </div>

          {/* Quick Simulation Bar / Pilihan Uji Sampel Langsung */}
          {phase === 'scanning' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center justify-center flex-wrap gap-2 z-20 w-full max-w-lg px-4">
              <button
                onClick={() => selectSimulatedSample(PLASTIC_DATA.bottle)}
                className="bg-[#083b54]/90 hover:bg-[#006591] text-white text-[11px] font-bold px-3 py-1.5 rounded-full border border-[#6bff8f]/40 shadow-md backdrop-blur-md transition-all flex items-center gap-1 active:scale-95"
              >
                <span className="material-symbols-outlined text-xs text-[#6bff8f]">water_bottle</span>
                Uji Botol PET
              </button>
              <button
                onClick={() => selectSimulatedSample(PLASTIC_DATA.cup)}
                className="bg-[#083b54]/90 hover:bg-[#006591] text-white text-[11px] font-bold px-3 py-1.5 rounded-full border border-[#6bff8f]/40 shadow-md backdrop-blur-md transition-all flex items-center gap-1 active:scale-95"
              >
                <span className="material-symbols-outlined text-xs text-[#6bff8f]">local_cafe</span>
                Uji Gelas Cup PP
              </button>
              <button
                onClick={() => selectSimulatedSample(PLASTIC_DATA.bowl)}
                className="bg-[#083b54]/90 hover:bg-[#006591] text-white text-[11px] font-bold px-3 py-1.5 rounded-full border border-[#6bff8f]/40 shadow-md backdrop-blur-md transition-all flex items-center gap-1 active:scale-95"
              >
                <span className="material-symbols-outlined text-xs text-[#6bff8f]">ramen_dining</span>
                Uji Wadah Plastik
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pemantik modal */}
      {phase === 'pemantik' && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white border-2 border-[#e4f1f9] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl my-auto">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 bg-[#6bff8f]/20 border border-[#006e2f]/30 rounded-full flex items-center justify-center shadow-lg shadow-[#006e2f]/10">
                <span className="material-symbols-outlined text-[#006e2f] text-3xl">verified</span>
              </div>
            </div>

            <p className="text-xs font-[family-name:var(--font-mono)] text-[#006e2f] font-extrabold uppercase tracking-widest text-center mb-1">
              {detectedPlasticInfo.name} Terdeteksi ✓
            </p>

            {/* Dynamic Card Polimer Edukatif */}
            <div className="bg-[#f2f8fa] border-2 border-[#d0e5f2] rounded-2xl p-3.5 mb-4 text-left">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-[#006591] text-white tracking-wider font-[family-name:var(--font-mono)]">
                  {detectedPlasticInfo.code}
                </span>
                <span className="text-[11px] font-bold text-[#ba1a1a] flex items-center gap-1 font-[family-name:var(--font-mono)]">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  Urai: {detectedPlasticInfo.decompositionTime}
                </span>
              </div>

              <p className="text-xs font-extrabold text-[#083b54] mb-1 font-[family-name:var(--font-outfit)]">
                Polimer: {detectedPlasticInfo.polymer}
              </p>

              <p className="text-[11px] text-[#4b5563] leading-relaxed">
                {detectedPlasticInfo.description}
              </p>
            </div>

            <h3 className="font-[family-name:var(--font-outfit)] text-lg sm:text-xl font-bold text-center mb-3 text-[#083b54]">
              Pertanyaan Pemantik
            </h3>

            <div className="bg-[#f8fafc] border-l-4 border-[#006591] rounded-xl p-4 mb-4">
              <p className="text-[#3e4850] text-xs sm:text-sm leading-relaxed italic font-medium">
                &ldquo;Bagaimana mungkin benda padat sintetis seperti <strong className="text-[#083b54] not-italic">{detectedPlasticInfo.name.toLowerCase()}</strong> ini bisa menembus dan menetap di dalam usus manusia — sedangkan tubuh kita dirancang untuk mencerna makanan?&rdquo;
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-[#083b54] mb-1.5 uppercase font-[family-name:var(--font-outfit)]">
                Tuliskan Hipotesis Awalmu (LKPD Tahap 1)
              </label>
              <textarea
                value={lkpdAnswers.lkpdStep1}
                onChange={(e) => setLkpdAnswer('lkpdStep1', e.target.value)}
                placeholder={`Menurut saya, ${detectedPlasticInfo.name.toLowerCase()} bisa masuk ke tubuh karena...`}
                className="w-full h-24 p-3 bg-[#f8fafc] border-2 border-[#e4eff4] rounded-xl text-sm font-medium focus:border-[#006591] focus:ring-0 outline-none resize-none transition-all"
              />
            </div>

            <p className="text-[#6e7881] text-xs text-center mb-5">
              Pikirkan jawabannya. Mulai investigasi untuk membuktikannya di Tahap 2.
            </p>

            <div className="flex flex-col gap-2.5">
              <button 
                onClick={() => {
                  if (!lkpdAnswers.lkpdStep1.trim()) {
                    alert('Harap isi hipotesis awalmu sebelum melanjutkan!');
                    return;
                  }
                  proceed();
                }}
                className="w-full bg-[#006591] hover:bg-[#004c6e] text-white font-bold py-3.5 rounded-xl text-base sm:text-lg transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-[#006591]/30 font-[family-name:var(--font-outfit)]">
                Mulai Investigasi <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              <button onClick={() => { startCamera(); setPhase('scanning'); }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-[#006591] font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 font-[family-name:var(--font-outfit)]">
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

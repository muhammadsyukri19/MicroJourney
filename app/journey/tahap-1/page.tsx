'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { DetectedObject, ObjectDetection } from '@tensorflow-models/coco-ssd';
import { useJourneyStore } from '@/lib/journeyStore';
import StageIntro from '@/components/stages/StageIntro';
import StageCompletionModal from '@/components/ui/StageCompletionModal';
import { AnimatePresence } from 'framer-motion';

type Phase = 'init' | 'scanning' | 'detected' | 'pemantik';

/**
 * Konfigurasi scanner. Nilai-nilai ini adalah titik awal yang BELUM dikalibrasi
 * lewat pengujian kamera langsung; ubah di sini bila hasil uji menuntutnya.
 */
const SCANNER_CONFIG = {
  /** Kelas COCO-SSD yang dijadikan target. Nama = kelas model, nilai = label tampilan. */
  targetClasses: {
    bottle: 'Botol',
    cup: 'Gelas / Cangkir',
  } as Record<string, string>,
  /** minScore yang diteruskan ke model.detect (kandidat mentah). */
  inferenceMinScore: 0.3,
  /** Skor minimal agar kotak & label digambar (belum berarti diterima). */
  drawMinScore: 0.4,
  /** Skor minimal agar sebuah frame dihitung sebagai konfirmasi. */
  acceptMinScore: 0.6,
  /** Lama (ms) objek harus bertahan di dalam lingkaran sasaran (kelas & posisi konsisten) sebelum dikunci. */
  holdDurationMs: 3000,
  /** Diameter lingkaran sasaran di tengah layar (px CSS, dibatasi 80% sisi terpendek layar). Deteksi hanya dihitung di dalam lingkaran ini. */
  roiDiameterPx: 256,
  /** Jeda (ms) menampilkan status "terkunci" sebelum modal pertanyaan pemantik muncul. */
  lockedFlashMs: 1500,
  /** Batas maksimum langkah waktu per inferensi (ms) agar lonjakan lag tidak mempercepat penguncian. */
  maxStepMs: 300,
  /** Toleransi frame tanpa deteksi sebelum progres mulai berkurang. */
  missToleranceFrames: 3,
  /** IoU minimal antara kotak frame ini dan sebelumnya agar dianggap objek yang sama. */
  minIouContinuity: 0.2,
  /** Jeda minimal antar inferensi (ms) agar tidak membebani perangkat. */
  minInferenceIntervalMs: 100,
  maxDetections: 10,
  /** Setelah ini (ms) tombol "simulasi manual" ditampilkan. */
  manualFallbackDelayMs: 12000,
};

interface ScanResult {
  className: string; // nama kelas asli dari model, mis. "bottle"
  label: string;     // label tampilan, mis. "Botol"
  score: number;     // 0..1
}

function iou(a: number[], b: number[]): number {
  const [ax, ay, aw, ah] = a;
  const [bx, by, bw, bh] = b;
  const x1 = Math.max(ax, bx);
  const y1 = Math.max(ay, by);
  const x2 = Math.min(ax + aw, bx + bw);
  const y2 = Math.min(ay + ah, by + bh);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = aw * ah + bw * bh - inter;
  return union > 0 ? inter / union : 0;
}

export default function Tahap1() {
  const { completeStage } = useJourneyStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const activeRef = useRef(true);
  const sessionRef = useRef(0);           // token sesi: loop lama otomatis berhenti
  const startingRef = useRef(false);      // cegah startCamera ganda
  const modelRef = useRef<ObjectDetection | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lockTimerRef = useRef<number | null>(null);

  // Status penguncian (ref agar tidak bergantung render)
  const holdMsRef = useRef(0); // lama (ms) objek bertahan di dalam lingkaran sasaran
  const missFramesRef = useRef(0);
  const trackRef = useRef<{ cls: string; bbox: number[] } | null>(null);

  const [phase, setPhase] = useState<Phase>('init');
  const [detectedClass, setDetectedClass] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [scanHint, setScanHint] = useState('Arahkan kamera ke botol atau gelas');
  const [lockProgress, setLockProgress] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const playScanPing = useCallback((type: 'lock' | 'beep') => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') void ctx.resume();
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

  // Menghentikan loop inferensi (via token sesi), timer fallback, dan stream kamera.
  const stopCamera = useCallback(() => {
    activeRef.current = false;
    sessionRef.current += 1;
    cancelAnimationFrame(animRef.current);
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => {
    stopCamera();
    if (lockTimerRef.current !== null) clearTimeout(lockTimerRef.current);
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    modelRef.current?.dispose();
    modelRef.current = null;
  }, [stopCamera]);

  function resetLock() {
    holdMsRef.current = 0;
    missFramesRef.current = 0;
    trackRef.current = null;
    setLockProgress(0);
    setDetectedClass('');
  }

  // Menyelaraskan canvas dengan elemen & menghitung transformasi `object-cover`
  // (video diskalakan memenuhi elemen lalu dipotong di tengah).
  function prepareCanvas(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (!vw || !vh || !cw || !ch) return null;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(cw * dpr);
    const h = Math.round(ch * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    const scale = Math.max(cw / vw, ch / vh);
    return {
      ctx, cw, ch, scale,
      ox: (cw - vw * scale) / 2,
      oy: (ch - vh * scale) / 2,
    };
  }

  function drawDetection(
    t: NonNullable<ReturnType<typeof prepareCanvas>>,
    bbox: number[],
    text: string,
    color: string,
    fill: string,
  ) {
    const { ctx, cw, ch, scale, ox, oy } = t;
    const [bx, by, bw, bh] = bbox;
    // Koordinat video -> koordinat elemen, lalu dibatasi pada area terlihat
    let x = bx * scale + ox;
    let y = by * scale + oy;
    let w = bw * scale;
    let h = bh * scale;
    const x2 = Math.min(cw, x + w);
    const y2 = Math.min(ch, y + h);
    x = Math.max(0, x);
    y = Math.max(0, y);
    w = x2 - x;
    h = y2 - y;
    if (w <= 2 || h <= 2) return;

    const radius = Math.min(16, w / 2, h / 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
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

    ctx.font = 'bold 13px var(--font-outfit), sans-serif';
    const bubbleW = Math.min(cw - 8, ctx.measureText(text).width + 28);
    const bubbleH = 30;
    let bubbleX = x + w / 2 - bubbleW / 2;
    bubbleX = Math.max(4, Math.min(cw - bubbleW - 4, bubbleX));
    const bubbleY = y - bubbleH - 8 >= 4 ? y - bubbleH - 8 : y + 8;

    ctx.fillStyle = fill;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 15);
    } else {
      ctx.rect(bubbleX, bubbleY, bubbleW, bubbleH);
    }
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bubbleX + bubbleW / 2, bubbleY + bubbleH / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // Memproses satu hasil inferensi. Mengembalikan true jika scanner terkunci.
  // `dt` = selisih waktu (ms) sejak inferensi sebelumnya.
  function processFrame(preds: DetectedObject[], video: HTMLVideoElement, canvas: HTMLCanvasElement, dt: number): boolean {
    const cfg = SCANNER_CONFIG;
    const target = prepareCanvas(video, canvas);
    const step = Math.min(Math.max(dt, 0), cfg.maxStepMs);

    // Objek kelas target di seluruh frame (di dalam maupun di luar lingkaran sasaran)
    const targetPreds = preds.filter(
      p => p.class in cfg.targetClasses && p.score >= cfg.drawMinScore,
    );

    // Hanya objek yang pusat kotaknya berada di dalam lingkaran sasaran yang dihitung.
    // Koordinat video dikonversi ke koordinat elemen (memperhitungkan object-cover).
    const inRoi = (p: DetectedObject) => {
      if (!target) return false;
      const { cw, ch, scale, ox, oy } = target;
      const radius = Math.min(cfg.roiDiameterPx, Math.min(cw, ch) * 0.8) / 2;
      const cx = (p.bbox[0] + p.bbox[2] / 2) * scale + ox;
      const cy = (p.bbox[1] + p.bbox[3] / 2) * scale + oy;
      return Math.hypot(cx - cw / 2, cy - ch / 2) <= radius;
    };
    const candidates = targetPreds.filter(inRoi);

    // Tidak ada kandidat di dalam lingkaran: toleransi beberapa frame, lalu kurangi progres
    if (candidates.length === 0) {
      missFramesRef.current += 1;
      if (missFramesRef.current > cfg.missToleranceFrames) {
        holdMsRef.current = Math.max(0, holdMsRef.current - step * 2);
        if (holdMsRef.current === 0) {
          trackRef.current = null;
        }
        setLockProgress(Math.round((holdMsRef.current / cfg.holdDurationMs) * 100));
        setDetectedClass('');
      }
      const outside = [...targetPreds].sort((a, b) => b.score - a.score)[0];
      const seen = [...preds].sort((a, b) => b.score - a.score)[0];
      setScanHint(
        outside
          ? `${cfg.targetClasses[outside.class]} (${outside.class}) terlihat tetapi di luar lingkaran. Geser ke tengah lingkaran sasaran.`
          : seen
            ? `Model melihat "${seen.class}" (${Math.round(seen.score * 100)}%), bukan botol atau gelas. Arahkan botol/gelas ke tengah lingkaran.`
            : 'Belum ada objek terbaca. Pastikan objek terlihat jelas dan cukup terang.',
      );
      return false;
    }
    missFramesRef.current = 0;

    // Pilih kandidat yang melanjutkan objek yang sedang dilacak (kelas sama + posisi berdekatan)
    const prev = trackRef.current;
    let pick: DetectedObject;
    if (prev) {
      const sameClass = candidates.filter(c => c.class === prev.cls);
      if (sameClass.length > 0) {
        pick = sameClass.reduce((best, c) => (iou(c.bbox, prev.bbox) > iou(best.bbox, prev.bbox) ? c : best));
        if (iou(pick.bbox, prev.bbox) < cfg.minIouContinuity) {
          // Posisi melompat jauh: anggap objek berbeda, mulai konfirmasi dari awal
          holdMsRef.current = 0;
        }
      } else {
        // Kelas berubah: reset progres dan lacak kelas baru
        holdMsRef.current = 0;
        pick = [...candidates].sort((a, b) => b.score - a.score)[0];
      }
    } else {
      pick = [...candidates].sort((a, b) => b.score - a.score)[0];
    }
    trackRef.current = { cls: pick.class, bbox: pick.bbox };

    // Hanya frame dengan skor >= acceptMinScore yang menambah waktu tahan
    const accepted = pick.score >= cfg.acceptMinScore;
    const before = holdMsRef.current;
    holdMsRef.current = accepted
      ? Math.min(cfg.holdDurationMs, before + step)
      : Math.max(0, before - step);

    const held = holdMsRef.current;
    const progress = Math.round((held / cfg.holdDurationMs) * 100);
    const label = cfg.targetClasses[pick.class];
    const pct = Math.round(pick.score * 100);
    const locked = held >= cfg.holdDurationMs;

    setLockProgress(progress);
    setDetectedClass(`${label} (${pick.class}) · ${pct}%`);

    if (before < cfg.holdDurationMs / 2 && held >= cfg.holdDurationMs / 2) {
      playScanPing('beep');
    }

    if (target) {
      const text = `${label.toUpperCase()} (${pick.class}) · ${pct}%`;
      if (locked) {
        drawDetection(target, pick.bbox, text, '#6bff8f', 'rgba(0,110,47,0.92)');
      } else if (accepted) {
        drawDetection(target, pick.bbox, text, '#f0a345', 'rgba(210,123,34,0.92)');
      } else {
        drawDetection(target, pick.bbox, `${text} · skor rendah`, 'rgba(255,255,255,0.8)', 'rgba(62,72,80,0.85)');
      }
    }

    if (locked) {
      setScanHint(`✓ Objek terdeteksi sebagai ${label} (${pick.class}). Menyiapkan Pertanyaan Pemantik...`);
      setScanResult({ className: pick.class, label, score: pick.score });
      playScanPing('lock');
      stopCamera();
      setPhase('detected');
      // Tahan tampilan "terkunci" sejenak agar siswa melihat hasilnya sebelum pertanyaan muncul
      lockTimerRef.current = window.setTimeout(() => setPhase('pemantik'), cfg.lockedFlashMs);
      return true;
    }

    const remainingSec = Math.max(1, Math.ceil((cfg.holdDurationMs - held) / 1000));
    setScanHint(
      accepted
        ? `Tahan ${label} (${pick.class}) tetap di dalam lingkaran... ${remainingSec} detik lagi.`
        : `${label} (${pick.class}) terlihat tetapi skor masih rendah (${pct}%). Dekatkan dan perjelas objek.`,
    );
    return false;
  }

  async function startCamera() {
    if (startingRef.current) return; // cegah pemanggilan ganda
    startingRef.current = true;

    // Hentikan sesi/loop sebelumnya, lalu buka sesi baru
    stopCamera();
    const session = ++sessionRef.current;
    activeRef.current = true;
    const isCurrent = () => activeRef.current && sessionRef.current === session;

    setCameraError(null);
    setModelLoading(true);
    setShowManualFallback(false);
    setScanHint('Menyiapkan sensor kamera...');
    setScanResult(null);
    resetLock();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera. Pastikan Anda menggunakan HTTPS atau localhost di Chrome/Edge terbaru.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (!isCurrent()) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (!isCurrent()) return;
      setPhase('scanning');
      setScanHint('Memuat model deteksi objek umum (COCO-SSD)...');

      fallbackTimerRef.current = window.setTimeout(() => {
        if (activeRef.current) setShowManualFallback(true);
      }, SCANNER_CONFIG.manualFallbackDelayMs);

      // Model deteksi objek umum COCO-SSD (dimuat sekali, dipakai ulang saat "Scan Ulang").
      // Catatan: model khusus plastik (/models/plastic) belum tersedia dan tidak digunakan.
      let model = modelRef.current;
      if (!model) {
        try {
          const [tf, cocoSsd] = await Promise.all([
            import('@tensorflow/tfjs'),
            import('@tensorflow-models/coco-ssd'),
          ]);
          await tf.ready();
          model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
          modelRef.current = model;
        } catch {
          throw new Error('Gagal memuat model deteksi objek (COCO-SSD). Periksa koneksi internet lalu coba lagi.');
        }
      }
      if (!isCurrent()) return;
      setModelLoading(false);
      setScanHint('Posisikan botol atau gelas tepat di tengah lingkaran sasaran...');

      // Satu loop per sesi; berhenti otomatis jika sesi berganti/kamera dihentikan.
      let lastInference = 0;
      let consecutiveErrors = 0;
      const loopModel = model;

      const tick = async (now: number) => {
        if (!isCurrent()) return;
        const video = videoRef.current;
        const canvas = overlayRef.current;
        if (!video || !canvas) return;

        if (video.readyState < 2 || now - lastInference < SCANNER_CONFIG.minInferenceIntervalMs) {
          animRef.current = requestAnimationFrame(tick);
          return;
        }
        const dt = lastInference === 0 ? SCANNER_CONFIG.minInferenceIntervalMs : now - lastInference;
        lastInference = now;

        try {
          const preds = await loopModel.detect(
            video,
            SCANNER_CONFIG.maxDetections,
            SCANNER_CONFIG.inferenceMinScore,
          );
          if (!isCurrent()) return;
          consecutiveErrors = 0;
          if (processFrame(preds, video, canvas, dt)) return; // terkunci: loop selesai
        } catch (err) {
          consecutiveErrors += 1;
          console.warn('[Scanner] Inferensi gagal:', err);
          if (consecutiveErrors >= 3) {
            stopCamera();
            setCameraError('Proses deteksi berhenti karena terjadi kesalahan berulang. Coba lagi atau lanjut secara manual.');
            setModelLoading(false);
            setShowManualFallback(true);
            return;
          }
        }

        if (isCurrent()) animRef.current = requestAnimationFrame(tick);
      };

      animRef.current = requestAnimationFrame(tick);
    } catch (err: unknown) {
      if (isCurrent()) {
        stopCamera();
        setCameraError(err instanceof Error ? err.message : 'Akses kamera ditolak');
        setModelLoading(false);
        setShowManualFallback(true);
      }
    } finally {
      startingRef.current = false;
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
            description="Arahkan kamera ke botol atau gelas di sekitarmu. Scanner mengenali bentuk objek (botol/gelas); jenis bahan dan potensinya menjadi mikroplastik kita bahas sebagai materi edukasi."
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
            <button onClick={() => { setScanResult(null); setPhase('pemantik'); }} className="bg-[#f0a345] text-[#3b2313] font-bold px-6 py-3 rounded-xl">Lanjut Manual</button>
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
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
            <div className="bg-[#083b54]/80 backdrop-blur-md px-6 py-2.5 rounded-full border-2 border-[#6bff8f]/30 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6bff8f] animate-ping" />
              <p className="text-[#6bff8f] text-xs font-[family-name:var(--font-outfit)] font-extrabold tracking-wider">
                {modelLoading ? 'MEMUAT MODEL AI...' : lockProgress > 0 ? `MENAHAN OBJEK (${lockProgress}%)` : 'LETAKKAN BOTOL / GELAS DI TENGAH LINGKARAN'}
              </p>
            </div>
            <p className="bg-black/40 backdrop-blur-sm text-white/80 text-[10px] font-semibold px-3 py-1 rounded-full">
              Model deteksi objek umum (COCO-SSD) · bukan model khusus plastik
            </p>
          </div>

          {/* Area sasaran: sisi luar lingkaran digelapkan; deteksi hanya dihitung di dalam lingkaran */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, transparent calc(min(${SCANNER_CONFIG.roiDiameterPx}px, 80vmin) / 2), rgba(8,59,84,0.55) calc(min(${SCANNER_CONFIG.roiDiameterPx}px, 80vmin) / 2 + 1px))`,
            }}
          />

          {/* Center Target Circle + cincin progres tahan */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
            style={{ width: `min(${SCANNER_CONFIG.roiDiameterPx}px, 80vmin)`, height: `min(${SCANNER_CONFIG.roiDiameterPx}px, 80vmin)` }}
          >
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="49" fill="none"
                stroke="#6bff8f" strokeOpacity={lockProgress > 0 ? 0.35 : 0.6}
                strokeWidth="1" strokeDasharray={lockProgress > 0 ? undefined : '3 3'}
              />
              <circle
                cx="50" cy="50" r="49" fill="none"
                stroke="#6bff8f" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={`${(lockProgress / 100) * 307.9} 307.9`}
                style={{ transition: 'stroke-dasharray 150ms linear' }}
              />
            </svg>
            <div className="w-4 h-4 border-t-2 border-l-2 border-[#6bff8f]" />
          </div>

          {/* Lock Progress Indicator Bar */}
          {lockProgress > 0 && (
            <div className="absolute bottom-36 left-1/2 -translate-x-1/2 w-72 bg-[#083b54]/90 backdrop-blur-md border border-[#6bff8f]/40 p-3 rounded-2xl shadow-lg">
              <div className="flex justify-between text-xs text-[#6bff8f] font-bold mb-1.5 font-[family-name:var(--font-outfit)] uppercase">
                <span>{detectedClass || 'Objek'}</span>
                <span>{lockProgress}%</span>
              </div>
              <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#f0a345] to-[#6bff8f] transition-all duration-150 rounded-full"
                  style={{ width: `${lockProgress}%` }}
                />
              </div>
              <p className="text-center text-white/70 text-[10px] mt-1.5 font-semibold">
                Tahan objek di dalam lingkaran selama ±{Math.round(SCANNER_CONFIG.holdDurationMs / 1000)} detik...
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
                onClick={() => { stopCamera(); setScanResult(null); setPhase('pemantik'); }}
                className="text-white/80 hover:text-white text-xs underline font-semibold bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-sm"
              >
                Gagal Scan? Klik di sini untuk simulasi manual
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status terkunci: ditahan sejenak sebelum pertanyaan pemantik */}
      {phase === 'detected' && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-end justify-center pb-16">
          <div className="bg-[#006e2f]/95 border-2 border-[#6bff8f] rounded-[24px] px-6 py-4 text-white text-sm font-bold shadow-[0_8px_24px_rgba(0,0,0,0.4)] text-center max-w-[min(90vw,440px)]">
            ✓ Objek terkunci{scanResult ? `: ${scanResult.label} (${scanResult.className})` : ''}
            <span className="block text-xs font-semibold text-white/80 mt-1">Menyiapkan Pertanyaan Pemantik...</span>
          </div>
        </div>
      )}

      {/* Pemantik modal */}
      {phase === 'pemantik' && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white border-2 border-[#e4f1f9] rounded-3xl max-w-md w-full p-8 shadow-2xl my-auto">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 bg-[#6bff8f]/20 border border-[#006e2f]/30 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[#006e2f] text-3xl">check_circle</span>
              </div>
            </div>

            {/* Hasil deteksi (apa adanya dari model) */}
            <p className="text-xs font-[family-name:var(--font-mono)] text-[#006e2f] font-extrabold uppercase tracking-widest text-center mb-1">
              {scanResult ? 'Objek Terdeteksi ✓' : 'Mode Manual'}
            </p>
            {scanResult ? (
              <p className="text-center text-[#3e4850] text-xs mb-2 font-[family-name:var(--font-mono)] font-bold">
                Model mendeteksi: {scanResult.label} ({scanResult.className}) · skor {Math.round(scanResult.score * 100)}%
              </p>
            ) : (
              <p className="text-center text-[#3e4850] text-xs mb-2 font-[family-name:var(--font-mono)] font-bold">
                Pemindaian kamera dilewati.
              </p>
            )}
            <p className="text-center text-[#6e7881] text-[11px] mb-4 leading-relaxed">
              Scanner umum ini hanya mengenali bentuk objek. Bahan sebenarnya (plastik, kaca, atau logam) belum diverifikasi — cek simbol daur ulang pada kemasan.
            </p>

            {/* Materi edukasi umum, terpisah dari hasil deteksi */}
            <div className="bg-[#e4f1f9]/60 border border-[#006591]/20 rounded-xl p-3 mb-5">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#006591] mb-1">Materi edukasi umum · bukan hasil deteksi</p>
              <p className="text-[#3e4850] text-xs leading-relaxed">
                Banyak botol minuman dibuat dari plastik PET. Plastik jenis ini sangat lambat terurai di alam — sering disebut mencapai sekitar 450 tahun (estimasi umum, bergantung kondisi lingkungan).
              </p>
            </div>

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
              <button onClick={() => { setScanResult(null); setPhase('scanning'); startCamera(); }}
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
        stageTitle="AR Scanner Plastik"
        xpEarned={100}
        nextStagePath="/journey/tahap-2"
        onClose={() => setShowCompletionModal(false)}
      />
    </div>
  );
}

'use client';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useJourneyStore } from '@/lib/journeyStore';
import dynamic from 'next/dynamic';
import StageIntro from '@/components/stages/StageIntro';
import { useStageBack } from '@/lib/stageBack';
import {
  classifyCrop,
  detectBin,
  detectObjects,
  releaseFrame,
  startBinDetector,
  startScannerAI,
  stopScannerAI,
} from '@/lib/plasticScannerClient';
import StageCompletionModal from '@/components/ui/StageCompletionModal';
import { AnimatePresence, motion } from 'framer-motion';

type Phase = 'init' | 'scanning' | 'identified' | 'findBin' | 'disposed' | 'pemantik';

interface PlasticInfo {
  name: string;
  polymer: string;
  decompositionTime: string;
  description: string;
  resinClass?: string;
}

// Angka lama terurai mengikuti proposal (hal. 15). Belum ada angka baku karena hasilnya bergantung pada bentuk
// plastik dan lingkungannya, jadi di layar selalu ditulis sebagai perkiraan.
const PET_FACTS = {
  polymer: 'Umumnya PET (kode 1)',
  decompositionTime: 'Sekitar 450 tahun',
  description:
    'Kalau sering terjemur atau dipakai berulang, plastik ini melepas serpihan sangat kecil yang disebut mikroplastik.',
  resinClass: '1-PET',
};
const PP_FACTS = {
  polymer: 'Umumnya PP (kode 5)',
  decompositionTime: 'Sekitar 200 tahun',
  description:
    'Makin rapuh kalau terus kena sinar matahari, dan bisa melepas mikroplastik saat tergesek atau kena air panas.',
  resinClass: '5-PP',
};

// Bahan plastik tidak bisa dipastikan dari tampilannya, jadi polimer diambil dari jenis benda yang dikenali kamera
const OBJECT_PLASTIC_INFO = {
  bottle: { name: 'Botol plastik', ...PET_FACTS },
  cup: { name: 'Gelas plastik', ...PP_FACTS },
  bowl: { name: 'Wadah plastik', ...PP_FACTS },
};

// Kemasan yang tidak dikenali kamera, seperti kresek atau styrofoam: tebakan jenis dari model terlalu sering keliru
const PACKAGING_PLASTIC_INFO: PlasticInfo = {
  name: 'Kemasan plastik',
  polymer: 'Cek kode segitiga, bila ada',
  decompositionTime: 'Puluhan sampai ratusan tahun',
  description: 'Plastik tidak benar-benar hilang. Ia pecah menjadi serpihan kecil yang disebut mikroplastik.',
};

type ObjectKind = keyof typeof OBJECT_PLASTIC_INFO;

/** COCO sering menamai botol plastik "vase"; bentuknya yang memanjang membedakannya dari gelas */
function objectKind(cocoClass: string, [, , w, h]: Box): ObjectKind {
  if (cocoClass === 'bottle' || cocoClass === 'bowl') return cocoClass;
  if (cocoClass === 'vase' && Math.max(w, h) / Math.max(1, Math.min(w, h)) >= BOTTLE_MIN_ELONGATION) return 'bottle';
  return 'cup';
}

// Kandidat wadah target COCO-SSD. COCO sering menamai botol plastik "vase" atau "wine glass", kadang bergantian
// antar frame, jadi plastik atau bukan diputuskan model plastik.
const CONTAINER_COCO_CLASSES = ['bottle', 'cup', 'bowl', 'vase', 'wine glass'] as const;
// Benda yang jelas bukan sampah. Daftar ini sengaja pendek: COCO sering salah menamai kemasan
// (gelas busa terbaca "toilet", botol terbaca "vase"), dan siswa memang diminta memotret plastik.
const NON_WASTE_COCO_CLASSES = ['person', 'cell phone', 'laptop', 'keyboard', 'mouse', 'tv'] as const;
const NON_WASTE_LABELS: Record<string, string> = {
  person: 'orang',
  'cell phone': 'HP',
  laptop: 'laptop',
  keyboard: 'keyboard',
  mouse: 'mouse',
  tv: 'layar TV',
};

// 7 kelas resin MobileNetV2 (alpha=0.50, exp04_glass); keluaran ke-8 = non-plastik
const NON_PLASTIC_INDEX = 7;

// Deteksi langsung: objek dikunci setelah stabil beberapa frame, lalu diperiksa model plastik sekali
const LOCK_SCORE = 0.6;
const TRACK_SCORE = 0.35;
const REACQUIRE_SCORE = 0.5;
const STABLE_FRAMES = 8;
const BOTTLE_MIN_ELONGATION = 1.6;
// Satu-dua frame kosong wajar pada kamera HP yang bergetar, jadi hitungan kunci tidak langsung diulang
const STREAK_GAP_FRAMES = 2;
const LOST_FRAMES = 6;
const RECHECK_AFTER_FRAMES = 10;
const DETECT_INTERVAL_MS = 150;
const FRAME_LONG_SIDE = 640;
const MANUAL_SCAN_DELAY_MS = 5000;

// Deteksi tempat sampah: ambang dipilih dari validation detektor (lihat experiments/bin_dataset)
const BIN_SCORE = 0.4;
const BIN_STABLE_FRAMES = 3;
const BIN_LOST_FRAMES = 6;
const BIN_INTERVAL_MS = 200;
const BIN_FALLBACK_MS = 12000;

// Ambang batas klasifikasi
// Dipilih dari validation exp04. Penolakan non-plastik kini ditangani NON_PLASTIC_REJECT_THRESHOLD,
// jadi ambang ini hanya menyaring foto yang jenis resinnya sangat tidak jelas.
const RESIN_THRESHOLD = 0.4;
// Objek bukan sampah di tengah bingkai dengan skor >= ambang ini langsung ditolak
const NON_WASTE_COCO_THRESHOLD = 0.5;
// Foto hanya ditolak bila model cukup yakin non-plastik (dipilih dari validation exp03, dipakai lagi di exp04).
// Di bawah ini skor resin dinormalkan ulang agar plastik tidak mudah tertolak.
const NON_PLASTIC_REJECT_THRESHOLD = 0.6;
// Kotak selebar ini (mis. "tv" sepenuh layar) biasanya salah baca COCO, kecuali orang
const NON_PLASTIC_MAX_AREA_RATIO = 0.6;
// Margin konteks di sekitar kotak kandidat wadah saat foto diklasifikasi
const CANDIDATE_PAD_RATIOS = [0.08, 0.2];

const REJECTED_MATERIAL_STATUS =
  'AI belum yakin. Coba foto dari sisi lain, atau cari kode segitiga di kemasan.';


// Faktor interpolasi posisi bingkai per frame render (0..1, makin besar makin responsif)
const BOX_LERP = 0.28;

const COLOR_LOCK = '#6bff8f';
const COLOR_WARN = '#f0a345';

type Box = [number, number, number, number];

interface OverlayTarget {
  box: Box | null; // koordinat ruang video
  kind: 'locking' | 'uncertain' | 'none';
  label: string;
  isCenterFallback: boolean;
}

interface VisibleRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number; // px layar per px video (object-cover)
}

/** Area video yang benar-benar terlihat di layar ketika memakai object-cover */
function getVisibleRegion(video: HTMLVideoElement): VisibleRegion {
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const cw = video.clientWidth || vw;
  const ch = video.clientHeight || vh;
  const scale = Math.max(cw / vw, ch / vh);
  const w = Math.min(vw, cw / scale);
  const h = Math.min(vh, ch / scale);
  return { x: (vw - w) / 2, y: (vh - h) / 2, w, h, scale };
}

/** ROI tengah yang selalu berada di area terlihat (tidak terpotong di layar potret) */
function getCenterRoi(region: VisibleRegion): Box {
  // Jangan lebih sempit dari ini: crop terlalu rapat membuat plastik terbaca sebagai tekstur latar
  const side = Math.round(Math.min(region.w, region.h) * 0.72);
  const x = Math.round(region.x + (region.w - side) / 2);
  const y = Math.round(region.y + (region.h - side) / 2);
  return [x, y, side, side];
}

/** Benda yang sebagian besar berada di luar area layar yang terlihat diabaikan */
function isMostlyVisible([bx, by, bw, bh]: Box, region: VisibleRegion) {
  const ix = Math.max(0, Math.min(bx + bw, region.x + region.w) - Math.max(bx, region.x));
  const iy = Math.max(0, Math.min(by + bh, region.y + region.h) - Math.max(by, region.y));
  return (ix * iy) / Math.max(1, bw * bh) >= 0.5;
}

/** ctx.roundRect dengan fallback untuk WebView/Safari lama */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

/** Potongan persegi di sekitar objek sebagai JPEG data URL untuk kartu hasil scan */
function cropToDataUrl(source: HTMLCanvasElement, box: Box): string | null {
  const [x, y, w, h] = box;
  const side = Math.min(source.width, source.height, Math.round(Math.max(w, h) * 1.15));
  const sx = Math.max(0, Math.min(source.width - side, Math.round(x + w / 2 - side / 2)));
  const sy = Math.max(0, Math.min(source.height - side, Math.round(y + h / 2 - side / 2)));
  const out = document.createElement('canvas');
  out.width = out.height = 320;
  const ctx = out.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(source, sx, sy, side, side, 0, 0, 320, 320);
  return out.toDataURL('image/jpeg', 0.85);
}

function mostCommon<T>(items: T[]): T {
  const count = (item: T) => items.filter(other => other === item).length;
  return items.reduce((best, item) => (count(item) > count(best) ? item : best));
}

function boxOverlap(a: Box, b: Box) {
  const ix = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]));
  const iy = Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
  const shared = ix * iy;
  return shared / Math.max(1, a[2] * a[3] + b[2] * b[3] - shared);
}

function cameraErrorMessage(err: unknown) {
  const name = err instanceof Error ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Izin kamera ditolak. Izinkan kamera di pengaturan browser, lalu coba lagi.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Kamera tidak ditemukan di perangkat ini.';
  }
  if (name === 'NotReadableError') {
    return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu, lalu coba lagi.';
  }
  return 'AI scanner belum bisa dibuka. Periksa koneksi internet, lalu coba lagi.';
}

function lerpBox(from: Box, to: Box, t: number): Box {
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
    from[3] + (to[3] - from[3]) * t,
  ];
}

function drawCorners(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cornerLen: number,
  radius: number
) {
  const r = Math.min(radius, cornerLen * 0.6);
  ctx.beginPath();
  // Kiri atas
  ctx.moveTo(x, y + cornerLen);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.lineTo(x + cornerLen, y);
  // Kanan atas
  ctx.moveTo(x + w - cornerLen, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + cornerLen);
  // Kanan bawah
  ctx.moveTo(x + w, y + h - cornerLen);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + w - cornerLen, y + h);
  // Kiri bawah
  ctx.moveTo(x + cornerLen, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + h - cornerLen);
  ctx.stroke();
}

/** Label pill kecil di atas bingkai (ukuran teks konsisten di layar berapa pun skala video) */
function drawTag(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  s: number,
  maxX: number
) {
  ctx.save();
  ctx.font = `700 ${12 * s}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const padX = 8 * s;
  const h = 22 * s;
  const w = ctx.measureText(text).width + padX * 2;
  const tx = Math.max(4 * s, Math.min(x, maxX - w - 4 * s));
  const ty = Math.max(4 * s, y - h - 6 * s);
  ctx.fillStyle = 'rgba(6, 41, 59, 0.85)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  roundRectPath(ctx, tx, ty, w, h, h / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, tx + padX, ty + h / 2 + 0.5 * s);
  ctx.restore();
}

interface ScanFeedbackState {
  status: 'scanning' | 'detected' | 'non_plastic' | 'uncertain';
  message: string;
}

const INITIAL_SCAN_CARD: ScanFeedbackState = {
  status: 'scanning',
  message: 'Arahkan kamera ke sampah plastik, lalu tahan sebentar.',
};

let stopAiTimer = 0;
const BIN_LABEL_DETAILS = ['Sudah masuk? Tekan tombol di bawah.'];

const AnchoredLabelAR = dynamic(() => import('@/components/stages/tahap1/AnchoredLabelAR'), { ssr: false });

export default function Tahap1() {
  const { completeStage, lkpdAnswers, setLkpdAnswer, setPlasticDisposal } = useJourneyStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const procCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticOverlayKeyRef = useRef<string | null>(null);
  const trackedBoxRef = useRef<Box | null>(null);
  const manualScanRef = useRef(false);
  const lockStateRef = useRef({ streak: 0, streakBox: null as Box | null, kinds: [] as ObjectKind[], cooldown: 0, misses: 0, errors: 0 });

  const streamRef = useRef<MediaStream | null>(null);
  const renderRafRef = useRef<number>(0);
  const activeRef = useRef(false);
  const sessionRef = useRef(0);
  const lockTimeoutRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('init');
  const audioCtxRef = useRef<AudioContext | null>(null);

  // State overlay AR (dibaca loop render, ditulis loop inferensi — tanpa re-render React)
  const overlayTargetRef = useRef<OverlayTarget>({
    box: null,
    kind: 'none',
    label: '',
    isCenterFallback: false,
  });
  const displayBoxRef = useRef<Box | null>(null);
  const boxAlphaRef = useRef(0);

  const [phase, setPhaseState] = useState<Phase>('init');
  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);
  const [detectedPlasticInfo, setDetectedPlasticInfo] = useState<PlasticInfo>(OBJECT_PLASTIC_INFO.bottle);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showAnswerHint, setShowAnswerHint] = useState(false);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const [showManualScan, setShowManualScan] = useState(false);
  const [manualChecking, setManualChecking] = useState(false);
  const [binSeen, setBinSeen] = useState(false);
  const [binVisible, setBinVisible] = useState(false);
  const [binFallback, setBinFallback] = useState(false);
  const [arUnavailable, setArUnavailable] = useState(false);
  const markArUnavailable = useCallback(() => setArUnavailable(true), []);

  // Kartu hasil scan
  const [scanCard, setScanCard] = useState<ScanFeedbackState>(INITIAL_SCAN_CARD);

  const playScanPing = useCallback((type: 'lock' | 'beep') => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      // Pakai satu AudioContext bersama (browser membatasi jumlah AudioContext)
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
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
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.([40, 30, 80]);
        }
      }
    } catch {
      // Audio context ignore error
    }
  }, []);

  const stopCamera = useCallback(() => {
    activeRef.current = false;
    sessionRef.current++;
    if (renderRafRef.current) {
      cancelAnimationFrame(renderRafRef.current);
      renderRafRef.current = 0;
    }
    if (lockTimeoutRef.current) {
      window.clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    const canvas = overlayRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(
    () => () => {
      stopCamera();
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    },
    [stopCamera]
  );

  // AI disiapkan di Web Worker sejak layar pembuka, jadi tampilan tidak ikut macet.
  // Penghentian ditunda agar pemasangan ganda di mode dev tidak memuat ulang model.
  useEffect(() => {
    window.clearTimeout(stopAiTimer);
    startScannerAI().catch(err => console.warn('AI scanner gagal disiapkan:', err));
    return () => {
      stopAiTimer = window.setTimeout(stopScannerAI, 500);
    };
  }, []);

  /** Loop render 60fps: menggambar bingkai bidik, sapuan laser saat analisis, dan bingkai objek */
  const drawOverlayFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = overlayRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    // Ubah ukuran canvas hanya bila dimensi berubah (mengubah ukuran tiap frame = flicker & boros)
    if (canvas.width !== vw) canvas.width = vw;
    if (canvas.height !== vh) canvas.height = vh;

    if (phaseRef.current === 'findBin' || phaseRef.current === 'disposed') {
      staticOverlayKeyRef.current = null;
      ctx.clearRect(0, 0, vw, vh);
      return;
    }

    // Saat belum ada objek bingkai tidak berubah, jadi cukup digambar sekali
    const staticKey =
      !manualScanRef.current &&
      overlayTargetRef.current.kind === 'none' &&
      boxAlphaRef.current === 0 &&
      phaseRef.current === 'scanning'
        ? `${vw}x${vh}x${video.clientWidth}x${video.clientHeight}`
        : null;
    if (staticKey && staticOverlayKeyRef.current === staticKey) return;
    staticOverlayKeyRef.current = staticKey;

    ctx.clearRect(0, 0, vw, vh);

    const region = getVisibleRegion(video);
    const s = 1 / region.scale; // 1px layar dalam satuan px video
    const roi = getCenterRoi(region);
    const now = performance.now();
    const target = overlayTargetRef.current;
    const isLockedPhase = phaseRef.current === 'identified';

    const hasObjectBox = Boolean(target.box && !target.isCenterFallback && target.kind !== 'none');
    const roiActive = target.isCenterFallback && target.kind !== 'none';

    // ── Bingkai bidik tengah (viewfinder) ──
    {
      const [rx, ry, rw, rh] = roi;
      const roiColor = roiActive ? (target.kind === 'locking' ? COLOR_LOCK : COLOR_WARN) : '#ffffff';
      ctx.save();
      ctx.globalAlpha = hasObjectBox ? 0.25 : roiActive ? 0.95 : 0.7;
      ctx.strokeStyle = roiColor;
      ctx.lineWidth = 3 * s;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 6 * s;
      drawCorners(ctx, rx, ry, rw, rh, Math.min(rw, rh) * 0.14, 14 * s);

      // Sapuan laser naik-turun di dalam bingkai bidik
      if (!hasObjectBox && !isLockedPhase && manualScanRef.current) {
        const t = (Math.sin(now / 700) + 1) / 2;
        const ly = ry + 10 * s + t * (rh - 20 * s);
        const grad = ctx.createLinearGradient(rx, 0, rx + rw, 0);
        grad.addColorStop(0, 'rgba(107,255,143,0)');
        grad.addColorStop(0.5, 'rgba(107,255,143,0.85)');
        grad.addColorStop(1, 'rgba(107,255,143,0)');
        ctx.shadowColor = COLOR_LOCK;
        ctx.shadowBlur = 10 * s;
        ctx.fillStyle = grad;
        ctx.fillRect(rx + 8 * s, ly - 1 * s, rw - 16 * s, 2 * s);
        // Jejak cahaya tipis di belakang laser
        const trail = ctx.createLinearGradient(0, ly, 0, ly + (Math.cos(now / 700) > 0 ? -1 : 1) * 40 * s);
        trail.addColorStop(0, 'rgba(107,255,143,0.12)');
        trail.addColorStop(1, 'rgba(107,255,143,0)');
        ctx.shadowBlur = 0;
        ctx.fillStyle = trail;
        const dir = Math.cos(now / 700) > 0 ? -1 : 1;
        ctx.fillRect(rx + 8 * s, dir < 0 ? ly - 40 * s : ly, rw - 16 * s, 40 * s);
      }

      ctx.restore();

      if (roiActive && target.label) {
        drawTag(ctx, target.label, rx, ry, roiColor, s, vw);
      }
    }

    // ── Bingkai objek dinamis (dihaluskan + fade in/out) ──
    if (hasObjectBox && target.box) {
      displayBoxRef.current = displayBoxRef.current
        ? lerpBox(displayBoxRef.current, target.box, BOX_LERP)
        : target.box;
      boxAlphaRef.current = Math.min(1, boxAlphaRef.current + 0.15);
    } else {
      boxAlphaRef.current = Math.max(0, boxAlphaRef.current - 0.08);
      if (boxAlphaRef.current === 0) displayBoxRef.current = null;
    }

    const db = displayBoxRef.current;
    if (db && boxAlphaRef.current > 0) {
      const [x, y, w, h] = db;
      const color = target.kind === 'uncertain' ? COLOR_WARN : COLOR_LOCK;
      const locked = isLockedPhase;
      const pulse = locked ? 0.5 + 0.5 * Math.sin(now / 120) : 0;

      ctx.save();
      ctx.globalAlpha = boxAlphaRef.current;

      // Isi transparan lembut
      ctx.fillStyle = target.kind === 'uncertain' ? 'rgba(240,163,69,0.06)' : 'rgba(107,255,143,0.07)';
      ctx.beginPath();
      roundRectPath(ctx, x, y, w, h, 12 * s);
      ctx.fill();

      // Garis tipis penuh + sudut tebal
      ctx.strokeStyle = color;
      ctx.globalAlpha = boxAlphaRef.current * 0.35;
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      roundRectPath(ctx, x, y, w, h, 12 * s);
      ctx.stroke();

      ctx.globalAlpha = boxAlphaRef.current;
      ctx.lineWidth = (locked ? 4 : 3) * s;
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = (locked ? 14 + pulse * 10 : 8) * s;
      drawCorners(ctx, x, y, w, h, Math.max(14 * s, Math.min(w, h) * 0.2), 12 * s);
      ctx.shadowBlur = 0;

      ctx.restore();

      if (target.label) {
        ctx.save();
        ctx.globalAlpha = boxAlphaRef.current;
        drawTag(ctx, target.label, x, y, color, s, vw);
        ctx.restore();
      }
    }
  }, []);

  /** Satu putaran: COCO-SSD mencari posisi benda, model plastik memeriksa benda yang sudah stabil */
  const scanFrame = useCallback(async (session: number) => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const frameScale = Math.min(1, FRAME_LONG_SIDE / Math.max(vw, vh));
    if (!procCanvasRef.current) procCanvasRef.current = document.createElement('canvas');
    const procCanvas = procCanvasRef.current;
    const frameW = Math.round(vw * frameScale);
    const frameH = Math.round(vh * frameScale);
    if (procCanvas.width !== frameW) procCanvas.width = frameW;
    if (procCanvas.height !== frameH) procCanvas.height = frameH;
    const procCtx = procCanvas.getContext('2d');
    if (!procCtx) return;
    procCtx.drawImage(video, 0, 0, frameW, frameH);

    const detected = await detectObjects(await createImageBitmap(procCanvas));
    if (session !== sessionRef.current) return;

    const region = getVisibleRegion(video);
    const roi = getCenterRoi(region);
    const preds = detected
      .map(p => ({
        ...p,
        class: p.class.toLowerCase(),
        bbox: p.bbox.map(v => v / frameScale) as Box,
      }))
      .filter(p => isMostlyVisible(p.bbox, region));

    const lock = lockStateRef.current;
    lock.errors = 0;

    /** Model plastik menilai satu kotak, dirata-ratakan dari beberapa margin crop */
    const classifyBox = async ([bx, by, bw, bh]: Box, padRatios: number[]) => {
      const allProbs: number[][] = [];
      for (const padRatio of padRatios) {
        const padX = bw * padRatio;
        const padY = bh * padRatio;
        const cx1 = Math.max(0, bx - padX);
        const cy1 = Math.max(0, by - padY);
        const cx2 = Math.min(vw, bx + bw + padX);
        const cy2 = Math.min(vh, by + bh + padY);
        const probs = await classifyCrop([
          cx1 * frameScale,
          cy1 * frameScale,
          (cx2 - cx1) * frameScale,
          (cy2 - cy1) * frameScale,
        ]);
        if (probs) allProbs.push(probs);
      }
      if (allProbs.length === 0) return null;
      const meanProbs = allProbs[0].map(
        (_, i) => allProbs.reduce((sum, probs) => sum + probs[i], 0) / allProbs.length
      );
      const nonPlasticProb = meanProbs[NON_PLASTIC_INDEX];
      return {
        topScore: Math.max(...meanProbs.slice(0, NON_PLASTIC_INDEX)) / Math.max(1e-6, 1 - nonPlasticProb),
        looksNonPlastic: nonPlasticProb >= NON_PLASTIC_REJECT_THRESHOLD,
      };
    };

    const acceptPlastic = (info: PlasticInfo, box: Box, isCenterFallback: boolean) => {
      setDetectedPlasticInfo(info);
      setCapturedPhoto(
        cropToDataUrl(procCanvas, box.map(v => v * frameScale) as Box)
      );
      trackedBoxRef.current = box;
      overlayTargetRef.current = { box, kind: 'locking', label: '', isCenterFallback };
      setScanCard({ status: 'detected', message: 'Buang sampah ini ke tempat sampah!' });
      playScanPing('lock');
      setPhase('identified');
    };

    const showDoubt = (message: string, box: Box | null, isCenterFallback: boolean) => {
      overlayTargetRef.current = box
        ? { box, kind: 'uncertain', label: 'Belum yakin', isCenterFallback }
        : { box: null, kind: 'none', label: '', isCenterFallback: false };
      setScanCard({ ...INITIAL_SCAN_CARD, status: 'uncertain', message });
    };

    // Sudah terkunci: cukup ikuti posisinya, tanpa memeriksa ulang jenis plastiknya
    if (phaseRef.current === 'identified') {
      if (overlayTargetRef.current.isCenterFallback) return;
      const current = trackedBoxRef.current;
      const candidates = preds.filter(
        p => (CONTAINER_COCO_CLASSES as readonly string[]).includes(p.class) && p.score >= TRACK_SCORE
      );
      const nearest = current
        ? candidates
            .map(p => ({ p, overlap: boxOverlap(p.bbox, current) }))
            .filter(item => item.overlap > 0.05)
            .sort((a, b) => b.overlap - a.overlap)[0]?.p
        : undefined;
      // Benda bisa melompat jauh saat HP lambat atau kamera digerakkan cepat
      const next =
        nearest ??
        (lock.misses >= 2 || !current
          ? candidates.filter(p => p.score >= REACQUIRE_SCORE).sort((a, b) => b.score - a.score)[0]
          : undefined);
      if (next) {
        lock.misses = 0;
        trackedBoxRef.current = next.bbox;
        overlayTargetRef.current = { box: next.bbox, kind: 'locking', label: '', isCenterFallback: false };
      } else if (++lock.misses >= LOST_FRAMES) {
        trackedBoxRef.current = null;
        overlayTargetRef.current = { box: null, kind: 'none', label: '', isCenterFallback: false };
      }
      return;
    }

    // Permintaan siswa untuk kemasan yang tidak dikenali COCO (sachet, bungkus)
    if (manualScanRef.current) {
      manualScanRef.current = false;
      const result = await classifyBox(roi, [0]);
      setManualChecking(false);
      if (session !== sessionRef.current) return;
      if (result && !result.looksNonPlastic && result.topScore >= RESIN_THRESHOLD) {
        acceptPlastic(PACKAGING_PLASTIC_INFO, roi, true);
      } else {
        showDoubt(
          result?.looksNonPlastic
            ? 'Belum terlihat seperti plastik. Pastikan seluruh benda masuk bingkai, lalu coba lagi.'
            : 'AI belum yakin. Pastikan seluruh benda masuk bingkai dan cahaya cukup, lalu coba lagi.',
          null,
          false
        );
      }
      return;
    }

    if (lock.cooldown > 0) {
      lock.cooldown--;
      return;
    }

    const candidate = preds
      .filter(p => (CONTAINER_COCO_CLASSES as readonly string[]).includes(p.class) && p.score >= LOCK_SCORE)
      .sort((a, b) => b.score - a.score)[0];

    if (!candidate) {
      if (lock.streakBox && ++lock.misses <= STREAK_GAP_FRAMES) return;
      lock.misses = 0;
      lock.streak = 0;
      lock.streakBox = null;
      overlayTargetRef.current = { box: null, kind: 'none', label: '', isCenterFallback: false };

      // Benda bukan sampah (orang, laptop, dll.) yang menutupi titik tengah bingkai
      const roiCenterX = roi[0] + roi[2] / 2;
      const roiCenterY = roi[1] + roi[3] / 2;
      const blocker = preds.find(
        p =>
          (NON_WASTE_COCO_CLASSES as readonly string[]).includes(p.class) &&
          p.score >= NON_WASTE_COCO_THRESHOLD &&
          (p.class === 'person' || p.bbox[2] * p.bbox[3] <= region.w * region.h * NON_PLASTIC_MAX_AREA_RATIO) &&
          roiCenterX >= p.bbox[0] &&
          roiCenterX <= p.bbox[0] + p.bbox[2] &&
          roiCenterY >= p.bbox[1] &&
          roiCenterY <= p.bbox[1] + p.bbox[3]
      );
      setScanCard(previous => {
        if (blocker) {
          const message = `Itu terlihat seperti ${NON_WASTE_LABELS[blocker.class]}. Arahkan kamera ke sampah plastik, ya.`;
          return previous.message === message
            ? previous
            : { ...INITIAL_SCAN_CARD, status: 'non_plastic', message };
        }
        return previous.status === 'non_plastic' ? INITIAL_SCAN_CARD : previous;
      });
      return;
    }

    // Objek harus bertahan di tempat yang sama selama beberapa frame berturut-turut
    lock.misses = 0;
    const kind = objectKind(candidate.class, candidate.bbox);
    const sameObject = lock.streakBox && boxOverlap(lock.streakBox, candidate.bbox) > 0.2;
    lock.streak = sameObject ? lock.streak + 1 : 1;
    lock.kinds = sameObject ? [...lock.kinds, kind] : [kind];
    lock.streakBox = candidate.bbox;
    overlayTargetRef.current = { box: candidate.bbox, kind: 'uncertain', label: 'Tahan sebentar…', isCenterFallback: false };
    if (lock.streak < STABLE_FRAMES) return;

    lock.streak = 0;
    lock.streakBox = null;
    const result = await classifyBox(candidate.bbox, CANDIDATE_PAD_RATIOS);
    if (session !== sessionRef.current) return;
    if (result && !result.looksNonPlastic && result.topScore >= RESIN_THRESHOLD) {
      acceptPlastic(OBJECT_PLASTIC_INFO[mostCommon(lock.kinds)], candidate.bbox, false);
      return;
    }
    // Pesannya sengaja lunak: model kadang keliru menolak plastik sungguhan
    lock.cooldown = RECHECK_AFTER_FRAMES;
    showDoubt(
      result?.looksNonPlastic
        ? 'Belum terlihat seperti plastik. Coba dari sisi lain, dengan cahaya lebih terang.'
        : REJECTED_MATERIAL_STATUS,
      candidate.bbox,
      false
    );
  }, [playScanPing, setPhase]);

  /** Loop deteksi di latar belakang; berhenti saat siswa pindah ke langkah membuang sampah */
  const runLiveScan = useCallback(async (session: number) => {
    while (
      activeRef.current &&
      session === sessionRef.current &&
      (phaseRef.current === 'scanning' || phaseRef.current === 'identified')
    ) {
      const started = performance.now();
      if (!document.hidden) {
        try {
          await scanFrame(session);
        } catch (err) {
          console.warn('Deteksi gagal pada frame ini:', err);
          if (++lockStateRef.current.errors >= 3 && session === sessionRef.current) {
            stopCamera();
            setCameraError('AI scanner berhenti bekerja. Silakan coba lagi.');
            setPhase('init');
            return;
          }
        }
      }
      const wait = Math.max(0, DETECT_INTERVAL_MS - (performance.now() - started));
      await new Promise(resolve => setTimeout(resolve, wait));
    }
    releaseFrame().catch(() => {});
  }, [scanFrame, setPhase, stopCamera]);

  // Tombol pindai manual muncul bila benda belum juga dikenali
  useEffect(() => {
    if (phase !== 'scanning' || modelLoading) return;
    const timer = window.setTimeout(() => setShowManualScan(true), MANUAL_SCAN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [phase, modelLoading]);

  function requestManualScan() {
    manualScanRef.current = true;
    setManualChecking(true);
  }

  /** Mencari tempat sampah selama siswa berjalan; kotak hanya ditampilkan bila posisinya stabil */
  const runBinScan = useCallback(async (session: number) => {
    let hits = 0;
    let misses = 0;
    let errors = 0;
    let lastBox: Box | null = null;
    while (activeRef.current && session === sessionRef.current && phaseRef.current === 'findBin') {
      const started = performance.now();
      const video = videoRef.current;
      if (!document.hidden && video && video.readyState >= 2) {
        try {
          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 480;
          const frameScale = Math.min(1, FRAME_LONG_SIDE / Math.max(vw, vh));
          if (!procCanvasRef.current) procCanvasRef.current = document.createElement('canvas');
          const frame = procCanvasRef.current;
          const frameW = Math.round(vw * frameScale);
          const frameH = Math.round(vh * frameScale);
          if (frame.width !== frameW) frame.width = frameW;
          if (frame.height !== frameH) frame.height = frameH;
          frame.getContext('2d')?.drawImage(video, 0, 0, frameW, frameH);

          const result = await detectBin(await createImageBitmap(frame));
          if (session !== sessionRef.current || phaseRef.current !== 'findBin') return;
          errors = 0;

          const found = result && result.score >= BIN_SCORE ? (result.bbox.map(v => v / frameScale) as Box) : null;
          const box = found && isMostlyVisible(found, getVisibleRegion(video)) ? found : null;
          if (box) {
            hits = lastBox && boxOverlap(lastBox, box) > 0.1 ? hits + 1 : 1;
            misses = 0;
            lastBox = box;
            if (hits >= BIN_STABLE_FRAMES) {
              trackedBoxRef.current = box;
              setBinVisible(true);
              setBinSeen(true);
            }
          } else if (++misses >= BIN_LOST_FRAMES) {
            hits = 0;
            lastBox = null;
            trackedBoxRef.current = null;
            setBinVisible(false);
          }
        } catch (err) {
          console.warn('Deteksi tempat sampah gagal pada frame ini:', err);
          if (++errors >= 3) {
            setBinFallback(true);
            return;
          }
        }
      }
      const wait = Math.max(0, BIN_INTERVAL_MS - (performance.now() - started));
      await new Promise(resolve => setTimeout(resolve, wait));
    }
  }, []);

  function goFindBin() {
    const session = sessionRef.current;
    trackedBoxRef.current = null;
    overlayTargetRef.current = { box: null, kind: 'none', label: '', isCenterFallback: false };
    setBinSeen(false);
    setBinVisible(false);
    setBinFallback(false);
    setPhase('findBin');
    startBinDetector()
      .then(() => runBinScan(session))
      .catch(err => {
        // Tanpa detektor siswa tetap bisa lanjut lewat tombol konfirmasi
        console.warn('Detektor tempat sampah gagal dimuat:', err);
        if (session === sessionRef.current) setBinFallback(true);
      });
  }

  // Tombol cadangan muncul bila tempat sampah tidak terdeteksi cukup lama
  useEffect(() => {
    if (phase !== 'findBin' || binSeen) return;
    const timer = window.setTimeout(() => setBinFallback(true), BIN_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [phase, binSeen]);

  function confirmDisposed() {
    setPlasticDisposal({
      plasticName: detectedPlasticInfo.name,
      resinClass: detectedPlasticInfo.resinClass ?? null,
      disposedAt: new Date().toISOString(),
      binDetected: binSeen,
    });
    playScanPing('lock');
    setPhase('disposed');
    lockTimeoutRef.current = window.setTimeout(() => {
      stopCamera();
      setPhase('pemantik');
    }, 2600);
  }

  async function startCamera() {
    stopCamera();
    const session = ++sessionRef.current;
    setCameraError(null);
    setPhase('scanning');
    setModelLoading(true);
    manualScanRef.current = false;
    setManualChecking(false);
    setShowManualScan(false);
    setBinSeen(false);
    setBinVisible(false);
    setBinFallback(false);
    trackedBoxRef.current = null;
    lockStateRef.current = { streak: 0, streakBox: null, kinds: [], cooldown: 0, misses: 0, errors: 0 };
    staticOverlayKeyRef.current = null;
    overlayTargetRef.current = { box: null, kind: 'none', label: '', isCenterFallback: false };
    displayBoxRef.current = null;
    boxAlphaRef.current = 0;
    setScanCard(INITIAL_SCAN_CARD);
    activeRef.current = true;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        const unsupported = new Error('Kamera tidak tersedia');
        unsupported.name = 'NotFoundError';
        throw unsupported;
      }

      // Kamera & model dimuat paralel; video ditampilkan secepatnya selagi model masih dimuat
      const modelsPromise = startScannerAI();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
      });

      if (session !== sessionRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      const renderLoop = () => {
        if (!activeRef.current || session !== sessionRef.current) return;
        drawOverlayFrame();
        renderRafRef.current = requestAnimationFrame(renderLoop);
      };
      renderRafRef.current = requestAnimationFrame(renderLoop);

      await modelsPromise;
      if (session !== sessionRef.current) return;
      setModelLoading(false);
      runLiveScan(session);
    } catch (err: unknown) {
      if (session !== sessionRef.current) return;
      stopCamera();
      setCameraError(cameraErrorMessage(err));
      setModelLoading(false);
    }
  }

  // Hasil -> scan ulang -> layar pembuka -> peta
  useStageBack(() => {
    if (phase === 'pemantik' || phase === 'identified' || phase === 'findBin' || phase === 'disposed') {
      startCamera();
      return true;
    }
    if (phase === 'scanning' || cameraError) {
      stopCamera();
      setCameraError(null);
      setModelLoading(false);
      setPhase('init');
      return true;
    }
    return false;
  });

  function proceed() {
    completeStage(1);
    setShowCompletionModal(true);
  }

  function selectSimulatedSample(sample: PlasticInfo) {
    stopCamera();
    setCameraError(null);
    setCapturedPhoto(null);
    setDetectedPlasticInfo(sample);
    setPhase('pemantik');
  }

  const labelDetails = useMemo(
    () => [
      detectedPlasticInfo.polymer,
      `Terurai ${detectedPlasticInfo.decompositionTime.toLowerCase()} (perkiraan)`,
    ],
    [detectedPlasticInfo]
  );

  const statusTone =
    phase === 'identified' || phase === 'disposed' || (phase === 'findBin' && binVisible)
      ? 'lock'
      : phase === 'findBin'
      ? 'idle'
      : scanCard.status === 'uncertain'
      ? 'warn'
      : scanCard.status === 'non_plastic'
      ? 'error'
      : 'idle';

  const statusLabel =
    phase === 'identified'
      ? 'Terlihat seperti plastik'
      : phase === 'findBin'
      ? binVisible
        ? 'Tempat sampah ditemukan'
        : 'Cari tempat sampah'
      : phase === 'disposed'
      ? 'Terima kasih!'
      : modelLoading
      ? 'Menyiapkan AI'
      : manualChecking
      ? 'Memeriksa kemasan'
      : scanCard.status === 'non_plastic'
      ? 'Bukan sampah plastik'
      : scanCard.status === 'uncertain'
      ? 'AI belum yakin'
      : 'Mencari sampah plastik';

  return (
    <div className="relative w-full overflow-hidden h-[100dvh] bg-[#06293b]">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
      />
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
      />

      {/* Intro Phase */}
      <AnimatePresence>
        {phase === 'init' && !cameraError && (
          <StageIntro
            title="Tahap 1: Scanner Plastik"
            description="Cari sampah plastik di sekitarmu, seperti botol atau gelas. Arahkan kamera, kenali jenis plastiknya, lalu buang ke tempat sampah."
            icon="qr_code_scanner"
            layout="centered"
            actionText="Buka Kamera"
            onStart={startCamera}
          />
        )}
      </AnimatePresence>

      {/* Error Access */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f7f9fb] gap-5 p-8 z-30">
          <span className="material-symbols-outlined text-[#ba1a1a] text-6xl">no_photography</span>
          <p className="text-[#3e4850] text-center text-sm leading-relaxed max-w-md font-semibold">
            {cameraError}
          </p>
          <div className="flex gap-3">
            <button
              onClick={startCamera}
              className="bg-[#006591] text-white font-bold px-6 py-3 rounded-xl shadow-md"
            >
              Coba Lagi
            </button>
            <button
              onClick={() => selectSimulatedSample(OBJECT_PLASTIC_INFO.bottle)}
              className="bg-[#f0a345] text-[#3b2313] font-bold px-6 py-3 rounded-xl shadow-md"
            >
              Lanjut Simulasi
            </button>
          </div>
        </div>
      )}

      {/* Label dan instruksi 3D yang menempel pada sampah plastik */}
      {phase === 'identified' && (
        <AnchoredLabelAR
          key="plastic"
          videoRef={videoRef}
          boxRef={trackedBoxRef}
          title={detectedPlasticInfo.name}
          details={labelDetails}
          instruction="Buang sampah ini ke tempat sampah!"
          onUnavailable={markArUnavailable}
        />
      )}

      {/* Cincin dan petunjuk 3D yang menempel pada tempat sampah, lalu konfeti perayaan */}
      {((phase === 'findBin' && binSeen) || phase === 'disposed') && (
        <AnchoredLabelAR
          key="bin"
          videoRef={videoRef}
          boxRef={trackedBoxRef}
          title="Tempat sampah ditemukan!"
          details={BIN_LABEL_DETAILS}
          instruction="Masukkan sampahmu di sini"
          celebrate={phase === 'disposed'}
          onUnavailable={markArUnavailable}
        />
      )}

      {/* Real-time Scanning HUD */}
      {(phase === 'scanning' || phase === 'identified' || phase === 'findBin' || phase === 'disposed') && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* Vignette halus agar HUD & bingkai lebih terbaca di atas video */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(6,41,59,0.55)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#06293b]/80 to-transparent" />

          {/* Overlay memuat model AI (kamera sudah tampil di belakangnya) */}
          <AnimatePresence>
            {modelLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#06293b]/60 backdrop-blur-[2px]"
              >
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-white/15" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#6bff8f] animate-spin" />
                  <span className="absolute inset-0 flex items-center justify-center material-symbols-outlined text-[#6bff8f] text-2xl">
                    neurology
                  </span>
                </div>
                <p className="text-white font-bold text-sm font-[family-name:var(--font-outfit)]">
                  Menyiapkan kamera &amp; model AI…
                </p>
                <p className="text-white/60 text-xs">Hanya perlu beberapa detik</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tanda sukses setelah siswa membuang sampah */}
          <AnimatePresence>
            {phase === 'disposed' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(107,255,143,0.28),transparent_65%)]"
              >
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                  className="w-20 h-20 rounded-full bg-[#006e2f]/90 border-2 border-[#6bff8f] shadow-[0_0_40px_rgba(107,255,143,0.6)] flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[#6bff8f] text-5xl">check</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pill status ringkas — diletakkan di bawah header kayu (h-28) */}
          <div className="absolute top-[7.5rem] inset-x-0 flex justify-center px-4">
            <div
              className={`px-3.5 py-1.5 rounded-full md:backdrop-blur-md border shadow-lg flex items-center gap-2 transition-colors duration-300 ${
                statusTone === 'lock'
                  ? 'bg-[#006e2f]/85 border-[#6bff8f]/60 text-[#6bff8f]'
                  : statusTone === 'warn'
                  ? 'bg-[#3b2313]/80 border-[#f0a345]/60 text-[#f0a345]'
                  : statusTone === 'error'
                  ? 'bg-[#410002]/80 border-[#ff8a80]/60 text-[#ffb4ab]'
                  : 'bg-[#083b54]/80 border-white/20 text-white/90'
              }`}
            >
              <span className="relative flex w-2 h-2 shrink-0">
                {(statusTone === 'lock' || statusTone === 'idle') && (
                  <span className="absolute inline-flex w-full h-full rounded-full bg-current opacity-60 animate-ping" />
                )}
                <span className="relative inline-flex w-2 h-2 rounded-full bg-current" />
              </span>
              <span className="text-xs font-bold font-[family-name:var(--font-outfit)]">
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Kartu informasi bawah */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-auto">
            <div className="w-[min(100%,440px)] bg-[#083b54]/95 md:backdrop-blur-md border border-white/15 rounded-2xl p-3.5 shadow-2xl text-white">
              {/* Pesan panduan utama */}
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-[15px] font-semibold leading-snug min-w-0 ${
                    statusTone === 'warn'
                      ? 'text-[#ffd7a8]'
                      : statusTone === 'error'
                      ? 'text-[#ffb4ab]'
                      : 'text-white'
                  }`}
                >
                  {phase === 'findBin'
                    ? binVisible
                      ? 'Masukkan sampahmu ke tempat sampah, lalu tekan tombol di bawah.'
                      : 'Bawa sampahmu ke tempat sampah terdekat, lalu arahkan kamera ke sana. Perhatikan jalanmu, ya!'
                    : phase === 'disposed'
                    ? 'Terima kasih sudah membuang sampah pada tempatnya!'
                    : modelLoading
                    ? 'Kamera aktif. Model AI sedang dimuat…'
                    : manualChecking
                    ? 'AI sedang memeriksa kemasan…'
                    : scanCard.message}
                </p>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {phase === 'identified' ? (
                  <motion.div
                    key={`info-${detectedPlasticInfo.name}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-start gap-3 mt-2.5 pt-2.5 border-t border-white/10"
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#006591]/60 border border-[#6bff8f]/30 flex flex-col items-center justify-center shrink-0 shadow-inner">
                      {detectedPlasticInfo.resinClass && (
                        <span className="text-[10px] font-black font-[family-name:var(--font-mono)] text-[#6bff8f] leading-none">
                          {detectedPlasticInfo.resinClass.split('-')[0]}
                        </span>
                      )}
                      <span className="material-symbols-outlined text-lg text-[#6bff8f] leading-none">
                        recycling
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div>
                        <p className="font-[family-name:var(--font-outfit)] font-bold text-[15px] leading-snug">
                          {detectedPlasticInfo.name}
                        </p>
                        <p className="text-[13px] font-semibold text-[#6bff8f] mt-0.5">
                          {detectedPlasticInfo.polymer}
                        </p>
                        <p className="text-[13px] font-semibold text-[#f0a345]">
                          Terurai {detectedPlasticInfo.decompositionTime.toLowerCase()} (perkiraan)
                        </p>
                        <p className="text-xs text-white/70 mt-0.5 [@media(max-height:700px)]:hidden">
                          Pastikan lewat kode segitiga di kemasan.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {arUnavailable && (phase === 'identified' || phase === 'findBin') && (
                <p className="mt-2 text-xs text-white/70">
                  Tampilan 3D belum didukung di HP ini, tapi kamu tetap bisa lanjut.
                </p>
              )}

            </div>

            {/* Pindai manual untuk kemasan yang tidak dikenali otomatis */}
            {phase === 'scanning' && !modelLoading && showManualScan && (
              <button
                onClick={requestManualScan}
                disabled={manualChecking}
                className="mt-3 w-[min(100%,440px)] min-h-12 flex items-center justify-center gap-2 bg-white/95 disabled:opacity-60 text-[#083b54] text-[15px] font-bold rounded-2xl shadow-lg transition-transform active:scale-95 font-[family-name:var(--font-outfit)]"
              >
                <span className="material-symbols-outlined text-xl">center_focus_strong</span>
                {manualChecking ? 'Memeriksa…' : 'Belum terdeteksi? Periksa benda di tengah'}
              </button>
            )}

            {phase === 'identified' && (
              <button
                onClick={goFindBin}
                className="mt-3 w-[min(100%,440px)] min-h-14 flex items-center justify-center gap-2 bg-[#6bff8f] hover:bg-[#4ee876] text-[#06293b] text-lg font-extrabold rounded-2xl shadow-lg transition-transform active:scale-95 font-[family-name:var(--font-outfit)]"
              >
                <span className="material-symbols-outlined text-2xl">delete</span>
                Saya akan membuangnya
              </button>
            )}

            {phase === 'findBin' && !binSeen && binFallback && (
              <button
                onClick={confirmDisposed}
                className="mt-3 w-[min(100%,440px)] min-h-12 flex items-center justify-center gap-2 bg-white/95 text-[#083b54] text-[15px] font-bold rounded-2xl shadow-lg transition-transform active:scale-95 font-[family-name:var(--font-outfit)]"
              >
                Tidak terdeteksi? Saya sudah membuangnya
              </button>
            )}

            {phase === 'findBin' && binSeen && (
              <button
                onClick={confirmDisposed}
                className="mt-3 w-[min(100%,440px)] min-h-14 flex items-center justify-center gap-2 bg-[#6bff8f] hover:bg-[#4ee876] text-[#06293b] text-lg font-extrabold rounded-2xl shadow-lg transition-transform active:scale-95 font-[family-name:var(--font-outfit)]"
              >
                <span className="material-symbols-outlined text-2xl">check_circle</span>
                Sudah dibuang
              </button>
            )}

            {/* Tautan simulasi untuk demo tanpa sampel plastik fisik */}
            {phase === 'scanning' && (
              <button
                onClick={() => selectSimulatedSample(OBJECT_PLASTIC_INFO.bottle)}
                className="mt-1 min-h-11 px-3 text-white/80 hover:text-white text-[13px] underline font-medium transition-colors"
              >
                Tidak ada sampah plastik? Pakai contoh botol
              </button>
            )}
          </div>
        </div>
      )}


      {/* Kartu hasil: muat satu layar HP; kotak jawaban mengisi sisa ruang. Gulir hanya saat keyboard terbuka. */}
      {phase === 'pemantik' && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-6">
          <div className="bg-white w-full max-w-md h-[100dvh] sm:h-[min(640px,92dvh)] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-2 flex flex-col">
              {/* Hasil */}
              <div className="flex items-center gap-3 shrink-0">
                {capturedPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL hasil potret kamera
                  <img
                    src={capturedPhoto}
                    alt={`Foto ${detectedPlasticInfo.name} hasil scan`}
                    className="w-16 h-16 [@media(min-height:720px)]:w-24 [@media(min-height:720px)]:h-24 object-cover rounded-xl border-2 border-[#006e2f]/30 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 [@media(min-height:720px)]:w-24 [@media(min-height:720px)]:h-24 bg-[#6bff8f]/20 border border-[#006e2f]/30 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#006e2f] text-4xl">recycling</span>
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="font-[family-name:var(--font-outfit)] text-xl [@media(min-height:720px)]:text-2xl font-bold leading-tight text-[#083b54]">
                    {capturedPhoto ? 'Sampahmu sudah dibuang!' : 'Kamu menemukan plastik!'}
                  </h2>
                  <p className="mt-0.5 text-sm font-semibold leading-snug text-[#006e2f]">
                    {detectedPlasticInfo.name}
                  </p>
                </div>
              </div>

              {/* Dua fakta utama */}
              <div className="grid grid-cols-2 gap-2 mt-2.5 [@media(min-height:720px)]:mt-4 shrink-0">
                <div className="bg-[#f2f8fa] rounded-xl px-2 py-1.5 [@media(min-height:720px)]:py-3 text-center">
                  <p className="text-xs text-[#4b5563]">Jenis polimer</p>
                  <p className="text-sm font-bold text-[#006591] leading-snug text-balance font-[family-name:var(--font-outfit)]">
                    {detectedPlasticInfo.polymer}
                  </p>
                </div>
                <div className="bg-[#fdf1ef] rounded-xl px-2 py-1.5 [@media(min-height:720px)]:py-3 text-center">
                  <p className="text-xs text-[#4b5563]">Perkiraan lama terurai</p>
                  <p className="text-sm font-bold text-[#ba1a1a] leading-snug text-balance font-[family-name:var(--font-outfit)]">
                    {detectedPlasticInfo.decompositionTime}
                  </p>
                </div>
              </div>

              <p className="mt-2 [@media(min-height:720px)]:mt-4 text-sm [@media(min-height:720px)]:text-[15px] text-[#3e4850] leading-snug shrink-0">
                {detectedPlasticInfo.description}
              </p>
              <p className="mt-1 text-xs text-[#6e7881] leading-snug shrink-0">
                Angka perkiraan. Untuk memastikan jenisnya, cari kode segitiga di kemasan.
              </p>

              {/* Pertanyaan */}
              <div className="mt-2.5 pt-2.5 [@media(min-height:720px)]:mt-4 [@media(min-height:720px)]:pt-4 border-t border-[#e4eff4] flex-1 min-h-[9.5rem] flex flex-col">
                <p className="text-sm [@media(min-height:720px)]:text-[15px] font-semibold text-[#083b54] leading-snug shrink-0">
                  Plastik itu benda padat. Kok bisa masuk dan menetap di usus kita, ya?
                </p>
                <label htmlFor="hipotesis" className="mt-1.5 text-sm text-[#3e4850] shrink-0">
                  <span className="font-bold text-[#083b54]">Apa tebakanmu?</span>{' '}
                  {showAnswerHint ? (
                    <span role="alert" className="font-semibold text-[#ba1a1a]">
                      Tulis dulu, ya.
                    </span>
                  ) : (
                    <span className="text-[#6e7881]">Tidak harus benar.</span>
                  )}
                </label>
                <textarea
                  id="hipotesis"
                  ref={answerRef}
                  value={lkpdAnswers.lkpdStep1}
                  onChange={e => {
                    setLkpdAnswer('lkpdStep1', e.target.value);
                    setShowAnswerHint(false);
                  }}
                  placeholder="Menurut saya, plastik bisa masuk ke tubuh karena..."
                  aria-invalid={showAnswerHint}
                  className={`mt-1 w-full flex-1 min-h-16 max-h-56 p-2.5 bg-[#f8fafc] border-2 rounded-xl text-base leading-snug outline-none resize-none transition-colors focus:border-[#006591] ${
                    showAnswerHint ? 'border-[#ba1a1a]' : 'border-[#e4eff4]'
                  }`}
                />
              </div>
            </div>

            <div className="shrink-0 px-4 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] border-t border-[#e4eff4] bg-white flex gap-2">
              <button
                onClick={() => {
                  setShowAnswerHint(false);
                  startCamera();
                }}
                className="min-h-12 px-3 bg-slate-100 text-[#006591] font-semibold rounded-xl text-sm flex items-center justify-center gap-1 shrink-0 font-[family-name:var(--font-outfit)]"
              >
                <span className="material-symbols-outlined text-lg">refresh</span> Scan ulang
              </button>
              <button
                onClick={() => {
                  if (!lkpdAnswers.lkpdStep1.trim()) {
                    setShowAnswerHint(true);
                    answerRef.current?.focus();
                    return;
                  }
                  proceed();
                }}
                className="flex-1 min-h-12 bg-[#006591] hover:bg-[#004c6e] text-white font-bold rounded-xl text-base transition-transform active:scale-95 flex items-center justify-center gap-1.5 font-[family-name:var(--font-outfit)]"
              >
                Lanjutkan <span className="material-symbols-outlined text-xl">arrow_forward</span>
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

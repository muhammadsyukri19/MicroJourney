'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useJourneyStore } from '@/lib/journeyStore';
import StageIntro from '@/components/stages/StageIntro';
import StageCompletionModal from '@/components/ui/StageCompletionModal';
import { AnimatePresence, motion } from 'framer-motion';

type Phase = 'init' | 'scanning' | 'detected' | 'pemantik';

export interface PlasticInfo {
  name: string;
  polymer: string;
  code: string;
  decompositionTime: string;
  example: string;
  description: string;
  resinClass?: string;
  isMinorityValidationNeeded?: boolean;
}

export const PLASTIC_DATA: Record<string, PlasticInfo> = {
  bottle: {
    name: 'Botol Plastik',
    polymer: 'Polietilena Tereftalat (PET / PETE)',
    code: 'KODE 1 · PET',
    decompositionTime: '450 Tahun',
    example: 'Botol air mineral, botol minuman kemasan, botol minyak',
    description:
      'Kalau sering kena sinar matahari, plastik ini makin rapuh dan melepas serpihan sangat kecil yang disebut mikroplastik.',
    resinClass: '1-PET',
    isMinorityValidationNeeded: false,
  },
  cup: {
    name: 'Gelas / Cup Plastik',
    polymer: 'Polipropilena (PP) / Polistirena (PS)',
    code: 'KODE 5 (PP) / KODE 6 (PS)',
    decompositionTime: '20 – 450 Tahun',
    example: 'Cup minuman boba/kopi, gelas air mineral sekali pakai',
    description:
      'Plastiknya tipis dan cepat rapuh saat terjemur, lalu mudah pecah menjadi serpihan sangat kecil.',
    resinClass: '5-PP',
    isMinorityValidationNeeded: false,
  },
  bowl: {
    name: 'Mangkuk / Wadah Plastik',
    polymer: 'Polipropilena (PP) / HDPE',
    code: 'KODE 5 (PP) / KODE 2 (HDPE)',
    decompositionTime: '100 – 450 Tahun',
    example: 'Mangkuk mie instan, wadah thinwall takeaway, kotak bekal',
    description:
      'Sering kena panas dan minyak. Lama-lama plastiknya rusak dan zat kimia di dalamnya bisa ikut terlepas.',
    resinClass: '5-PP',
    isMinorityValidationNeeded: false,
  },
  'wine glass': {
    name: 'Gelas Mika / Wadah Bening',
    polymer: 'Polikarbonat (PC) / Akrilik (PMMA)',
    code: 'KODE 7 · LAINNYA (OTHER)',
    decompositionTime: '400 – 500 Tahun',
    example: 'Gelas mika bening, botol tumbler keras, toples tebal',
    description:
      'Plastik keras ini sangat lama terurai dan bisa melepaskan zat kimia bernama bisfenol ke dalam air.',
    resinClass: '7-OTHER',
    isMinorityValidationNeeded: true,
  },
  vase: {
    name: 'Wadah / Botol Plastik Keras',
    polymer: 'Polivinil Klorida (PVC) / Polietilena',
    code: 'KODE 3 (PVC) / KODE 7',
    decompositionTime: '500 Tahun',
    example: 'Wadah silinder tebal, botol bahan kimia, vas sintetis',
    description:
      'Mengandung klorin dan zat pelentur yang sulit hilang di alam dan beracun bagi makhluk hidup di air.',
    resinClass: '3-PVC',
    isMinorityValidationNeeded: true,
  },
};

export const RESIN_PLASTIC_DATA: Record<string, PlasticInfo> = {
  '1-PET': {
    name: 'Kemasan Plastik PET',
    polymer: 'Polietilena Tereftalat (PET / PETE)',
    code: 'KODE 1 · PET / PETE',
    decompositionTime: '450 Tahun',
    example: 'Botol air mineral bening, botol minuman ringan, kemasan minyak goreng',
    description:
      'Kalau sering terjemur atau dipakai berulang, plastik ini melepas serpihan sangat kecil yang disebut mikroplastik.',
    resinClass: '1-PET',
    isMinorityValidationNeeded: false,
  },
  '2-HDPE': {
    name: 'Wadah Plastik HDPE',
    polymer: 'Polietilena Densitas Tinggi (HDPE)',
    code: 'KODE 2 · HDPE',
    decompositionTime: '100 – 500 Tahun',
    example: 'Botol susu buram, botol sampo/deterjen, jeriken plastik tebal',
    description:
      'Lebih tahan panas daripada PET, tapi kalau terus tergesek dan lapuk tetap pecah menjadi mikroplastik di perairan.',
    resinClass: '2-HDPE',
    isMinorityValidationNeeded: false,
  },
  '3-PVC': {
    name: 'Material Plastik PVC',
    polymer: 'Polivinil Klorida (PVC / V)',
    code: 'KODE 3 · PVC / V',
    decompositionTime: '500+ Tahun',
    example: 'Pipa plastik, blister kemasan obat kaku, lapisan pembungkus tertentu',
    description:
      'Mengandung klorin dan zat pelentur yang bisa terlepas dan berbahaya bagi makhluk hidup.',
    resinClass: '3-PVC',
    isMinorityValidationNeeded: true,
  },
  '4-LDPE': {
    name: 'Plastik Fleksibel LDPE',
    polymer: 'Polietilena Densitas Rendah (LDPE)',
    code: 'KODE 4 · LDPE',
    decompositionTime: '500 – 1000 Tahun',
    example: 'Kantong kresek fleksibel, plastik pembungkus, botol pencet fleksibel',
    description:
      'Tipis dan lentur, jadi mudah robek menjadi lembaran sangat kecil yang disebut mikroplastik.',
    resinClass: '4-LDPE',
    isMinorityValidationNeeded: false,
  },
  '5-PP': {
    name: 'Kemasan Plastik PP',
    polymer: 'Polipropilena (PP)',
    code: 'KODE 5 · PP',
    decompositionTime: '20 – 300 Tahun',
    example: 'Gelas cup minuman, bungkus makanan ringan/keripik, kotak makan thinwall',
    description:
      'Makin rapuh kalau terus kena sinar matahari, dan bisa melepas mikroplastik saat tergesek atau kena air panas.',
    resinClass: '5-PP',
    isMinorityValidationNeeded: false,
  },
  '6-PS': {
    name: 'Kemasan Polistirena (PS)',
    polymer: 'Polistirena (Styrofoam / PS Kaku)',
    code: 'KODE 6 · PS',
    decompositionTime: '500+ Tahun',
    example: 'Wadah busa styrofoam, gelas kopi busa, sendok garpu plastik getas',
    description:
      'Sangat mudah hancur menjadi ribuan butiran kecil yang mengapung dan bisa termakan hewan laut.',
    resinClass: '6-PS',
    isMinorityValidationNeeded: true,
  },
  '7-OTHER': {
    name: 'Plastik Multilayer / Lainnya',
    polymer: 'Polimer Lainnya (Polikarbonat / Multilayer)',
    code: 'KODE 7 · OTHER',
    decompositionTime: '400 – 500 Tahun',
    example: 'Botol minum keras polikarbonat, galon tertentu, kemasan sachet berlapis',
    description:
      'Sulit didaur ulang, dan beberapa jenisnya bisa melepaskan zat kimia bernama bisfenol saat mulai rusak.',
    resinClass: '7-OTHER',
    isMinorityValidationNeeded: true,
  },
};

export function getPlasticInfo(className: string): PlasticInfo {
  const trimmed = className.trim();
  if (RESIN_PLASTIC_DATA[trimmed.toUpperCase()]) {
    return RESIN_PLASTIC_DATA[trimmed.toUpperCase()];
  }
  const key = trimmed.toLowerCase();
  if (PLASTIC_DATA[key]) {
    return PLASTIC_DATA[key];
  }
  return {
    name: 'Sampah Plastik Kemasan',
    polymer: 'Polimer Campuran Sintetis (Multilayer)',
    code: 'KODE 7 · CAMPURAN',
    decompositionTime: '200 – 450 Tahun',
    example: 'Kemasan sachet makanan ringan, kemasan plastik berlapis',
    description:
      'Terdiri dari beberapa lapisan plastik, jadi sulit didaur ulang dan mudah hancur menjadi mikroplastik di alam.',
    resinClass: '7-OTHER',
    isMinorityValidationNeeded: true,
  };
}

// Kandidat wadah target COCO-SSD
const AUTO_COCO_CLASSES = ['bottle', 'cup', 'bowl'] as const;
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
const RESIN_CLASSES = [
  '1-PET',
  '2-HDPE',
  '3-PVC',
  '4-LDPE',
  '5-PP',
  '6-PS',
  '7-OTHER',
] as const;

const MINORITY_CLASSES = ['3-PVC', '6-PS', '7-OTHER'] as const;

// Ambang batas deteksi & klasifikasi
const COCO_THRESHOLD = 0.4;
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

const PRODUCTION_RESIN_MODEL_URL = '/models/plastic/model.json';
const PRODUCTION_COCO_MODEL_URL = '/models/coco-ssd/model.json';

// Faktor interpolasi posisi bingkai per frame render (0..1, makin besar makin responsif)
const BOX_LERP = 0.28;

const COLOR_LOCK = '#6bff8f';
const COLOR_WARN = '#f0a345';

type Box = [number, number, number, number];
type CaptureMode = 'live' | 'analyzing' | 'result';

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
  cocoLabel: string;
  resinClass: string | null;
  confidence: number | null;
  isMinority: boolean;
  message: string;
}

const INITIAL_SCAN_CARD: ScanFeedbackState = {
  status: 'scanning',
  cocoLabel: 'Mencari objek...',
  resinClass: null,
  confidence: null,
  isMinority: false,
  message: 'Arahkan kamera ke sampah plastik sampai masuk bingkai, lalu tekan Scan.',
};

// Singleton cache & preload promise di level modul agar model hanya dimuat 1x dan instan saat dibuka kembali
let cachedTfModule: typeof import('@tensorflow/tfjs') | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedCocoModel: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedResinModel: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let preloadPromise: Promise<{ tf: any; cocoModel: any; resinModel: any }> | null = null;

async function loadModelsAsync() {
  if (cachedCocoModel && cachedResinModel && cachedTfModule) {
    return {
      tf: cachedTfModule,
      cocoModel: cachedCocoModel,
      resinModel: cachedResinModel,
    };
  }

  const [tfModule, cocoSsdModule] = await Promise.all([
    import('@tensorflow/tfjs'),
    import('@tensorflow-models/coco-ssd'),
  ]);

  await tfModule.ready();
  cachedTfModule = tfModule;

  // Muat COCO-SSD dan Resin MobileNetV2 secara paralel
  const loadCocoPromise = (async () => {
    if (cachedCocoModel) return cachedCocoModel;
    try {
      const headCheck = await fetch(PRODUCTION_COCO_MODEL_URL, { method: 'HEAD' });
      if (headCheck.ok) {
        return await cocoSsdModule.load({
          base: 'lite_mobilenet_v2',
          modelUrl: PRODUCTION_COCO_MODEL_URL,
        });
      }
    } catch {
      // Fallback ke model default bila HEAD gagal
    }
    return await cocoSsdModule.load({ base: 'lite_mobilenet_v2' });
  })();

  const loadResinPromise = (async () => {
    if (cachedResinModel) return cachedResinModel;
    const loadedResin = await tfModule.loadGraphModel(PRODUCTION_RESIN_MODEL_URL);
    // Warmup tensor 1 pass (batch 2 = crop + versi cermin, sama seperti saat analisis foto)
    const warmIn = tfModule.zeros([2, 224, 224, 3], 'float32');
    const warmOut = loadedResin.predict(warmIn) as import('@tensorflow/tfjs').Tensor;
    await warmOut.data();
    warmIn.dispose();
    warmOut.dispose();
    return loadedResin;
  })();

  const [cocoModel, resinModel] = await Promise.all([loadCocoPromise, loadResinPromise]);
  // Warmup COCO-SSD agar tombol Scan pertama tidak menunggu kompilasi shader
  const warmFrame = tfModule.zeros([300, 300, 3], 'int32') as import('@tensorflow/tfjs').Tensor3D;
  await cocoModel.detect(warmFrame);
  warmFrame.dispose();
  cachedCocoModel = cocoModel;
  cachedResinModel = resinModel;

  return {
    tf: cachedTfModule,
    cocoModel: cachedCocoModel,
    resinModel: cachedResinModel,
  };
}

function preloadModels() {
  if (!preloadPromise) {
    preloadPromise = loadModelsAsync().catch(err => {
      console.warn('Preload model AI latar belakang error:', err);
      preloadPromise = null;
      throw err;
    });
  }
  return preloadPromise;
}

export default function Tahap1() {
  const { completeStage, lkpdAnswers, setLkpdAnswer } = useJourneyStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const procCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const renderRafRef = useRef<number>(0);
  const activeRef = useRef(false);
  const sessionRef = useRef(0);
  const lockTimeoutRef = useRef<number | null>(null);
  const captureModeRef = useRef<CaptureMode>('live');
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

  // Model references
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tfRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cocoModelRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resinModelRef = useRef<any>(null);

  const [phase, setPhaseState] = useState<Phase>('init');
  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);
  const [detectedPlasticInfo, setDetectedPlasticInfo] = useState<PlasticInfo>(
    RESIN_PLASTIC_DATA['1-PET']
  );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showAnswerHint, setShowAnswerHint] = useState(false);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const [captureMode, setCaptureModeState] = useState<CaptureMode>('live');
  const setCaptureMode = useCallback((mode: CaptureMode) => {
    captureModeRef.current = mode;
    setCaptureModeState(mode);
  }, []);

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

  // Preload model AI di background saat user masuk ke Tahap 1 (di layar pembuka StageIntro)
  useEffect(() => {
    preloadModels().catch(() => {});
  }, []);

  async function ensureModelsLoaded() {
    const loaded = await preloadModels();
    tfRef.current = loaded.tf;
    cocoModelRef.current = loaded.cocoModel;
    resinModelRef.current = loaded.resinModel;
    return loaded;
  }

  // Preprocessing: crop ke canvas kecil -> resizeBilinear([224, 224]) float32 [0..255]
  // (Rescaling sudah tertanam di graph). Hanya area crop yang diunggah ke GPU, bukan full frame.
  const classifyCropTensor = useCallback(
    (
      sourceCanvas: HTMLCanvasElement,
      cropBox: Box
    ): number[] | null => {
      const tf = tfRef.current;
      const resinModel = resinModelRef.current;
      const [cx1, cy1, cw, ch] = cropBox.map(v => Math.round(v)) as Box;

      if (!tf || !resinModel || cw < 8 || ch < 8) return null;

      if (!cropCanvasRef.current) cropCanvasRef.current = document.createElement('canvas');
      const crop = cropCanvasRef.current;
      if (crop.width !== cw) crop.width = cw;
      if (crop.height !== ch) crop.height = ch;
      const cctx = crop.getContext('2d', { willReadFrequently: true });
      if (!cctx) return null;
      cctx.drawImage(sourceCanvas, cx1, cy1, cw, ch, 0, 0, cw, ch);

      // Periksa variansi luminansi di seluruh area crop (bukan hanya pojok kiri atas)
      const imgData = cctx.getImageData(0, 0, cw, ch).data;
      const step = Math.max(4, Math.floor(imgData.length / 4 / 1024)) * 4;
      let sumLum = 0;
      let sumSqLum = 0;
      let count = 0;
      for (let i = 0; i < imgData.length; i += step) {
        const lum = 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
        sumLum += lum;
        sumSqLum += lum * lum;
        count++;
      }
      if (count === 0) return null;
      const meanLum = sumLum / count;
      const varianceLum = sumSqLum / count - meanLum * meanLum;
      if (varianceLum < 1.0) return null;

      // Rata-rata prediksi crop dan versi cerminnya agar hasil satu foto lebih stabil
      return tf.tidy(() => {
        const cropTensor = tf.browser.fromPixels(crop);
        const resized = tf.image.resizeBilinear(cropTensor, [224, 224], false).toFloat();
        const batched = tf.stack([resized, tf.reverse(resized, 1)]);
        const outTensor = resinModel.predict(batched);
        return Array.from(outTensor.mean(0).dataSync()) as number[];
      });
    },
    []
  );

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
    ctx.clearRect(0, 0, vw, vh);

    const region = getVisibleRegion(video);
    const s = 1 / region.scale; // 1px layar dalam satuan px video
    const roi = getCenterRoi(region);
    const now = performance.now();
    const target = overlayTargetRef.current;
    const isLockedPhase = phaseRef.current === 'detected';

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
      if (!hasObjectBox && !isLockedPhase && captureModeRef.current === 'analyzing') {
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

  /** Memotret frame kamera saat tombol Scan ditekan, lalu: COCO-SSD -> crop -> klasifikasi resin */
  const analyzeCapture = useCallback(async () => {
    const video = videoRef.current;
    const cocoModel = cocoModelRef.current;
    if (!video || !cocoModel || video.readyState < 2) return;
    if (phaseRef.current !== 'scanning' || captureModeRef.current !== 'live') return;
    const session = sessionRef.current;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    if (!procCanvasRef.current) procCanvasRef.current = document.createElement('canvas');
    const procCanvas = procCanvasRef.current;
    if (procCanvas.width !== vw) procCanvas.width = vw;
    if (procCanvas.height !== vh) procCanvas.height = vh;
    const procCtx = procCanvas.getContext('2d');
    if (!procCtx) return;

    // Bekukan tampilan pada frame yang dipotret
    video.pause();
    procCtx.drawImage(video, 0, 0, vw, vh);
    setCaptureMode('analyzing');
    playScanPing('beep');

    const showResult = (card: ScanFeedbackState, target: OverlayTarget) => {
      overlayTargetRef.current = target;
      setScanCard(card);
      setCaptureMode('result');
    };

    try {
      // Beri kesempatan UI menampilkan status sebelum inferensi berjalan
      await new Promise(r => setTimeout(r, 50));

      const region = getVisibleRegion(video);
      const roi = getCenterRoi(region);

      const preds: Array<{ bbox: Box; class: string; score: number }> = await cocoModel.detect(
        procCanvas,
        6,
        0.2
      );
      if (session !== sessionRef.current) return;

      // Abaikan deteksi yang sebagian besar berada di luar area layar yang terlihat
      const visiblePreds = preds.filter(p => {
        const [bx, by, bw, bh] = p.bbox;
        const ix = Math.max(0, Math.min(bx + bw, region.x + region.w) - Math.max(bx, region.x));
        const iy = Math.max(0, Math.min(by + bh, region.y + region.h) - Math.max(by, region.y));
        return (ix * iy) / Math.max(1, bw * bh) >= 0.5;
      });

      // Cari kandidat wadah plastik COCO-SSD
      const plasticCandidate = visiblePreds
        .filter(
          p =>
            (AUTO_COCO_CLASSES as readonly string[]).includes(p.class.toLowerCase()) &&
            p.score >= COCO_THRESHOLD
        )
        .sort((a, b) => b.score - a.score)[0];

      // Benda bukan sampah (orang, laptop, dll.) yang menutupi titik tengah bingkai
      const roiCenterX = roi[0] + roi[2] / 2;
      const roiCenterY = roi[1] + roi[3] / 2;
      const centralNonPlastic = visiblePreds
        .filter(
          p =>
            (NON_WASTE_COCO_CLASSES as readonly string[]).includes(p.class.toLowerCase()) &&
            p.score >= NON_WASTE_COCO_THRESHOLD &&
            (p.class.toLowerCase() === 'person' ||
              p.bbox[2] * p.bbox[3] <= region.w * region.h * NON_PLASTIC_MAX_AREA_RATIO) &&
            roiCenterX >= p.bbox[0] &&
            roiCenterX <= p.bbox[0] + p.bbox[2] &&
            roiCenterY >= p.bbox[1] &&
            roiCenterY <= p.bbox[1] + p.bbox[3]
        )
        .sort((a, b) => b.score - a.score)[0];

      if (!plasticCandidate && centralNonPlastic) {
        showResult(
          {
            status: 'non_plastic',
            cocoLabel: centralNonPlastic.class,
            resinClass: null,
            confidence: Math.round(centralNonPlastic.score * 100),
            isMinority: false,
            message: `Itu terlihat seperti ${NON_WASTE_LABELS[centralNonPlastic.class.toLowerCase()]}. Arahkan kamera ke sampah plastik, ya.`,
          },
          { box: null, kind: 'none', label: '', isCenterFallback: false }
        );
        return;
      }

      // Tanpa kandidat wadah (mis. sachet/bungkus), nilai area bingkai bidik tengah
      const isCenterFallback = !plasticCandidate;
      const evaluatedBox: Box = plasticCandidate ? plasticCandidate.bbox : roi;
      const evalLabel = plasticCandidate ? plasticCandidate.class : 'Kemasan Plastik';

      const [bx, by, bw, bh] = evaluatedBox;
      const x1 = Math.max(0, Math.floor(bx));
      const y1 = Math.max(0, Math.floor(by));
      const x2 = Math.min(vw, Math.ceil(bx + bw));
      const y2 = Math.min(vh, Math.ceil(by + bh));
      const rawW = x2 - x1;
      const rawH = y2 - y1;
      const displayBox: Box = [x1, y1, rawW, rawH];

      // Rata-ratakan beberapa margin crop; satu foto tidak punya frame lain sebagai pembanding
      const padRatios = isCenterFallback ? [0] : CANDIDATE_PAD_RATIOS;
      const allProbs: number[][] = [];
      for (const padRatio of padRatios) {
        const padX = Math.round(rawW * padRatio);
        const padY = Math.round(rawH * padRatio);
        const cx1 = Math.max(0, x1 - padX);
        const cy1 = Math.max(0, y1 - padY);
        const cx2 = Math.min(vw, x2 + padX);
        const cy2 = Math.min(vh, y2 + padY);
        const probs = classifyCropTensor(procCanvas, [
          cx1,
          cy1,
          Math.max(1, cx2 - cx1),
          Math.max(1, cy2 - cy1),
        ]);
        if (probs) allProbs.push(probs);
      }

      let topClass: string | null = null;
      let topScore: number | null = null;
      let looksNonPlastic = false;
      if (allProbs.length > 0) {
        const meanProbs = allProbs[0].map(
          (_, i) => allProbs.reduce((sum, probs) => sum + probs[i], 0) / allProbs.length
        );
        const nonPlasticProb = meanProbs[NON_PLASTIC_INDEX];
        looksNonPlastic = nonPlasticProb >= NON_PLASTIC_REJECT_THRESHOLD;
        let maxIdx = 0;
        for (let i = 1; i < RESIN_CLASSES.length; i++) {
          if (meanProbs[i] > meanProbs[maxIdx]) maxIdx = i;
        }
        topClass = RESIN_CLASSES[maxIdx];
        topScore = meanProbs[maxIdx] / Math.max(1e-6, 1 - nonPlasticProb);
      }

      // Pesannya sengaja lunak: model kadang keliru menolak plastik sungguhan
      if (looksNonPlastic) {
        showResult(
          {
            status: 'uncertain',
            cocoLabel: evalLabel,
            resinClass: null,
            confidence: null,
            isMinority: false,
            message: 'Belum terlihat seperti plastik. Pastikan seluruh benda masuk bingkai, lalu foto ulang.',
          },
          { box: displayBox, kind: 'uncertain', label: 'Belum yakin', isCenterFallback }
        );
        return;
      }

      if (topClass && topScore !== null && topScore >= RESIN_THRESHOLD) {
        const info = getPlasticInfo(topClass);
        const conf = Math.round(topScore * 100);
        setDetectedPlasticInfo(prev => (prev === info ? prev : info));
        setCapturedPhoto(cropToDataUrl(procCanvas, displayBox));
        overlayTargetRef.current = {
          box: displayBox,
          kind: 'locking',
          label: info.name,
          isCenterFallback,
        };
        setScanCard({
          status: 'detected',
          cocoLabel: evalLabel,
          resinClass: topClass,
          confidence: conf,
          isMinority: (MINORITY_CLASSES as readonly string[]).includes(topClass),
          message: 'Plastik ditemukan!',
        });
        setCaptureMode('result');
        playScanPing('lock');
        setPhase('detected');
        lockTimeoutRef.current = window.setTimeout(() => {
          stopCamera();
          setPhase('pemantik');
        }, 1500);
        return;
      }

      showResult(
        {
          status: 'uncertain',
          cocoLabel: evalLabel,
          resinClass: topClass,
          confidence: topScore !== null ? Math.round(topScore * 100) : null,
          isMinority: false,
          message: isCenterFallback
            ? 'AI belum yakin. Pastikan seluruh benda masuk bingkai dan cahaya cukup, lalu foto ulang.'
            : REJECTED_MATERIAL_STATUS,
        },
        { box: displayBox, kind: 'uncertain', label: 'Belum yakin', isCenterFallback }
      );
    } catch (err) {
      console.warn('Analisis foto gagal:', err);
      if (session !== sessionRef.current) return;
      showResult(
        {
          status: 'uncertain',
          cocoLabel: '',
          resinClass: null,
          confidence: null,
          isMinority: false,
          message: 'Foto gagal dianalisis. Silakan foto ulang.',
        },
        { box: null, kind: 'none', label: '', isCenterFallback: false }
      );
    }
  }, [classifyCropTensor, playScanPing, setCaptureMode, setPhase, stopCamera]);

  function retakePhoto() {
    overlayTargetRef.current = { box: null, kind: 'none', label: '', isCenterFallback: false };
    displayBoxRef.current = null;
    boxAlphaRef.current = 0;
    setScanCard(INITIAL_SCAN_CARD);
    setCaptureMode('live');
    videoRef.current?.play().catch(() => {});
  }

  async function startCamera() {
    stopCamera();
    const session = ++sessionRef.current;
    setCameraError(null);
    setPhase('scanning');
    setModelLoading(true);
    setCaptureMode('live');
    overlayTargetRef.current = { box: null, kind: 'none', label: '', isCenterFallback: false };
    displayBoxRef.current = null;
    boxAlphaRef.current = 0;
    setScanCard(INITIAL_SCAN_CARD);
    activeRef.current = true;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Browser tidak mendukung akses kamera. Pastikan menggunakan HTTPS atau Chrome/Edge terbaru.'
        );
      }

      // Kamera & model dimuat paralel; video ditampilkan secepatnya selagi model masih dimuat
      const modelsPromise = ensureModelsLoaded();
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
    } catch (err: unknown) {
      if (session !== sessionRef.current) return;
      stopCamera();
      setCameraError(err instanceof Error ? err.message : 'Akses kamera ditolak');
      setModelLoading(false);
    }
  }

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

  // Info polimer yang ditampilkan di kartu HUD hanya bila AI benar-benar memiliki kandidat resin
  const hudInfo =
    scanCard.status === 'detected' && scanCard.resinClass
      ? getPlasticInfo(scanCard.resinClass)
      : null;

  const statusTone =
    phase === 'detected' || scanCard.status === 'detected'
      ? 'lock'
      : scanCard.status === 'uncertain'
      ? 'warn'
      : scanCard.status === 'non_plastic'
      ? 'error'
      : 'idle';

  const statusLabel =
    phase === 'detected'
      ? 'Plastik terdeteksi'
      : modelLoading
      ? 'Menyiapkan AI'
      : captureMode === 'analyzing'
      ? 'Menganalisis foto'
      : scanCard.status === 'non_plastic'
      ? 'Bukan sampah plastik'
      : scanCard.status === 'uncertain'
      ? 'AI belum yakin'
      : 'Siap memotret';

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
            description="Cari sampah plastik di sekitarmu, seperti botol, gelas, atau bungkus jajan. Arahkan kamera, lalu tekan Scan. AI akan menebak jenis plastiknya."
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
              onClick={() => selectSimulatedSample(PLASTIC_DATA.bottle)}
              className="bg-[#f0a345] text-[#3b2313] font-bold px-6 py-3 rounded-xl shadow-md"
            >
              Lanjut Simulasi
            </button>
          </div>
        </div>
      )}

      {/* Real-time Scanning HUD */}
      {(phase === 'scanning' || phase === 'detected') && (
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

          {/* Kilatan sukses saat target terkunci */}
          <AnimatePresence>
            {phase === 'detected' && (
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
              className={`px-3.5 py-1.5 rounded-full backdrop-blur-md border shadow-lg flex items-center gap-2 transition-colors duration-300 ${
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
            <div className="w-[min(100%,440px)] bg-[#083b54]/90 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 shadow-2xl text-white">
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
                  {modelLoading
                    ? 'Kamera aktif. Model AI sedang dimuat…'
                    : captureMode === 'analyzing'
                    ? 'AI sedang memeriksa foto…'
                    : scanCard.message}
                </p>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {hudInfo ? (
                  <motion.div
                    key={`info-${scanCard.resinClass}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-start gap-3 mt-2.5 pt-2.5 border-t border-white/10"
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#006591]/60 border border-[#6bff8f]/30 flex flex-col items-center justify-center shrink-0 shadow-inner">
                      <span className="text-[10px] font-black font-[family-name:var(--font-mono)] text-[#6bff8f] leading-none">
                        {hudInfo.resinClass?.split('-')[0] || '7'}
                      </span>
                      <span className="material-symbols-outlined text-lg text-[#6bff8f] leading-none">
                        recycling
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div>
                        <p className="font-[family-name:var(--font-outfit)] font-bold text-[15px] leading-snug">
                          {hudInfo.name}
                        </p>
                        <p className="text-[13px] font-semibold text-[#f0a345] mt-0.5">
                          Terurai dalam {hudInfo.decompositionTime.toLowerCase()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Peringatan kelas minoritas */}
              {scanCard.isMinority && scanCard.status === 'detected' && (
                <p className="mt-2 text-xs text-amber-200 bg-amber-950/60 border border-amber-400/40 rounded-lg px-2.5 py-1.5">
                  AI masih jarang melihat plastik jenis ini. Cek kode segitiga di kemasan, ya.
                </p>
              )}

            </div>

            {/* Tombol potret: foto dianalisis hanya setelah ditekan siswa */}
            {phase === 'scanning' && !modelLoading && (
              <button
                onClick={captureMode === 'result' ? retakePhoto : analyzeCapture}
                disabled={captureMode === 'analyzing'}
                className="mt-3 w-[min(100%,440px)] min-h-14 flex items-center justify-center gap-2 bg-[#6bff8f] hover:bg-[#4ee876] disabled:opacity-60 text-[#06293b] text-lg font-extrabold rounded-2xl shadow-lg transition-transform active:scale-95 font-[family-name:var(--font-outfit)]"
              >
                <span className="material-symbols-outlined text-2xl">
                  {captureMode === 'result' ? 'refresh' : 'photo_camera'}
                </span>
                {captureMode === 'analyzing'
                  ? 'Menganalisis…'
                  : captureMode === 'result'
                  ? 'Foto Ulang'
                  : 'Scan'}
              </button>
            )}

            {/* Tautan simulasi untuk demo tanpa sampel plastik fisik */}
            {phase === 'scanning' && (
              <button
                onClick={() => selectSimulatedSample(PLASTIC_DATA.bottle)}
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
                    Kamu menemukan plastik!
                  </h2>
                  <p className="mt-0.5 text-sm font-semibold leading-snug text-[#006e2f]">
                    {detectedPlasticInfo.name}
                  </p>
                </div>
              </div>

              {/* Dua fakta utama */}
              <div className="grid grid-cols-2 gap-2 mt-2.5 [@media(min-height:720px)]:mt-4 shrink-0">
                <div className="bg-[#f2f8fa] rounded-xl px-2 py-1.5 [@media(min-height:720px)]:py-3 text-center">
                  <p className="text-xs text-[#4b5563]">Kode daur ulang</p>
                  <p className="text-sm font-bold text-[#006591] leading-snug font-[family-name:var(--font-outfit)]">
                    {detectedPlasticInfo.code.replace(/^KODE /, '')}
                  </p>
                </div>
                <div className="bg-[#fdf1ef] rounded-xl px-2 py-1.5 [@media(min-height:720px)]:py-3 text-center">
                  <p className="text-xs text-[#4b5563]">Lama terurai</p>
                  <p className="text-sm font-bold text-[#ba1a1a] leading-snug font-[family-name:var(--font-outfit)]">
                    {detectedPlasticInfo.decompositionTime}
                  </p>
                </div>
              </div>

              <p className="mt-2 [@media(min-height:720px)]:mt-4 text-sm [@media(min-height:720px)]:text-[15px] text-[#3e4850] leading-snug shrink-0">
                {detectedPlasticInfo.description}
              </p>
              <p className="mt-1 text-xs text-[#6e7881] leading-snug shrink-0">
                Ini tebakan AI. Untuk memastikan, cari kode segitiga di kemasan.
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
                <span className="material-symbols-outlined text-lg">refresh</span> Foto ulang
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

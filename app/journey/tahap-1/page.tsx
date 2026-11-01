'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
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
      'Mudah mengalami fotooksidasi akibat paparan sinar UV matahari, memicu pelepasan serat dan serpihan mikroplastik halus.',
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
      'Struktur tipis yang mudah getas saat terjemur, cepat terfragmentasi akibat benturan mekanik air menjadi mikropartikel.',
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
      'Sering terpapar suhu tinggi dan asam lemak yang mempercepat degradasi mikro dan leaching zat aditif pemlastis.',
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
      'Plastik kaku keras non-biodegradable yang sangat lambat terurai dan berisiko melepaskan zat bisfenol ke air.',
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
      'Mengandung klorin dan plasticizer (phthalates) yang sangat persisten dan beracun bagi biota perairan.',
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
      'Mudah mengalami fotooksidasi akibat sinar UV matahari dan melepaskan serpihan mikroplastik saat dipakai berulang atau terjemur.',
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
      'Lebih tahan suhu dibanding PET, namun abrasi mekanik dan pelapukan tetap menghasilkan fragmen mikroplastik di perairan.',
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
      'Mengandung klorin dan aditif pemlastis (phthalates) yang berisiko terlepas (leaching) dan bersifat toksik bagi biota.',
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
      'Struktur tipis dan fleksibel sangat mudah robek serta terfragmentasi menjadi lembaran mikroplastik halus.',
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
      'Getas saat terpapar radiasi UV terus-menerus dan melepaskan partikel mikroplastik saat terkena gesekan atau air panas.',
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
      'Sangat mudah hancur menjadi ribuan butiran mikroplastik ringan yang mengapung dan termakan organisme laut.',
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
      'Sulit didaur ulang dan beberapa jenis polikarbonat berisiko melepaskan monomer bisfenol saat terdegradasi.',
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
      'Tersusun dari lapisan polimer berbeda yang sangat sulit didaur ulang dan rentan terburai menjadi mikroplastik di alam.',
    resinClass: '7-OTHER',
    isMinorityValidationNeeded: true,
  };
}

// Kandidat wadah target COCO-SSD
const AUTO_COCO_CLASSES = ['bottle', 'cup', 'bowl', 'vase'] as const;

// 7 Kelas resin MobileNetV2 (alpha=0.50)
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
const COCO_THRESHOLD = 0.25;
const RESIN_THRESHOLD = 0.55;
const CENTER_ROI_SCALE = 0.70;

const REJECTED_MATERIAL_STATUS =
  'Material belum dapat dipastikan. Periksa kode resin pada kemasan.';

const PRODUCTION_RESIN_MODEL_URL = '/models/plastic/model.json';
const PRODUCTION_COCO_MODEL_URL = '/models/coco-ssd/model.json';

/** Gambar frame AR objek yang dioptimalkan: sudut siku futuristik rapi tanpa tumpang tindih */
function drawOptimizedObjectFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  isLocked: boolean
) {
  const cornerLen = Math.max(12, Math.min(w, h) * 0.22);
  const radius = 8;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = isLocked ? 3 : 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isLocked) {
    ctx.shadowColor = 'rgba(107, 255, 143, 0.7)';
    ctx.shadowBlur = 10;
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
  }

  // Soft translucent fill inside object frame
  ctx.fillStyle = isLocked ? 'rgba(107, 255, 143, 0.06)' : 'rgba(255, 255, 255, 0.03)';
  ctx.fillRect(x, y, w, h);

  // Top-Left corner
  ctx.beginPath();
  ctx.moveTo(x, y + cornerLen);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.lineTo(x + cornerLen, y);
  ctx.stroke();

  // Top-Right corner
  ctx.beginPath();
  ctx.moveTo(x + w - cornerLen, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + cornerLen);
  ctx.stroke();

  // Bottom-Right corner
  ctx.beginPath();
  ctx.moveTo(x + w, y + h - cornerLen);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + w - cornerLen, y + h);
  ctx.stroke();

  // Bottom-Left corner
  ctx.beginPath();
  ctx.moveTo(x + cornerLen, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + h - cornerLen);
  ctx.stroke();

  // Subtle Center Target Crosshair on the object
  const cx = x + w / 2;
  const cy = y + h / 2;
  const crossSize = 5;
  ctx.beginPath();
  ctx.moveTo(cx - crossSize, cy);
  ctx.lineTo(cx + crossSize, cy);
  ctx.moveTo(cx, cy - crossSize);
  ctx.lineTo(cx, cy + crossSize);
  ctx.stroke();

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
    // Warmup tensor 1 pass
    const warmIn = tfModule.zeros([1, 224, 224, 3], 'float32');
    const warmOut = loadedResin.predict(warmIn) as import('@tensorflow/tfjs').Tensor;
    await warmOut.data();
    warmIn.dispose();
    warmOut.dispose();
    return loadedResin;
  })();

  const [cocoModel, resinModel] = await Promise.all([loadCocoPromise, loadResinPromise]);
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

  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const activeRef = useRef(false);
  const isInferringRef = useRef(false);
  const lockProgressRef = useRef(0);

  // Model references
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tfRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cocoModelRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resinModelRef = useRef<any>(null);

  const [phase, setPhase] = useState<Phase>('init');
  const [detectedPlasticInfo, setDetectedPlasticInfo] = useState<PlasticInfo>(
    RESIN_PLASTIC_DATA['1-PET']
  );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [lockProgress, setLockProgress] = useState(0);
  const [isTargetFocused, setIsTargetFocused] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Real-time scan feedback card state
  const [scanCard, setScanCard] = useState<ScanFeedbackState>({
    status: 'scanning',
    cocoLabel: 'Mencari objek...',
    resinClass: null,
    confidence: null,
    isMinority: false,
    message: 'Arahkan kamera ke sampah plastik di sekitarmu',
  });

  const playScanPing = useCallback((type: 'lock' | 'beep') => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
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
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Preload model AI di background saat user masuk ke Tahap 1 (di layar pembuka StageIntro)
  useEffect(() => {
    preloadModels();
  }, []);

  async function ensureModelsLoaded() {
    const loaded = await preloadModels();
    tfRef.current = loaded.tf;
    cocoModelRef.current = loaded.cocoModel;
    resinModelRef.current = loaded.resinModel;
    return loaded;
  }

  // Preprocessing: tf.slice + resizeBilinear([224, 224]) float32 [0..255] (embedded Rescaling di graph)
  const classifyCropTensor = useCallback(
    (
      sourceCanvas: HTMLCanvasElement,
      cropBox: [number, number, number, number]
    ): {
      validCrop: boolean;
      topClass: string | null;
      topScore: number | null;
    } => {
      const tf = tfRef.current;
      const resinModel = resinModelRef.current;
      const [cx1, cy1, cw, ch] = cropBox;

      if (!tf || !resinModel || cw < 8 || ch < 8) {
        return { validCrop: false, topClass: null, topScore: null };
      }

      const ctx = sourceCanvas.getContext('2d');
      if (!ctx) return { validCrop: false, topClass: null, topScore: null };

      // Periksa variansi luminansi
      const sampleW = Math.min(cw, 64);
      const sampleH = Math.min(ch, 64);
      const imgData = ctx.getImageData(cx1, cy1, sampleW, sampleH).data;
      let sumLum = 0;
      let sumSqLum = 0;
      let count = 0;
      for (let i = 0; i < imgData.length; i += 16) {
        const lum = 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
        sumLum += lum;
        sumSqLum += lum * lum;
        count++;
      }
      if (count === 0) return { validCrop: false, topClass: null, topScore: null };
      const meanLum = sumLum / count;
      const varianceLum = sumSqLum / count - meanLum * meanLum;
      if (varianceLum < 1.0) {
        return { validCrop: false, topClass: null, topScore: null };
      }

      const probs: number[] = tf.tidy(() => {
        const frameTensor = tf.browser.fromPixels(sourceCanvas);
        const cropped = tf.slice(frameTensor, [cy1, cx1, 0], [ch, cw, 3]);
        const resized = tf.image.resizeBilinear(cropped, [224, 224], false).toFloat();
        const batched = tf.expandDims(resized, 0);
        const outTensor = resinModel.predict(batched);
        return Array.from(outTensor.dataSync());
      });

      let maxIdx = 0;
      for (let i = 1; i < probs.length; i++) {
        if (probs[i] > probs[maxIdx]) maxIdx = i;
      }

      return {
        validCrop: true,
        topClass: RESIN_CLASSES[maxIdx],
        topScore: probs[maxIdx],
      };
    },
    []
  );

  async function startCamera() {
    setCameraError(null);
    setModelLoading(true);
    setLockProgress(0);
    lockProgressRef.current = 0;
    activeRef.current = true;
    setIsTargetFocused(false);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Browser tidak mendukung akses kamera. Pastikan menggunakan HTTPS atau Chrome/Edge terbaru.'
        );
      }

      // Jalankan inisialisasi stream kamera dan pemuatan model AI secara paralel
      const cameraStreamPromise = navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      const [stream, { cocoModel }] = await Promise.all([
        cameraStreamPromise,
        ensureModelsLoaded(),
      ]);

      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setPhase('scanning');
      setModelLoading(false);

      async function detect() {
        if (!activeRef.current || !videoRef.current || !overlayRef.current) return;
        const video = videoRef.current;
        const canvas = overlayRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx || video.readyState < 2 || isInferringRef.current) {
          if (activeRef.current) {
            animRef.current = requestAnimationFrame(detect);
          }
          return;
        }

        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        canvas.width = vw;
        canvas.height = vh;
        ctx.clearRect(0, 0, vw, vh);

        if (!procCanvasRef.current) {
          procCanvasRef.current = document.createElement('canvas');
        }
        const procCanvas = procCanvasRef.current;
        procCanvas.width = vw;
        procCanvas.height = vh;
        const procCtx = procCanvas.getContext('2d');
        if (!procCtx) return;
        procCtx.drawImage(video, 0, 0, vw, vh);

        // Center ROI rectangle
        const roiSide = Math.round(Math.min(vw, vh) * CENTER_ROI_SCALE);
        const roiX = Math.max(0, Math.round((vw - roiSide) / 2));
        const roiY = Math.max(0, Math.round((vh - roiSide) / 2));

        isInferringRef.current = true;
        try {
          const preds: Array<{
            bbox: [number, number, number, number];
            class: string;
            score: number;
          }> = await cocoModel.detect(procCanvas, 6, 0.20);

          if (!activeRef.current) return;

          // Cek apakah ada objek non-plastik dominan (mis. orang/wajah)
          const nonPlasticPerson = preds.find(
            p =>
              ['person', 'cell phone', 'laptop', 'mouse'].includes(p.class.toLowerCase()) &&
              p.score >= 0.50
          );

          // Cari kandidat wadah plastik
          const plasticCandidate = preds
            .filter(
              p =>
                (AUTO_COCO_CLASSES as readonly string[]).includes(p.class.toLowerCase()) &&
                p.score >= COCO_THRESHOLD
            )
            .sort((a, b) => b.score - a.score)[0];

          let evaluatedBox: [number, number, number, number] | null = null;
          let evalLabel = 'Auto Detektor';
          let padRatio = 0.08;

          if (plasticCandidate) {
            evaluatedBox = plasticCandidate.bbox;
            evalLabel = plasticCandidate.class;
            padRatio = 0.08;
          } else if (!nonPlasticPerson) {
            // Jika COCO-SSD tidak menemukan wadah kaku, namun di tengah ada kemasan plastik fleksibel/sachet
            evaluatedBox = [roiX, roiY, roiSide, roiSide];
            evalLabel = 'Center-Target';
            padRatio = 0.0;
          }

          if (evaluatedBox && !nonPlasticPerson) {
            const [bx, by, bw, bh] = evaluatedBox;
            const x1 = Math.max(0, Math.floor(bx));
            const y1 = Math.max(0, Math.floor(by));
            const x2 = Math.min(vw, Math.ceil(bx + bw));
            const y2 = Math.min(vh, Math.ceil(by + bh));
            const rawW = x2 - x1;
            const rawH = y2 - y1;

            const padX = Math.round(rawW * padRatio);
            const padY = Math.round(rawH * padRatio);
            const cx1 = Math.max(0, x1 - padX);
            const cy1 = Math.max(0, y1 - padY);
            const cx2 = Math.min(vw, x2 + padX);
            const cy2 = Math.min(vh, y2 + padY);
            const cw = Math.max(1, cx2 - cx1);
            const ch = Math.max(1, cy2 - cy1);

            const cropRes = classifyCropTensor(procCanvas, [cx1, cy1, cw, ch]);
            const topClass = cropRes.topClass;
            const topScore = cropRes.topScore;
            const isAccepted = Boolean(
              cropRes.validCrop && topClass && topScore !== null && topScore >= RESIN_THRESHOLD
            );
            const isMinority = Boolean(
              topClass && (MINORITY_CLASSES as readonly string[]).includes(topClass)
            );

            // Cek apakah posisi objek berada di area tengah target
            const boxCenterX = x1 + rawW / 2;
            const boxCenterY = y1 + rawH / 2;
            const inCenter =
              Math.abs(boxCenterX - vw / 2) <= vw * 0.32 &&
              Math.abs(boxCenterY - vh / 2) <= vh * 0.32;

            setIsTargetFocused(inCenter && isAccepted);

            if (isAccepted && topClass && topScore !== null) {
              const info = getPlasticInfo(topClass);
              setDetectedPlasticInfo(info);

              // Batasi koordinat frame agar selalu berada di zona aman kamera (tidak menimpa navbar atau card bawah)
              const safeTop = Math.round(vh * 0.16);
              const safeBottom = Math.round(vh * 0.72);
              const safeLeft = Math.round(vw * 0.06);
              const safeRight = Math.round(vw * 0.94);

              const clampX1 = Math.max(safeLeft, Math.min(safeRight - 40, x1));
              const clampY1 = Math.max(safeTop, Math.min(safeBottom - 40, y1));
              const clampX2 = Math.min(safeRight, Math.max(clampX1 + 40, x1 + rawW));
              const clampY2 = Math.min(safeBottom, Math.max(clampY1 + 40, y1 + rawH));

              if (inCenter) {
                lockProgressRef.current = Math.min(100, lockProgressRef.current + 12);
                setLockProgress(lockProgressRef.current);

                if (lockProgressRef.current % 36 === 0) {
                  playScanPing('beep');
                }

                const isLocked = lockProgressRef.current >= 100;

                // Gambar frame sudut AR hijau neon yang presisi tanpa menabrak UI
                drawOptimizedObjectFrame(
                  ctx,
                  clampX1,
                  clampY1,
                  clampX2 - clampX1,
                  clampY2 - clampY1,
                  '#6bff8f',
                  isLocked
                );

                setScanCard({
                  status: 'detected',
                  cocoLabel: evalLabel,
                  resinClass: topClass,
                  confidence: Math.round(topScore * 100),
                  isMinority,
                  message: isLocked
                    ? `✓ ${info.name.toUpperCase()} TERKUNCI (100%)`
                    : `Menilai ${info.name} di sasaran (${lockProgressRef.current}%)...`,
                });

                if (isLocked && activeRef.current) {
                  playScanPing('lock');
                  setPhase('detected');
                  setTimeout(() => {
                    stopCamera();
                    setPhase('pemantik');
                  }, 1500);
                  return;
                }
              } else {
                // Objek terdeteksi tetapi belum di tengah -> frame sudut oranye halus
                if (lockProgressRef.current > 0) {
                  lockProgressRef.current = Math.max(0, lockProgressRef.current - 4);
                  setLockProgress(lockProgressRef.current);
                }

                drawOptimizedObjectFrame(
                  ctx,
                  clampX1,
                  clampY1,
                  clampX2 - clampX1,
                  clampY2 - clampY1,
                  '#f0a345',
                  false
                );

                setScanCard({
                  status: 'scanning',
                  cocoLabel: evalLabel,
                  resinClass: topClass,
                  confidence: Math.round(topScore * 100),
                  isMinority,
                  message: `Arahkan ${info.name} ke tengah bingkai sasaran ⊙`,
                });
              }
            } else {
              // Skor classifier di bawah ambang batas (ragu / material belum dipastikan)
              if (lockProgressRef.current > 0) {
                lockProgressRef.current = Math.max(0, lockProgressRef.current - 6);
                setLockProgress(lockProgressRef.current);
              }

              setScanCard({
                status: 'uncertain',
                cocoLabel: evalLabel,
                resinClass: topClass || null,
                confidence: topScore ? Math.round(topScore * 100) : null,
                isMinority: false,
                message: REJECTED_MATERIAL_STATUS,
              });
            }
          } else {
            // Objek bukan plastik atau layar kosong
            setIsTargetFocused(false);
            if (lockProgressRef.current > 0) {
              lockProgressRef.current = Math.max(0, lockProgressRef.current - 6);
              setLockProgress(lockProgressRef.current);
            }

            if (nonPlasticPerson) {
              setScanCard({
                status: 'non_plastic',
                cocoLabel: nonPlasticPerson.class,
                resinClass: null,
                confidence: Math.round(nonPlasticPerson.score * 100),
                isMinority: false,
                message: `AI melihat "${nonPlasticPerson.class}". Objek ini bukan sampah plastik.`,
              });
            } else {
              setScanCard({
                status: 'scanning',
                cocoLabel: 'Mencari objek...',
                resinClass: null,
                confidence: null,
                isMinority: false,
                message: 'Arahkan botol, gelas, atau kemasan plastik ke tengah sasaran',
              });
            }
          }
        } finally {
          isInferringRef.current = false;
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

  function proceed() {
    completeStage(1);
    setShowCompletionModal(true);
  }

  function selectSimulatedSample(sample: PlasticInfo) {
    stopCamera();
    setCameraError(null);
    setDetectedPlasticInfo(sample);
    setPhase('pemantik');
  }

  return (
    <div className="relative w-full overflow-hidden min-h-screen h-[100vh] bg-[#06293b]">
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
            title="Tahap 1: AR Scanner Plastik"
            description="Arahkan kamera ke sampah plastik di sekitarmu (botol plastik, gelas cup, atau kemasan makanan). AI AR Scanner akan mendeteksi jenis polimer dan potensinya menjadi mikroplastik."
            icon="qr_code_scanner"
            layout="centered"
            actionText="Aktifkan Kamera AI"
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

      {/* Real-time Scanning HUD: Bersih, Rapi, Bebas Tabrakan Elemen */}
      {(phase === 'scanning' || phase === 'detected') && (
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 sm:p-5">
          {/* TOP SECTION: Slim floating status pill di bawah navbar kayu */}
          <div className="w-full flex justify-center pt-20 sm:pt-22">
            <div
              className={`px-4 py-1.5 rounded-full backdrop-blur-md border shadow-lg flex items-center gap-2 transition-all ${
                isTargetFocused
                  ? 'bg-[#006e2f]/85 border-[#6bff8f]/60 text-[#6bff8f]'
                  : 'bg-[#083b54]/80 border-white/20 text-white/90'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isTargetFocused ? 'bg-[#6bff8f] animate-ping' : 'bg-[#f0a345]'
                }`}
              />
              <span className="text-xs font-semibold font-[family-name:var(--font-outfit)] truncate max-w-[80vw]">
                {modelLoading
                  ? 'Menyiapkan Model AI...'
                  : isTargetFocused
                  ? `✓ ${detectedPlasticInfo.name} Terfokus di Sasaran`
                  : scanCard.message}
              </span>
            </div>
          </div>

          {/* CENTER VIEWPORT: Optimized AR Viewfinder Reticle (Bebas tumpuk di tengah) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 sm:w-64 sm:h-64 pointer-events-none transition-all duration-300">
            {/* 4 Sleek Neon Corner Brackets */}
            <div
              className={`absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 rounded-tl-2xl transition-all duration-300 ${
                isTargetFocused
                  ? 'border-[#6bff8f] shadow-[0_0_20px_#6bff8f]'
                  : 'border-[#6bff8f]/70 shadow-[0_0_10px_rgba(107,255,143,0.3)]'
              }`}
            />
            <div
              className={`absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 rounded-tr-2xl transition-all duration-300 ${
                isTargetFocused
                  ? 'border-[#6bff8f] shadow-[0_0_20px_#6bff8f]'
                  : 'border-[#6bff8f]/70 shadow-[0_0_10px_rgba(107,255,143,0.3)]'
              }`}
            />
            <div
              className={`absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 rounded-bl-2xl transition-all duration-300 ${
                isTargetFocused
                  ? 'border-[#6bff8f] shadow-[0_0_20px_#6bff8f]'
                  : 'border-[#6bff8f]/70 shadow-[0_0_10px_rgba(107,255,143,0.3)]'
              }`}
            />
            <div
              className={`absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 rounded-br-2xl transition-all duration-300 ${
                isTargetFocused
                  ? 'border-[#6bff8f] shadow-[0_0_20px_#6bff8f]'
                  : 'border-[#6bff8f]/70 shadow-[0_0_10px_rgba(107,255,143,0.3)]'
              }`}
            />

            {/* Center Focus Reticle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={`w-3.5 h-3.5 border-t-2 border-l-2 transition-all duration-300 ${
                  isTargetFocused
                    ? 'border-[#6bff8f] scale-125'
                    : 'border-[#6bff8f]/40'
                }`}
              />
            </div>

            {/* Subtle Scanning Radar / Laser Beam */}
            <div
              className={`absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-[#6bff8f] to-transparent shadow-[0_0_12px_#6bff8f] transition-opacity duration-300 ${
                phase === 'scanning' ? 'animate-pulse opacity-80' : 'opacity-0'
              }`}
              style={{
                animation: 'scanLaser 2.4s ease-in-out infinite alternate',
              }}
            />
          </div>

          {/* BOTTOM SECTION: Hero Information Card (Tertata rapi di bagian bawah) */}
          <div className="w-full flex flex-col items-center pb-4 sm:pb-6 pointer-events-auto">
            <div className="w-[min(94vw,440px)] bg-[#083b54]/92 backdrop-blur-md border border-[#6bff8f]/35 rounded-2xl p-3.5 shadow-2xl text-white transition-all duration-300">
              {/* Header Status Bar */}
              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      scanCard.status === 'detected'
                        ? 'bg-[#6bff8f] animate-ping'
                        : scanCard.status === 'uncertain'
                        ? 'bg-[#f0a345]'
                        : scanCard.status === 'non_plastic'
                        ? 'bg-[#ba1a1a]'
                        : 'bg-[#6bff8f]/80 animate-pulse'
                    }`}
                  />
                  <span className="font-extrabold uppercase tracking-wider font-[family-name:var(--font-outfit)] text-[11px]">
                    {phase === 'detected'
                      ? '✓ TARGET TERKUNCI'
                      : scanCard.status === 'detected'
                      ? 'PLASTIK TERDETEKSI'
                      : scanCard.status === 'non_plastic'
                      ? 'BUKAN SAMPAH PLASTIK'
                      : scanCard.status === 'uncertain'
                      ? 'MATERIAL BELUM DIPASTIKAN'
                      : 'MEMINDAI OBJEK'}
                  </span>
                </div>
                {scanCard.confidence !== null && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#6bff8f]/20 text-[#6bff8f] border border-[#6bff8f]/40 font-[family-name:var(--font-mono)]">
                    Indikatif {scanCard.confidence}%
                  </span>
                )}
              </div>

              {/* Main Polymer Information Row */}
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#006591]/60 border border-[#6bff8f]/30 flex flex-col items-center justify-center shrink-0 text-white shadow-inner">
                  <span className="text-[9px] font-black font-[family-name:var(--font-mono)] text-[#6bff8f]">
                    {detectedPlasticInfo.resinClass?.split('-')[0] || '1'}
                  </span>
                  <span className="material-symbols-outlined text-lg text-[#6bff8f] -mt-1">
                    recycling
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-[family-name:var(--font-outfit)] font-bold text-sm text-white truncate">
                      {detectedPlasticInfo.name}
                    </p>
                    <span className="text-[10px] font-bold text-[#f0a345] shrink-0 font-[family-name:var(--font-mono)]">
                      {detectedPlasticInfo.decompositionTime}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-white/80 truncate">
                    Polimer: {detectedPlasticInfo.polymer}
                  </p>
                  <p className="text-[10px] text-white/60 line-clamp-1 mt-0.5 leading-snug">
                    {detectedPlasticInfo.description}
                  </p>
                </div>
              </div>

              {/* Minority Class Validation Warning */}
              {scanCard.isMinority && scanCard.status === 'detected' && (
                <p className="mt-2 text-[10px] text-amber-200 bg-amber-950/60 border border-amber-400/40 rounded-lg px-2.5 py-0.5">
                  ⚠ Data latih terbatas — cek kode daur ulang fisik pada kemasan.
                </p>
              )}

              {/* Live Lock Progress Bar */}
              {lockProgress > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="flex justify-between text-[10px] font-bold text-[#6bff8f] mb-1 font-[family-name:var(--font-mono)]">
                    <span>
                      {phase === 'detected' ? 'INVESTIGASI TERKUNCI' : 'MENGUNCI INVESTIGASI'}
                    </span>
                    <span>{lockProgress}%</span>
                  </div>
                  <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#f0a345] to-[#6bff8f] rounded-full transition-all duration-150"
                      style={{ width: `${lockProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Subtle Fallback link for Demo/Testing without physical plastic */}
            <div className="text-center mt-1.5">
              <button
                onClick={() => selectSimulatedSample(PLASTIC_DATA.bottle)}
                className="text-white/50 hover:text-white text-[11px] underline font-medium transition-colors"
              >
                Uji sampel simulasi (Botol PET)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pemantik Modal (Investigation Sheet) */}
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

            {/* Indicative Visual Prediction Badge */}
            <div className="mb-3 text-center">
              <span className="inline-block bg-[#e8f5e9] border border-[#006e2f]/30 text-[#006e2f] text-[11px] font-extrabold px-3 py-1 rounded-full">
                Prediksi Visual Indikatif: {detectedPlasticInfo.code}
              </span>
              <p className="text-[10px] text-[#6e7881] mt-1 leading-snug">
                Hasil ini merupakan prediksi visual indikatif, bukan verifikasi komposisi kimia.
              </p>
            </div>

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
                &ldquo;Bagaimana mungkin benda padat sintetis seperti{' '}
                <strong className="text-[#083b54] not-italic">
                  {detectedPlasticInfo.name.toLowerCase()}
                </strong>{' '}
                ini bisa menembus dan menetap di dalam usus manusia — sedangkan tubuh kita dirancang
                untuk mencerna makanan?&rdquo;
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-[#083b54] mb-1.5 uppercase font-[family-name:var(--font-outfit)]">
                Tuliskan Hipotesis Awalmu (LKPD Tahap 1)
              </label>
              <textarea
                value={lkpdAnswers.lkpdStep1}
                onChange={e => setLkpdAnswer('lkpdStep1', e.target.value)}
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
                className="w-full bg-[#006591] hover:bg-[#004c6e] text-white font-bold py-3.5 rounded-xl text-base sm:text-lg transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-[#006591]/30 font-[family-name:var(--font-outfit)]"
              >
                Mulai Investigasi <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              <button
                onClick={() => {
                  startCamera();
                  setPhase('scanning');
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-[#006591] font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 font-[family-name:var(--font-outfit)]"
              >
                <span className="material-symbols-outlined text-base">refresh</span> Scan Ulang
                Objek
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

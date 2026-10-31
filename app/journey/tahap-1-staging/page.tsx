'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * MicroJourney AR — Halaman Staging Terpisah: Integrasi Hybrid COCO-SSD + Classifier Resin
 * Route: /journey/tahap-1-staging
 * ========================================================================================
 * Catatan Isolasi Staging:
 * - Halaman ini TIDAK dihubungkan ke navigasi utama dan TIDAK memodifikasi `useJourneyStore`
 *   (tidak memanggil `completeStage` maupun `setLkpdAnswer`).
 * - Menggunakan kandidat deteksi otomatis COCO-SSD: `bottle`, `cup`, `bowl`, dan `vase`.
 * - Menyediakan tombol pemindaian manual `Center-ROI Fallback`.
 * - Menggunakan ambang classifier awal `0.55` (konfigurabel, belum terkalibrasi, T = 1.0).
 */

const AUTO_COCO_CLASSES = ['bottle', 'cup', 'bowl', 'vase'] as const;
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

const DEFAULT_COCO_THRESHOLD = 0.25;
const DEFAULT_RESIN_THRESHOLD = 0.55;
const DEFAULT_CENTER_ROI_SCALE = 0.70;

const DOUBTFUL_STATUS_MESSAGE =
  'Material belum dapat dipastikan. Periksa kode resin pada kemasan.';

export interface ResinMetadataInfo {
  code: string;
  polymerName: string;
  commonExamples: string;
  microplasticRisk: string;
  isMinorityValidationNeeded: boolean;
}

const RESIN_EDUCATIONAL_INFO: Record<string, ResinMetadataInfo> = {
  '1-PET': {
    code: 'KODE 1 · PET / PETE',
    polymerName: 'Polietilena Tereftalat',
    commonExamples: 'Botol air mineral bening, botol minuman ringan, kemasan minyak goreng',
    microplasticRisk:
      'Mudah mengalami fotooksidasi akibat sinar UV matahari dan melepaskan serpihan mikroplastik saat dipakai berulang atau terjemur.',
    isMinorityValidationNeeded: false,
  },
  '2-HDPE': {
    code: 'KODE 2 · HDPE',
    polymerName: 'Polietilena Densitas Tinggi',
    commonExamples: 'Botol susu buram, botol sampo/deterjen, jeriken plastik tebal',
    microplasticRisk:
      'Lebih tahan suhu dibanding PET, namun abrasi mekanik dan pelapukan tetap menghasilkan fragmen mikroplastik di perairan.',
    isMinorityValidationNeeded: false,
  },
  '3-PVC': {
    code: 'KODE 3 · PVC / V',
    polymerName: 'Polivinil Klorida',
    commonExamples: 'Pipa plastik, blister kemasan obat kaku, lapisan kabel',
    microplasticRisk:
      'Mengandung klorin dan aditif pemlastis (phthalates) yang berisiko terlepas (leaching) dan bersifat toksik bagi biota.',
    isMinorityValidationNeeded: true,
  },
  '4-LDPE': {
    code: 'KODE 4 · LDPE',
    polymerName: 'Polietilena Densitas Rendah',
    commonExamples: 'Kantong kresek fleksibel, plastik pembungkus, botol pencet laboratorium',
    microplasticRisk:
      'Struktur tipis dan fleksibel sangat mudah robek serta terfragmentasi menjadi lembaran mikroplastik halus.',
    isMinorityValidationNeeded: false,
  },
  '5-PP': {
    code: 'KODE 5 · PP',
    polymerName: 'Polipropilena',
    commonExamples: 'Gelas cup minuman, bungkus makanan ringan/keripik, kotak makan thinwall',
    microplasticRisk:
      'Getas saat terpapar radiasi UV terus-menerus dan melepaskan partikel mikroplastik saat terkena gesekan atau air panas.',
    isMinorityValidationNeeded: false,
  },
  '6-PS': {
    code: 'KODE 6 · PS',
    polymerName: 'Polistirena (Styrofoam / PS Kaku)',
    commonExamples: 'Wadah busa styrofoam, gelas kopi busa, sendok garpu plastik getas',
    microplasticRisk:
      'Sangat mudah hancur menjadi ribuan butiran mikroplastik ringan yang mengapung dan termakan organisme laut.',
    isMinorityValidationNeeded: true,
  },
  '7-OTHER': {
    code: 'KODE 7 · OTHER',
    polymerName: 'Polimer Lainnya (Polikarbonat / Multilayer)',
    commonExamples: 'Botol minum keras polikarbonat, galon tertentu, kemasan sachet berlapis',
    microplasticRisk:
      'Sulit didaur ulang dan beberapa jenis polikarbonat berisiko melepaskan monomer bisfenol saat terdegradasi.',
    isMinorityValidationNeeded: true,
  },
};

interface SampleItem {
  id: string;
  url: string;
  title: string;
  trueResin: string;
  category: string;
}

interface DetectorResultState {
  sourceMode: 'IDLE' | 'AUTO_COCO' | 'MANUAL_CENTER_ROI' | 'FAILED_AUTO' | 'EMPTY_CROP';
  cocoClass: string;
  cocoScore: number | null;
  bbox: [number, number, number, number] | null;
  classifierCropBox: [number, number, number, number] | null;
  ignoredNonCandidateClass: string | null;
}

interface ClassifierResultState {
  topClass: string | null;
  topScore: number | null;
  allProbs: number[];
  accepted: boolean;
  appliedThreshold: number;
  statusHeadline: string;
  statusDetail: string;
  isMinorityClass: boolean;
}

interface TelemetryState {
  cocoLoadMs: number | null;
  resinLoadMs: number | null;
  cocoInferMs: number | null;
  cropResizeMs: number | null;
  resinInferMs: number | null;
  totalPipelineMs: number | null;
  numTensors: number;
  numBytesMb: number;
  embeddedRescalingVerified: boolean;
  preprocessNodes: string[];
  assetRouteStatus: string;
  lastDecisionLog: string;
}

interface ActiveFrameSource {
  element: HTMLImageElement | HTMLCanvasElement;
  width: number;
  height: number;
}

export default function Tahap1StagingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const cameraActiveRef = useRef<boolean>(false);

  // Refs untuk menyimpan instance model TF.js tanpa memicu re-render
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tfRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cocoModelRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resinModelRef = useRef<any>(null);
  const currentImageRef = useRef<HTMLImageElement | null>(null);
  const lastSourceRef = useRef<ActiveFrameSource | null>(null);
  const lastScanModeRef = useRef<'auto_coco' | 'manual_center_roi'>('auto_coco');
  const isInferringRef = useRef<boolean>(false);

  const [modelsReady, setModelsReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);

  const [inputMode, setInputMode] = useState<'static' | 'camera'>('static');
  const [cameraRunning, setCameraRunning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [groundTruthLabel, setGroundTruthLabel] = useState<string>('-');

  // Konfigurasi terpisah: Ambang Detektor COCO-SSD (0.25), Ambang Classifier Resin (default 0.55), Skala Center-ROI (default 70%)
  const [cocoThreshold, setCocoThreshold] = useState<number>(DEFAULT_COCO_THRESHOLD);
  const [resinThreshold, setResinThreshold] = useState<number>(DEFAULT_RESIN_THRESHOLD);
  const [centerRoiScale, setCenterRoiScale] = useState<number>(DEFAULT_CENTER_ROI_SCALE);

  // Galeri sampel
  const [activeTab, setActiveTab] = useState<'external' | 'testset'>('external');
  const [externalSamples, setExternalSamples] = useState<SampleItem[]>([]);
  const [testSetSamples, setTestSetSamples] = useState<SampleItem[]>([]);

  // State hasil Detektor dan Classifier secara terpisah
  const [detectorResult, setDetectorResult] = useState<DetectorResultState>({
    sourceMode: 'IDLE',
    cocoClass: '-',
    cocoScore: null,
    bbox: null,
    classifierCropBox: null,
    ignoredNonCandidateClass: null,
  });

  const [classifierResult, setClassifierResult] = useState<ClassifierResultState>({
    topClass: null,
    topScore: null,
    allProbs: [0, 0, 0, 0, 0, 0, 0],
    accepted: false,
    appliedThreshold: DEFAULT_RESIN_THRESHOLD,
    statusHeadline: DOUBTFUL_STATUS_MESSAGE,
    statusDetail: 'Pilih gambar uji, unggah foto, atau aktifkan kamera untuk memulai pemindaian.',
    isMinorityClass: false,
  });

  const [telemetry, setTelemetry] = useState<TelemetryState>({
    cocoLoadMs: null,
    resinLoadMs: null,
    cocoInferMs: null,
    cropResizeMs: null,
    resinInferMs: null,
    totalPipelineMs: null,
    numTensors: 0,
    numBytesMb: 0,
    embeddedRescalingVerified: false,
    preprocessNodes: [],
    assetRouteStatus: 'Memeriksa rute aset staging...',
    lastDecisionLog: 'Belum ada pemindaian yang dijalankan.',
  });

  const updateMemoryTelemetry = useCallback(() => {
    if (!tfRef.current) return;
    const mem = tfRef.current.memory();
    setTelemetry(prev => ({
      ...prev,
      numTensors: mem.numTensors,
      numBytesMb: Number((mem.numBytes / 1024 / 1024).toFixed(2)),
    }));
  }, []);

  // Fungsi penghentian kamera yang bersih
  const stopCamera = useCallback(() => {
    cameraActiveRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraRunning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Inisialisasi model & verifikasi rute aset staging serta embedded Rescaling(1/127.5, -1)
  useEffect(() => {
    let mounted = true;

    async function initStagingEnvironment() {
      setModelLoading(true);
      setModelLoadError(null);

      try {
        const [tfModule, cocoSsdModule] = await Promise.all([
          import('@tensorflow/tfjs'),
          import('@tensorflow-models/coco-ssd'),
        ]);
        await tfModule.ready();
        tfRef.current = tfModule;

        // 1. Verifikasi aksesibilitas model.json & cek node Rescaling(1/127.5, -1)
        const resinModelUrl = '/api/staging/hybrid-assets/resin/model.json';
        const cocoModelUrl = '/api/staging/hybrid-assets/coco-ssd/model.json';

        const resinJsonResp = await fetch(resinModelUrl);
        if (!resinJsonResp.ok) {
          throw new Error(`Gagal mengakses aset model resin (${resinJsonResp.status})`);
        }
        const resinJson = await resinJsonResp.json();
        const nodes: Array<{ name?: string; op?: string }> = resinJson?.modelTopology?.node || [];
        const mulNode = nodes.find(
          n => n.name?.includes('preprocess_mobilenetv2') && n.op === 'Mul'
        );
        const addNode = nodes.find(
          n => n.name?.includes('preprocess_mobilenetv2') && n.op === 'AddV2'
        );
        const hasEmbeddedRescaling = Boolean(mulNode && addNode);

        // 2. Muat COCO-SSD (lite_mobilenet_v2) dari route staging lokal
        const tCoco0 = performance.now();
        const loadedCoco = await cocoSsdModule.load({
          base: 'lite_mobilenet_v2',
          modelUrl: cocoModelUrl,
        });
        const cocoLoadMs = Math.round(performance.now() - tCoco0);
        cocoModelRef.current = loadedCoco;

        // 3. Muat Classifier Resin MobileNetV2 (alpha=0.50) dari route staging lokal
        const tResin0 = performance.now();
        const loadedResin = await tfModule.loadGraphModel(resinModelUrl);
        // Warmup 1x dengan tensor [1, 224, 224, 3]
        const warmIn = tfModule.zeros([1, 224, 224, 3], 'float32');
        const warmOut = loadedResin.predict(warmIn) as import('@tensorflow/tfjs').Tensor;
        await warmOut.data();
        warmIn.dispose();
        warmOut.dispose();
        const resinLoadMs = Math.round(performance.now() - tResin0);
        resinModelRef.current = loadedResin;

        if (!mounted) return;

        const mem = tfModule.memory();
        setTelemetry(prev => ({
          ...prev,
          cocoLoadMs,
          resinLoadMs,
          numTensors: mem.numTensors,
          numBytesMb: Number((mem.numBytes / 1024 / 1024).toFixed(2)),
          embeddedRescalingVerified: hasEmbeddedRescaling,
          preprocessNodes: [mulNode?.name || '', addNode?.name || ''].filter(Boolean),
          assetRouteStatus: '200 OK · Aset COCO-SSD & Classifier Resin terverifikasi lokal',
        }));

        setModelsReady(true);
        setModelLoading(false);

        // 4. Muat daftar galeri sampel uji
        await fetchGalleries();
      } catch (err: unknown) {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : 'Gagal memuat model AI';
        setModelLoadError(msg);
        setModelLoading(false);
        setTelemetry(prev => ({
          ...prev,
          assetRouteStatus: `Error: ${msg}`,
        }));
      }
    }

    async function fetchGalleries() {
      try {
        const [extRes, benchRes] = await Promise.all([
          fetch('/api/staging/hybrid-assets/manifests/external'),
          fetch('/api/staging/hybrid-assets/manifests/benchmark'),
        ]);

        if (extRes.ok) {
          const extData = await extRes.json();
          const extItems: SampleItem[] = (extData.images || []).map(
            (img: {
              id: string;
              filename: string;
              description_id: string;
              true_resin: string;
              expected_coco_behavior: string;
            }) => ({
              id: img.id,
              url: `/api/staging/hybrid-assets/samples/external/${img.filename}`,
              title: img.description_id,
              trueResin: img.true_resin,
              category:
                img.expected_coco_behavior === 'center_roi_fallback'
                  ? 'Kemasan Non-Botol (Uji Center-ROI)'
                  : img.true_resin === 'NON_PLASTIC'
                  ? 'Kontrol Non-Plastik (OOD)'
                  : 'Wadah Kaku (Uji Auto COCO-SSD)',
            })
          );
          if (mounted) setExternalSamples(extItems);
        }

        if (benchRes.ok) {
          const benchData = await benchRes.json();
          const records = benchData?.test_set_option_a_evaluation?.detailed_test_records || [];
          const negs = benchData?.test_set_option_a_evaluation?.negative_controls_with_fallback || [];
          const subset: SampleItem[] = [];

          for (const r of records.slice(0, 10)) {
            subset.push({
              id: `test_${r.image_index}`,
              url: `/api/staging/hybrid-assets/samples/test/${r.local_filename}`,
              title: r.local_filename,
              trueResin: r.true_resin,
              category: r.auto_relaxed_020 ? 'Test Set (Wadah Auto)' : 'Test Set (Kemasan Fallback)',
            });
          }
          for (const n of negs.slice(0, 4)) {
            subset.push({
              id: `neg_${n.filename}`,
              url: `/api/staging/hybrid-assets/samples/negative/${n.filename}`,
              title: `${n.description} (${n.filename})`,
              trueResin: 'NONE (Latar Kosong)',
              category: 'Kontrol Negatif',
            });
          }
          if (mounted) setTestSetSamples(subset);
        }
      } catch {
        // Abaikan jika gagal memuat daftar galeri opsional
      }
    }

    initStagingEnvironment();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Fungsi inti inferensi Hybrid (Deteksi Otomatis COCO-SSD atau Manual Center-ROI)
   * Menjamin:
   * 1. Validasi ukuran sumber dan validasi crop tidak kosong.
   * 2. Margin konteks 8% pada bbox COCO-SSD + resize bilinear ke 224x224.
   * 3. Pada Center-ROI, kotak ROI yang terlihat pada kanvas identik persis [cx1, cy1, cw, ch] dengan crop ke classifier.
   * 4. Input piksel [0, 255] float32 TANPA normalisasi ganda.
   * 5. Tanpa Temperature Scaling (T = 1.00).
   */
  const runHybridPipeline = useCallback(
    async (
      sourceEl: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
      srcWidth: number,
      srcHeight: number,
      mode: 'auto_coco' | 'manual_center_roi',
      gtInfo?: string
    ) => {
      const tf = tfRef.current;
      const cocoModel = cocoModelRef.current;
      const resinModel = resinModelRef.current;
      const mainCanvas = mainCanvasRef.current;
      const cropCanvas = cropCanvasRef.current;

      if (!tf || !cocoModel || !resinModel || !mainCanvas || !cropCanvas) return;
      if (isInferringRef.current) return;
      isInferringRef.current = true;

      try {
        if (gtInfo !== undefined) setGroundTruthLabel(gtInfo);
        lastScanModeRef.current = mode;

        const isDefaultThreshold = Math.abs(resinThreshold - DEFAULT_RESIN_THRESHOLD) < 1e-6;
        const activeThresholdText = isDefaultThreshold
          ? `${resinThreshold.toFixed(2)} (${(resinThreshold * 100).toFixed(0)}% · Default)`
          : `${resinThreshold.toFixed(2)} (${(resinThreshold * 100).toFixed(0)}% · Kustom)`;

        const mainCtx = mainCanvas.getContext('2d');
        const cropCtx = cropCanvas.getContext('2d');
        if (!mainCtx || !cropCtx) return;

        // Penanganan error jika dimensi gambar/video kosong atau terlalu kecil
        if (!srcWidth || !srcHeight || srcWidth < 16 || srcHeight < 16) {
          cropCtx.clearRect(0, 0, 224, 224);
          const emptyLog = `[Staging Log] Mode=${mode} | Status=EMPTY_FRAME (<16px) | AmbangAktif=${resinThreshold.toFixed(2)}`;
          console.info(emptyLog);
          setDetectorResult({
            sourceMode: 'EMPTY_CROP',
            cocoClass: '-',
            cocoScore: null,
            bbox: null,
            classifierCropBox: null,
            ignoredNonCandidateClass: null,
          });
          setClassifierResult({
            topClass: null,
            topScore: null,
            allProbs: [0, 0, 0, 0, 0, 0, 0],
            accepted: false,
            appliedThreshold: resinThreshold,
            statusHeadline: DOUBTFUL_STATUS_MESSAGE,
            statusDetail: 'Dimensi frame atau crop gambar kosong / tidak valid (< 16 piksel).',
            isMinorityClass: false,
          });
          setTelemetry(prev => ({
            ...prev,
            lastDecisionLog: emptyLog,
          }));
          return;
        }

        mainCanvas.width = srcWidth;
        mainCanvas.height = srcHeight;
        mainCtx.clearRect(0, 0, srcWidth, srcHeight);
        mainCtx.drawImage(sourceEl, 0, 0, srcWidth, srcHeight);

        // Hitung koordinat Center-ROI terlebih dahulu agar selalu konsisten
        const roiSide = Math.round(Math.min(srcWidth, srcHeight) * centerRoiScale);
        const roiX = Math.max(0, Math.round((srcWidth - roiSide) / 2));
        const roiY = Math.max(0, Math.round((srcHeight - roiSide) / 2));
        const roiW = Math.max(1, Math.min(srcWidth - roiX, roiSide));
        const roiH = Math.max(1, Math.min(srcHeight - roiY, roiSide));

        const tTotal0 = performance.now();
        let cocoInferMs = 0;
        let targetBox: [number, number, number, number] | null = null;
        let padRatio = 0.0;
        let detectedCocoClass = '-';
        let detectedCocoScore: number | null = null;
        let ignoredNonCandidate: string | null = null;

        if (mode === 'auto_coco') {
          const tCoco0 = performance.now();
          const rawDetections: Array<{
            bbox: [number, number, number, number];
            class: string;
            score: number;
          }> = await cocoModel.detect(mainCanvas, 8, 0.15);
          cocoInferMs = Math.round(performance.now() - tCoco0);

          const sorted = [...rawDetections].sort((a, b) => b.score - a.score);
          // Hanya kandidat otomatis yang diizinkan: bottle, cup, bowl, vase
          const candidate = sorted.find(
            d =>
              (AUTO_COCO_CLASSES as readonly string[]).includes(d.class.toLowerCase()) &&
              d.score >= cocoThreshold
          );

          if (candidate) {
            targetBox = candidate.bbox;
            padRatio = 0.08; // Konsisten dengan ekstraksi crop saat pelatihan MobileNetV2
            detectedCocoClass = candidate.class;
            detectedCocoScore = candidate.score;
          } else {
            if (sorted.length > 0) {
              ignoredNonCandidate = `${sorted[0].class} (${(sorted[0].score * 100).toFixed(1)}%)`;
            }
            // Gambar bingkai panduan Center-ROI (putus-putus) sesuai koordinat [roiX, roiY, roiW, roiH]
            mainCtx.setLineDash([8, 6]);
            mainCtx.strokeStyle = '#f0a345';
            mainCtx.lineWidth = 3;
            mainCtx.strokeRect(roiX, roiY, roiW, roiH);
            mainCtx.setLineDash([]);

            cropCtx.clearRect(0, 0, 224, 224);
            const totalMs = Math.round(performance.now() - tTotal0);
            const failLog = `[Staging Log] Mode=AUTO_COCO | Detektor=GAGAL_DETEKSI (AmbangCOCO=${cocoThreshold.toFixed(2)}) | PanduanROI=[${roiX},${roiY},${roiW},${roiH}] (${Math.round(centerRoiScale * 100)}%) | AmbangClassifierAktif=${resinThreshold.toFixed(2)}`;
            console.info(failLog);

            setDetectorResult({
              sourceMode: 'FAILED_AUTO',
              cocoClass: 'Tidak terdeteksi otomatis',
              cocoScore: null,
              bbox: null,
              classifierCropBox: null,
              ignoredNonCandidateClass: ignoredNonCandidate,
            });
            setClassifierResult({
              topClass: null,
              topScore: null,
              allProbs: [0, 0, 0, 0, 0, 0, 0],
              accepted: false,
              appliedThreshold: resinThreshold,
              statusHeadline: DOUBTFUL_STATUS_MESSAGE,
              statusDetail: ignoredNonCandidate
                ? `COCO-SSD hanya mendeteksi objek non-target (${ignoredNonCandidate}) di atas ambang detektor ${cocoThreshold.toFixed(2)}. Tempatkan satu objek di tengah bingkai (${Math.round(centerRoiScale * 100)}%) lalu tekan tombol "🎯 Pindai Manual Center-ROI".`
                : `Detektor otomatis belum menemukan botol, gelas, mangkuk, atau vas (ambang detektor ${cocoThreshold.toFixed(2)}). Tempatkan satu objek di tengah bingkai (${Math.round(centerRoiScale * 100)}%) lalu tekan tombol "🎯 Pindai Manual Center-ROI".`,
              isMinorityClass: false,
            });
            setTelemetry(prev => ({
              ...prev,
              cocoInferMs,
              cropResizeMs: null,
              resinInferMs: null,
              totalPipelineMs: totalMs,
              lastDecisionLog: failLog,
            }));
            updateMemoryTelemetry();
            return;
          }
        } else {
          // Mode Pemindaian Manual Center-ROI Fallback
          targetBox = [roiX, roiY, roiW, roiH];
          padRatio = 0.0;
          detectedCocoClass = `Center-ROI Manual (${Math.round(centerRoiScale * 100)}%)`;
          detectedCocoScore = null;
        }

        // Validasi & ekstraksi crop ke ukuran 224x224
        const tCrop0 = performance.now();
        const [bx, by, bw, bh] = targetBox;
        const x1 = Math.max(0, Math.floor(bx));
        const y1 = Math.max(0, Math.floor(by));
        const x2 = Math.min(srcWidth, Math.ceil(bx + bw));
        const y2 = Math.min(srcHeight, Math.ceil(by + bh));

        const rawW = x2 - x1;
        const rawH = y2 - y1;
        if (rawW < 8 || rawH < 8) {
          cropCtx.clearRect(0, 0, 224, 224);
          const tinyLog = `[Staging Log] Mode=${mode} | Status=EMPTY_CROP (<8px) | AmbangClassifierAktif=${resinThreshold.toFixed(2)}`;
          console.info(tinyLog);
          setDetectorResult({
            sourceMode: 'EMPTY_CROP',
            cocoClass: detectedCocoClass,
            cocoScore: detectedCocoScore,
            bbox: [x1, y1, rawW, rawH],
            classifierCropBox: null,
            ignoredNonCandidateClass: null,
          });
          setClassifierResult({
            topClass: null,
            topScore: null,
            allProbs: [0, 0, 0, 0, 0, 0, 0],
            accepted: false,
            appliedThreshold: resinThreshold,
            statusHeadline: DOUBTFUL_STATUS_MESSAGE,
            statusDetail: 'Area crop terlalu kecil atau kosong (< 8 piksel). Tidak memaksakan prediksi.',
            isMinorityClass: false,
          });
          setTelemetry(prev => ({
            ...prev,
            lastDecisionLog: tinyLog,
          }));
          return;
        }

        const padX = Math.round(rawW * padRatio);
        const padY = Math.round(rawH * padRatio);
        const cx1 = Math.max(0, x1 - padX);
        const cy1 = Math.max(0, y1 - padY);
        const cx2 = Math.min(srcWidth, x2 + padX);
        const cy2 = Math.min(srcHeight, y2 + padY);
        const cw = Math.max(1, cx2 - cx1);
        const ch = Math.max(1, cy2 - cy1);

        // Gambar pratinjau crop [cx1, cy1, cw, ch] pada cropCanvas (224x224)
        cropCtx.clearRect(0, 0, 224, 224);
        cropCtx.drawImage(sourceEl, cx1, cy1, cw, ch, 0, 0, 224, 224);

        // Periksa apakah crop benar-benar kosong/gelap seragam (variansi piksel mendekati 0)
        const imgData = cropCtx.getImageData(0, 0, 224, 224).data;
        let sumLum = 0;
        let sumSqLum = 0;
        const nPix = 224 * 224;
        for (let i = 0; i < imgData.length; i += 16) {
          const lum = 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
          sumLum += lum;
          sumSqLum += lum * lum;
        }
        const sampledCount = nPix / 4;
        const meanLum = sumLum / sampledCount;
        const varianceLum = sumSqLum / sampledCount - meanLum * meanLum;

        if (varianceLum < 1.0) {
          const uniformLog = `[Staging Log] Mode=${mode} | Crop=[${cx1},${cy1},${cw},${ch}] | Status=EMPTY_OR_UNIFORM_CROP (var=${varianceLum.toFixed(2)}) | AmbangClassifierAktif=${resinThreshold.toFixed(2)}`;
          console.info(uniformLog);
          setDetectorResult({
            sourceMode: 'EMPTY_CROP',
            cocoClass: detectedCocoClass,
            cocoScore: detectedCocoScore,
            bbox: mode === 'manual_center_roi' ? [cx1, cy1, cw, ch] : [x1, y1, rawW, rawH],
            classifierCropBox: [cx1, cy1, cw, ch],
            ignoredNonCandidateClass: null,
          });
          setClassifierResult({
            topClass: null,
            topScore: null,
            allProbs: [0, 0, 0, 0, 0, 0, 0],
            accepted: false,
            appliedThreshold: resinThreshold,
            statusHeadline: DOUBTFUL_STATUS_MESSAGE,
            statusDetail:
              'Crop gambar kosong atau seragam tanpa fitur visual objek (variansi piksel mendekati nol). Prediksi dibatalkan.',
            isMinorityClass: false,
          });
          setTelemetry(prev => ({
            ...prev,
            lastDecisionLog: uniformLog,
          }));
          return;
        }

        const cropResizeMs = Math.round(performance.now() - tCrop0);

        // Inferensi Classifier Resin: Input [1, 224, 224, 3] float32 dalam [0, 255]
        // Menggunakan tf.slice([cy1, cx1, 0], [ch, cw, 3]) + tf.image.resizeBilinear([224, 224], false)
        // SEBELUM menggambar kotak overlay di mainCanvas, agar identik dengan pelatihan MobileNetV2.
        // PENTING: JANGAN menerapkan .div(127.5).sub(1.0) karena Rescaling(1/127.5, -1) sudah tertanam di model.json!
        const tResin0 = performance.now();
        const probsArray: number[] = tf.tidy(() => {
          const frameTensor = tf.browser.fromPixels(mainCanvas);
          const cropped = tf.slice(frameTensor, [cy1, cx1, 0], [ch, cw, 3]);
          const resized = tf.image.resizeBilinear(cropped, [224, 224], false).toFloat();
          const batched = tf.expandDims(resized, 0);
          const outTensor = resinModel.predict(batched);
          return Array.from(outTensor.dataSync());
        });
        const resinInferMs = Math.round(performance.now() - tResin0);
        const totalPipelineMs = Math.round(performance.now() - tTotal0);

        let maxIdx = 0;
        for (let i = 1; i < probsArray.length; i++) {
          if (probsArray[i] > probsArray[maxIdx]) maxIdx = i;
        }
        const topClass = RESIN_CLASSES[maxIdx];
        const topScore = probsArray[maxIdx];
        // Keputusan wajib menggunakan state resinThreshold aktif dari UI
        const accepted = topScore >= resinThreshold;
        const isMinority = (MINORITY_CLASSES as readonly string[]).includes(topClass);

        // Koordinat kotak yang digambar pada mainCanvas:
        // Pada mode manual_center_roi, kotak yang terlihat adalah [cx1, cy1, cw, ch] persis sama dengan crop classifier!
        // Pada mode auto_coco, gambar kotak deteksi [x1, y1, rawW, rawH] serta panduan halus Center-ROI di latar.
        const drawnBox: [number, number, number, number] =
          mode === 'manual_center_roi' ? [cx1, cy1, cw, ch] : [x1, y1, rawW, rawH];

        if (mode === 'auto_coco') {
          // Tampilkan juga batas Center-ROI secara tipis sebagai referensi area tengah
          mainCtx.setLineDash([6, 6]);
          mainCtx.strokeStyle = 'rgba(240, 163, 69, 0.35)';
          mainCtx.lineWidth = 2;
          mainCtx.strokeRect(roiX, roiY, roiW, roiH);
        }

        if (mode === 'manual_center_roi') {
          mainCtx.setLineDash([10, 6]);
        } else {
          mainCtx.setLineDash([]);
        }
        mainCtx.strokeStyle = accepted ? '#6bff8f' : '#f0a345';
        mainCtx.lineWidth = 4;
        mainCtx.strokeRect(drawnBox[0], drawnBox[1], drawnBox[2], drawnBox[3]);
        mainCtx.setLineDash([]);

        const labelBgColor = accepted ? 'rgba(0, 110, 47, 0.92)' : 'rgba(210, 123, 34, 0.92)';
        mainCtx.fillStyle = labelBgColor;
        mainCtx.fillRect(
          drawnBox[0],
          Math.max(0, drawnBox[1] - 32),
          Math.min(srcWidth - drawnBox[0], 420),
          28
        );
        mainCtx.fillStyle = '#ffffff';
        mainCtx.font = 'bold 12px Inter, sans-serif';
        const detTag =
          mode === 'auto_coco'
            ? `COCO: ${detectedCocoClass} (${((detectedCocoScore || 0) * 100).toFixed(1)}%)`
            : `Center-ROI (${Math.round(centerRoiScale * 100)}%)`;
        const resinTag = accepted
          ? `Resin: ${topClass} (${(topScore * 100).toFixed(1)}% ≥ ${(resinThreshold * 100).toFixed(0)}%)`
          : `Ditolak (${(topScore * 100).toFixed(1)}% < ${(resinThreshold * 100).toFixed(0)}%)`;
        mainCtx.fillText(
          `${detTag} | ${resinTag}`,
          drawnBox[0] + 8,
          Math.max(18, drawnBox[1] - 13)
        );

        const decisionLog = `[Staging Log] Mode=${mode === 'auto_coco' ? 'AUTO_COCO' : 'MANUAL_CENTER_ROI'} | Box=${JSON.stringify(drawnBox)} | CropClassifier=[${cx1},${cy1},${cw},${ch}] | AmbangDetektor=${cocoThreshold.toFixed(2)} | AmbangClassifierAktif=${resinThreshold.toFixed(2)} (${isDefaultThreshold ? 'Default' : 'Kustom'}) | Top1=${topClass} (${(topScore * 100).toFixed(1)}%) | Keputusan=${accepted ? 'DITERIMA' : 'DITOLAK_AMBANG'}`;
        console.info(decisionLog);

        setDetectorResult({
          sourceMode: mode === 'auto_coco' ? 'AUTO_COCO' : 'MANUAL_CENTER_ROI',
          cocoClass: detectedCocoClass,
          cocoScore: detectedCocoScore,
          bbox: drawnBox,
          classifierCropBox: [cx1, cy1, cw, ch],
          ignoredNonCandidateClass: null,
        });

        setClassifierResult({
          topClass,
          topScore,
          allProbs: probsArray,
          accepted,
          appliedThreshold: resinThreshold,
          statusHeadline: accepted
            ? `Prediksi Visual Indikatif: ${topClass} (${(topScore * 100).toFixed(1)}%)`
            : DOUBTFUL_STATUS_MESSAGE,
          statusDetail: accepted
            ? `Skor prediksi visual belum terkalibrasi (${(topScore * 100).toFixed(1)}%) memenuhi ambang classifier aktif ${activeThresholdText}. Skor tinggi merupakan indikasi kemiripan visual dan tidak otomatis membuktikan komposisi kimia plastik tertentu.`
            : `Skor kandidat tertinggi (${topClass}: ${(topScore * 100).toFixed(1)}%) berada di bawah ambang classifier aktif ${activeThresholdText}. Sistem menolak memaksakan prediksi.`,
          isMinorityClass: isMinority,
        });

        setTelemetry(prev => ({
          ...prev,
          cocoInferMs: mode === 'auto_coco' ? cocoInferMs : 0,
          cropResizeMs,
          resinInferMs,
          totalPipelineMs,
          lastDecisionLog: decisionLog,
        }));
        updateMemoryTelemetry();
      } finally {
        isInferringRef.current = false;
      }
    },
    [cocoThreshold, resinThreshold, centerRoiScale, updateMemoryTelemetry]
  );

  // Simpan referensi terbaru runHybridPipeline agar loop kamera langsung selalu mengikuti nilai slider terbaru
  const latestRunPipelineRef = useRef(runHybridPipeline);
  useEffect(() => {
    latestRunPipelineRef.current = runHybridPipeline;
  }, [runHybridPipeline]);

  // Jalankan sampel pertama ketika galeri eksternal siap
  useEffect(() => {
    if (modelsReady && externalSamples.length > 0 && !lastSourceRef.current && !cameraRunning) {
      const first = externalSamples[0];
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        currentImageRef.current = img;
        const w = img.naturalWidth || 512;
        const h = img.naturalHeight || 512;
        lastSourceRef.current = { element: img, width: w, height: h };
        lastScanModeRef.current = 'auto_coco';
        runHybridPipeline(img, w, h, 'auto_coco', `${first.trueResin} (${first.title})`);
      };
      img.src = first.url;
    }
  }, [modelsReady, externalSamples, cameraRunning, runHybridPipeline]);

  // Sinkronisasi otomatis: ketika pengguna mengubah slider (resinThreshold, cocoThreshold, centerRoiScale)
  // pada gambar statis atau tangkapan frame kamera, langsung evaluasi ulang agar status, teks, kanvas, dan log sinkron!
  useEffect(() => {
    if (!modelsReady || cameraRunning || !lastSourceRef.current) return;
    const src = lastSourceRef.current;
    runHybridPipeline(src.element, src.width, src.height, lastScanModeRef.current);
  }, [modelsReady, cameraRunning, runHybridPipeline]);

  // Handler memilih sampel dari galeri
  function handleSelectSample(item: SampleItem) {
    stopCamera();
    setInputMode('static');
    setCameraError(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      currentImageRef.current = img;
      const w = img.naturalWidth || 512;
      const h = img.naturalHeight || 512;
      lastSourceRef.current = { element: img, width: w, height: h };
      lastScanModeRef.current = 'auto_coco';
      runHybridPipeline(img, w, h, 'auto_coco', `${item.trueResin} — ${item.title}`);
    };
    img.onerror = () => {
      setCameraError(`Gagal memuat gambar sampel: ${item.url}`);
    };
    img.src = item.url;
  }

  // Handler unggah file gambar
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    setInputMode('static');
    setCameraError(null);

    if (!file.type.startsWith('image/')) {
      setCameraError('Format file tidak didukung. Harap unggah file gambar (JPG/PNG/WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      const resultUrl = ev.target?.result;
      if (typeof resultUrl !== 'string') return;
      const img = new Image();
      img.onload = () => {
        currentImageRef.current = img;
        const w = img.naturalWidth || 512;
        const h = img.naturalHeight || 512;
        lastSourceRef.current = { element: img, width: w, height: h };
        lastScanModeRef.current = 'auto_coco';
        runHybridPipeline(img, w, h, 'auto_coco', `Unggahan Pengguna (${file.name})`);
      };
      img.onerror = () => {
        setCameraError('File gambar rusak atau tidak dapat didekode.');
      };
      img.src = resultUrl;
    };
    reader.readAsDataURL(file);
  }

  // Handler mulai kamera langsung (getUserMedia)
  async function handleStartCamera() {
    stopCamera();
    setCameraError(null);
    setInputMode('camera');

    try {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error(
          'Browser tidak mendukung navigator.mediaDevices.getUserMedia. Gunakan HTTPS atau localhost pada Chrome/Edge.'
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      cameraActiveRef.current = true;
      setCameraRunning(true);
      setGroundTruthLabel('Stream Kamera Langsung');

      const loopCameraFrame = async () => {
        if (!cameraActiveRef.current || !videoRef.current) return;
        const video = videoRef.current;
        if (video.readyState >= 2) {
          await latestRunPipelineRef.current(
            video,
            video.videoWidth || 640,
            video.videoHeight || 480,
            'auto_coco'
          );
        }
        if (cameraActiveRef.current) {
          animFrameRef.current = requestAnimationFrame(loopCameraFrame);
        }
      };

      loopCameraFrame();
    } catch (err: unknown) {
      stopCamera();
      let friendlyMsg = 'Akses kamera gagal atau ditolak.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          friendlyMsg =
            'Izin kamera ditolak oleh pengguna/browser (NotAllowedError). Berikan izin kamera di bilah alamat atau gunakan fitur Unggah Gambar.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          friendlyMsg =
            'Perangkat kamera fisik tidak ditemukan pada sistem ini (NotFoundError). Gunakan Unggah Gambar atau Galeri Sampel.';
        } else if (err.name === 'NotReadableError') {
          friendlyMsg =
            'Kamera sedang digunakan oleh aplikasi lain (NotReadableError). Tutup aplikasi kamera lain lalu coba lagi.';
        } else {
          friendlyMsg = `${err.name}: ${err.message}`;
        }
      } else if (err instanceof Error) {
        friendlyMsg = err.message;
      }
      setCameraError(friendlyMsg);
    }
  }

  // Handler Tombol Pemindaian Manual Center-ROI
  async function handleManualCenterRoiScan() {
    if (cameraRunning && videoRef.current && videoRef.current.readyState >= 2) {
      // Tangkap frame video saat ini ke kanvas snapshot SEBELUM stopCamera() mengosongkan video.srcObject
      const video = videoRef.current;
      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;
      const snapshotCanvas = document.createElement('canvas');
      snapshotCanvas.width = vw;
      snapshotCanvas.height = vh;
      const sCtx = snapshotCanvas.getContext('2d');
      if (sCtx) {
        sCtx.drawImage(video, 0, 0, vw, vh);
      }
      stopCamera();
      lastSourceRef.current = { element: snapshotCanvas, width: vw, height: vh };
      lastScanModeRef.current = 'manual_center_roi';
      await runHybridPipeline(
        snapshotCanvas,
        vw,
        vh,
        'manual_center_roi',
        'Tangkapan Kamera (Manual Center-ROI)'
      );
      return;
    }

    if (lastSourceRef.current) {
      const src = lastSourceRef.current;
      lastScanModeRef.current = 'manual_center_roi';
      await runHybridPipeline(src.element, src.width, src.height, 'manual_center_roi');
      return;
    }

    if (currentImageRef.current) {
      const img = currentImageRef.current;
      const w = img.naturalWidth || 512;
      const h = img.naturalHeight || 512;
      lastSourceRef.current = { element: img, width: w, height: h };
      lastScanModeRef.current = 'manual_center_roi';
      await runHybridPipeline(img, w, h, 'manual_center_roi');
    }
  }

  // Handler Uji Kasus Tepi: Crop Kosong (Task 6 & Task 9)
  async function handleTestEmptyCropEdgeCase() {
    stopCamera();
    const blankCanvas = document.createElement('canvas');
    blankCanvas.width = 512;
    blankCanvas.height = 512;
    const bCtx = blankCanvas.getContext('2d');
    if (bCtx) {
      bCtx.fillStyle = '#083b54';
      bCtx.fillRect(0, 0, 512, 512);
    }
    lastSourceRef.current = { element: blankCanvas, width: 512, height: 512 };
    lastScanModeRef.current = 'manual_center_roi';
    await runHybridPipeline(
      blankCanvas,
      512,
      512,
      'manual_center_roi',
      'Uji Edge-Case: Kanvas Kosong Seragam'
    );
  }

  const activeResinInfo =
    classifierResult.topClass && RESIN_EDUCATIONAL_INFO[classifierResult.topClass]
      ? RESIN_EDUCATIONAL_INFO[classifierResult.topClass]
      : null;

  const isDefaultResinThreshold = Math.abs(resinThreshold - DEFAULT_RESIN_THRESHOLD) < 1e-6;
  const isDefaultCenterRoi = Math.abs(centerRoiScale - DEFAULT_CENTER_ROI_SCALE) < 1e-6;

  return (
    <div className="min-h-screen bg-[#083b54] text-white pt-28 pb-24 px-4 sm:px-6 relative overflow-x-hidden font-[family-name:var(--font-inter)]">
      {/* Dekorasi Blob Organik sesuai Aturan Desain AGENTS.md */}
      <div className="pointer-events-none fixed -top-24 -left-24 w-96 h-96 rounded-full bg-[#006591]/30 blur-3xl" />
      <div className="pointer-events-none fixed bottom-10 -right-24 w-96 h-96 rounded-full bg-[#006e2f]/25 blur-3xl" />

      <div className="max-w-6xl mx-auto relative z-10 space-y-5">
        {/* HEADER STAGING */}
        <div className="bg-[#004c6e]/80 backdrop-blur-md border-2 border-[#6bff8f]/30 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f0a345]/20 border border-[#f0a345] text-[#f0a345] text-xs font-extrabold mb-2 font-[family-name:var(--font-outfit)]">
              <span>STAGING ENVIRONMENT · TERISOLASI DARI PRODUKSI</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold font-[family-name:var(--font-outfit)] text-white">
              Tahap 1 (Staging): Integrasi Hybrid COCO-SSD + Classifier Resin TF.js
            </h1>
            <p className="text-xs sm:text-sm text-[#b3e0f2] mt-1">
              Detektor Otomatis Wadah (<code>bottle</code>, <code>cup</code>, <code>bowl</code>, <code>vase</code>) + Pemindaian Manual <strong>Center-ROI Fallback ({Math.round(centerRoiScale * 100)}%)</strong> · Ambang Classifier Aktif:{' '}
              <code>
                {resinThreshold.toFixed(2)} ({isDefaultResinThreshold ? 'Default' : 'Kustom'})
              </code>{' '}
              (Belum Terkalibrasi, <code>T=1.0</code>).
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5">
            <span
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border ${
                modelsReady
                  ? 'bg-[#006e2f]/60 border-[#6bff8f] text-[#6bff8f]'
                  : modelLoadError
                  ? 'bg-[#ba1a1a]/60 border-red-300 text-red-100'
                  : 'bg-[#006591]/60 border-sky-300 text-sky-100'
              }`}
            >
              {modelLoading
                ? 'Memuat Model COCO-SSD & Classifier Resin...'
                : modelLoadError
                ? `Gagal Memuat Model: ${modelLoadError}`
                : `✓ Model Siap (COCO ${telemetry.cocoLoadMs}ms · Resin ${telemetry.resinLoadMs}ms)`}
            </span>
            <span className="text-[11px] text-[#b3e0f2]">
              Rescaling Tertanam: {telemetry.embeddedRescalingVerified ? '✓ Terverifikasi di model.json' : 'Memeriksa...'}
            </span>
          </div>
        </div>

        {/* PENAFIAN ILMIAH WAJIB (TUGAS 8 & PERBAIKAN FINAL 3) */}
        <div className="bg-[#ba1a1a]/25 backdrop-blur-md border-2 border-[#ff897d]/50 rounded-2xl p-4 text-xs sm:text-sm text-[#ffdad6] shadow-md">
          <p className="font-bold text-white mb-1 font-[family-name:var(--font-outfit)]">
            ⚠️ Penafian Ilmiah: Prediksi Visual Indikatif Bukan Verifikasi Komposisi Kimia
          </p>
          <p className="leading-relaxed">
            Hasil klasifikasi pada halaman ini merupakan <strong>prediksi visual indikatif</strong> berdasarkan citra RGB dua dimensi pada 7 kelas resin (<code>1-PET</code>, <code>2-HDPE</code>, <code>3-PVC</code>, <code>4-LDPE</code>, <code>5-PP</code>, <code>6-PS</code>, <code>7-OTHER</code>) dan <strong>bukan bukti komposisi kimia atau identifikasi resin yang pasti</strong>.
            Skor prediksi yang tinggi tidak otomatis membuktikan bahwa suatu benda terbuat dari plastik tertentu, dan model saat ini tidak dilatih secara khusus untuk menolak semua objek non-plastik. Verifikasi polimer yang akurat tetap memerlukan pemeriksaan kode resin fisik (SPI 1–7) pada kemasan atau uji laboratorium (FTIR/NIR).
          </p>
        </div>

        {/* GRID UTAMA STAGING */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* KOLOM KIRI (7 KOLOM): KANVAS VISUAL, TOMBOL KONTROL, SLIDER KONFIGURASI, & GALERI */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-[#004c6e]/75 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
                <h2 className="text-base font-extrabold font-[family-name:var(--font-outfit)]">
                  1. Panel Pemindaian Visual ({inputMode === 'camera' ? 'Kamera Langsung' : 'Gambar Statis'})
                </h2>
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-[#083b54] text-[#f0a345] border border-[#f0a345]/40">
                  Acuan / GT: {groundTruthLabel}
                </span>
              </div>

              {/* BARIS TOMBOL AKSI (Gaya Kayu & Hijau Alam sesuai AGENTS.md) */}
              <div className="flex flex-wrap gap-2.5 mb-3">
                {!cameraRunning ? (
                  <button
                    type="button"
                    onClick={handleStartCamera}
                    disabled={!modelsReady}
                    className="px-4 py-2.5 rounded-xl border-2 border-[#8e4912] text-[#3b2313] font-extrabold text-xs sm:text-sm font-[family-name:var(--font-outfit)] transition-transform active:scale-95 disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(to bottom, #f0a345, #d27b22)',
                      boxShadow:
                        'inset 0 2px 0 rgba(255,255,255,0.35), 0 4px 0 #703b08',
                    }}
                  >
                    📷 Aktifkan Kamera AI
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2.5 rounded-xl border-2 border-red-300 bg-[#ba1a1a] text-white font-extrabold text-xs sm:text-sm font-[family-name:var(--font-outfit)] transition-transform active:scale-95 shadow-md"
                  >
                    ⏹ Hentikan Kamera
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleManualCenterRoiScan}
                  disabled={!modelsReady}
                  className="px-4 py-2.5 rounded-xl border-2 border-[#6bff8f] bg-[#006e2f] hover:bg-[#008a3b] text-white font-extrabold text-xs sm:text-sm font-[family-name:var(--font-outfit)] transition-transform active:scale-95 shadow-md disabled:opacity-50"
                >
                  🎯 Pindai Manual Center-ROI ({Math.round(centerRoiScale * 100)}%)
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!modelsReady}
                  className="px-3.5 py-2.5 rounded-xl border border-sky-300/50 bg-[#006591] hover:bg-[#004c6e] text-white font-bold text-xs sm:text-sm transition-transform active:scale-95 disabled:opacity-50"
                >
                  📂 Unggah Gambar
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => {
                    if (lastSourceRef.current && !cameraRunning) {
                      const src = lastSourceRef.current;
                      lastScanModeRef.current = 'auto_coco';
                      runHybridPipeline(src.element, src.width, src.height, 'auto_coco');
                    } else if (currentImageRef.current && !cameraRunning) {
                      const img = currentImageRef.current;
                      const w = img.naturalWidth || 512;
                      const h = img.naturalHeight || 512;
                      lastSourceRef.current = { element: img, width: w, height: h };
                      lastScanModeRef.current = 'auto_coco';
                      runHybridPipeline(img, w, h, 'auto_coco');
                    }
                  }}
                  disabled={!modelsReady || cameraRunning}
                  className="px-3 py-2.5 rounded-xl border border-white/25 bg-[#083b54] hover:bg-[#004c6e] text-white font-semibold text-xs transition-transform active:scale-95 disabled:opacity-50"
                >
                  🔄 Deteksi Otomatis Ulang
                </button>

                <button
                  type="button"
                  onClick={handleTestEmptyCropEdgeCase}
                  disabled={!modelsReady}
                  className="px-3 py-2.5 rounded-xl border border-[#f0a345]/50 bg-[#083b54] hover:bg-[#004c6e] text-[#ffd59e] font-semibold text-xs transition-transform active:scale-95 disabled:opacity-50"
                  title="Uji penanganan ketika crop gambar kosong atau seragam"
                >
                  🧪 Uji Crop Kosong
                </button>
              </div>

              {/* INSTRUKSI SINGKAT PEMINDAIAN MANUAL CENTER-ROI (PERBAIKAN FINAL 2) */}
              <div className="mb-3.5 px-3.5 py-2.5 rounded-xl bg-[#083b54]/90 border border-[#f0a345]/45 text-xs text-[#ffe2b8] flex items-start gap-2.5">
                <span className="text-sm shrink-0">🎯</span>
                <p className="leading-relaxed">
                  <strong>Panduan Pemindaian Manual (Center-ROI):</strong> Tempatkan <strong>satu objek kemasan</strong> tepat di tengah bingkai (di dalam kotak panduan <code>{Math.round(centerRoiScale * 100)}%</code>) dan hindari latar belakang ramai atau banyak benda sekaligus sebelum menekan tombol <strong>Pindai Manual Center-ROI</strong>.
                </p>
              </div>

              {/* BANNER ERROR KAMERA / INPUT JIKA ADA */}
              {cameraError && (
                <div className="mb-4 p-3.5 rounded-xl bg-[#ba1a1a]/40 border border-red-300 text-xs text-white flex items-center justify-between gap-3">
                  <div>
                    <strong className="block font-bold mb-0.5">Pemberitahuan Izin / Input Kamera:</strong>
                    <span>{cameraError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCameraError(null)}
                    className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold shrink-0"
                  >
                    Tutup
                  </button>
                </div>
              )}

              {/* VIEWPORT KANVAS & VIDEO TERSEMBUNYI */}
              <div className="relative w-full bg-[#042231] rounded-2xl overflow-hidden border-2 border-white/15 flex items-center justify-center min-h-[360px]">
                <canvas
                  ref={mainCanvasRef}
                  width={512}
                  height={512}
                  className="max-w-full h-auto block"
                />
                <video ref={videoRef} playsInline muted className="hidden" />
              </div>

              {/* KONFIGURASI AMBANG TERPISAH & UKURAN CENTER-ROI */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 bg-[#083b54]/80 p-3.5 rounded-xl border border-white/10">
                <div>
                  <label className="block text-xs font-bold text-[#b3e0f2] mb-1">
                    Ambang Detektor COCO-SSD: <span className="text-white">{cocoThreshold.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min={0.15}
                    max={0.80}
                    step={0.01}
                    value={cocoThreshold}
                    onChange={e => setCocoThreshold(parseFloat(e.target.value))}
                    className="w-full accent-[#f0a345]"
                  />
                  <span className="text-[10px] text-white/60 block">
                    Kandidat otomatis: bottle, cup, bowl, vase
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#b3e0f2]">
                      Ambang Classifier Aktif:{' '}
                      <span className="text-[#6bff8f]">{resinThreshold.toFixed(2)}</span>
                    </label>
                    {!isDefaultResinThreshold && (
                      <button
                        type="button"
                        onClick={() => setResinThreshold(DEFAULT_RESIN_THRESHOLD)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[#006591] hover:bg-[#004c6e] text-white font-semibold"
                        title="Kembalikan ke nilai default 0.55"
                      >
                        Reset 0.55
                      </button>
                    )}
                  </div>
                  <input
                    type="range"
                    min={0.00}
                    max={0.90}
                    step={0.01}
                    value={resinThreshold}
                    onChange={e => setResinThreshold(parseFloat(e.target.value))}
                    className="w-full accent-[#6bff8f]"
                  />
                  <span className="text-[10px] text-white/60 block">
                    {isDefaultResinThreshold
                      ? 'Nilai aktif 0.55 (Default · Belum terkalibrasi, T=1.0)'
                      : `Nilai aktif ${resinThreshold.toFixed(2)} (Kustom · Belum terkalibrasi, T=1.0)`}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#b3e0f2]">
                      Ukuran Kotak Center-ROI:{' '}
                      <span className="text-white">{Math.round(centerRoiScale * 100)}%</span>
                    </label>
                    {!isDefaultCenterRoi && (
                      <button
                        type="button"
                        onClick={() => setCenterRoiScale(DEFAULT_CENTER_ROI_SCALE)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[#006591] hover:bg-[#004c6e] text-white font-semibold"
                        title="Kembalikan ke ukuran awal 70%"
                      >
                        Reset 70%
                      </button>
                    )}
                  </div>
                  <input
                    type="range"
                    min={0.50}
                    max={0.85}
                    step={0.05}
                    value={centerRoiScale}
                    onChange={e => setCenterRoiScale(parseFloat(e.target.value))}
                    className="w-full accent-[#f0a345]"
                  />
                  <span className="text-[10px] text-white/60 block">
                    {isDefaultCenterRoi
                      ? 'Ukuran awal 70% (Fokus 1 objek di tengah)'
                      : `Ukuran aktif ${Math.round(centerRoiScale * 100)}% (Kotak pindai manual)`}
                  </span>
                </div>
              </div>
            </div>

            {/* GALERI SAMPEL TERINTEGRASI */}
            <div className="bg-[#004c6e]/75 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-extrabold font-[family-name:var(--font-outfit)]">
                  Galeri Sampel Uji Cepat (Klik Gambar untuk Menguji)
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('external')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                      activeTab === 'external'
                        ? 'bg-[#006591] text-white border border-[#6bff8f]'
                        : 'bg-[#083b54] text-[#b3e0f2]'
                    }`}
                  >
                    🌍 14 Objek Eksternal
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('testset')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                      activeTab === 'testset'
                        ? 'bg-[#006591] text-white border border-[#6bff8f]'
                        : 'bg-[#083b54] text-[#b3e0f2]'
                    }`}
                  >
                    🧪 Sampel Test Set & Kontrol Negatif
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {(activeTab === 'external' ? externalSamples : testSetSamples).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSample(item)}
                    className="text-left p-2.5 rounded-xl bg-[#083b54]/90 hover:bg-[#006591]/70 border border-white/15 hover:border-[#6bff8f] transition-all"
                  >
                    <span className="inline-block px-2 py-0.5 rounded-lg bg-[#006591] text-[10px] font-extrabold text-white mb-1">
                      GT: {item.trueResin}
                    </span>
                    <p className="text-xs font-bold text-white line-clamp-1">{item.category}</p>
                    <p className="text-[11px] text-[#b3e0f2] line-clamp-2 mt-0.5">{item.title}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* KOLOM KANAN (5 KOLOM): HASIL DETEKTOR TERPISAH, HASIL CLASSIFIER TERPISAH, & TELEMETRI */}
          <div className="lg:col-span-5 space-y-5">
            {/* PANEL A: HASIL DETEKTOR OBJEK (COCO-SSD / CENTER-ROI) SECARA TERPISAH */}
            <div className="bg-[#004c6e]/75 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#006591] text-[#8ad6ff]">
                  Tahap A · Lokalisasi Objek (COCO-SSD / ROI)
                </span>
                <span className="text-xs font-bold text-[#6bff8f]">
                  {detectorResult.sourceMode === 'AUTO_COCO'
                    ? '✓ Deteksi Otomatis'
                    : detectorResult.sourceMode === 'MANUAL_CENTER_ROI'
                    ? `🎯 Center-ROI Manual (${Math.round(centerRoiScale * 100)}%)`
                    : detectorResult.sourceMode === 'FAILED_AUTO'
                    ? '⚠️ Belum Terdeteksi Otomatis'
                    : detectorResult.sourceMode === 'EMPTY_CROP'
                    ? '⚠️ Crop Kosong'
                    : 'Menunggu'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-[#083b54]/85 p-3 rounded-xl">
                  <span className="text-[#9bc1d6] block text-[11px]">Sumber / Kelas Detektor</span>
                  <strong className="text-white text-sm">{detectorResult.cocoClass}</strong>
                </div>
                <div className="bg-[#083b54]/85 p-3 rounded-xl">
                  <span className="text-[#9bc1d6] block text-[11px]">
                    Skor Detektor (Ambang {cocoThreshold.toFixed(2)})
                  </span>
                  <strong className="text-white text-sm">
                    {detectorResult.cocoScore !== null
                      ? `${(detectorResult.cocoScore * 100).toFixed(1)}%`
                      : detectorResult.sourceMode === 'MANUAL_CENTER_ROI'
                      ? `Manual ROI (${Math.round(centerRoiScale * 100)}%)`
                      : '-'}
                  </strong>
                </div>
                <div className="bg-[#083b54]/85 p-3 rounded-xl">
                  <span className="text-[#9bc1d6] block text-[11px]">
                    Kotak Terlihat [x, y, w, h]
                  </span>
                  <strong className="text-white text-xs font-mono">
                    {detectorResult.bbox ? `[${detectorResult.bbox.join(', ')}]` : '-'}
                  </strong>
                </div>
                <div className="bg-[#083b54]/85 p-3 rounded-xl">
                  <span className="text-[#9bc1d6] block text-[11px]">
                    Crop ke Classifier [x, y, w, h]
                  </span>
                  <strong className="text-[#6bff8f] text-xs font-mono">
                    {detectorResult.classifierCropBox
                      ? `[${detectorResult.classifierCropBox.join(', ')}]`
                      : '-'}
                  </strong>
                </div>
              </div>
            </div>

            {/* PANEL B: HASIL CLASSIFIER RESIN PLASTIK SECARA TERPISAH */}
            <div className="bg-[#004c6e]/75 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#f0a345]/25 text-[#ffc278] border border-[#f0a345]/50">
                  Tahap B · Classifier Resin (MobileNetV2 α=0.50)
                </span>
                <span className="text-[11px] text-[#b3e0f2]">Input: 224×224 RGB [0, 255] · T=1.0</span>
              </div>

              {/* PRATINJAU CROP 224x224 & SKOR TERTINGGI */}
              <div className="flex items-center gap-3.5">
                <canvas
                  ref={cropCanvasRef}
                  width={224}
                  height={224}
                  className="w-24 h-24 rounded-xl border-2 border-[#f0a345] bg-[#042231] shrink-0"
                />
                <div className="grid grid-cols-1 gap-2 flex-1 text-xs">
                  <div className="bg-[#083b54]/85 p-2.5 rounded-xl">
                    <span className="text-[#9bc1d6] block text-[11px]">
                      Prediksi Kandidat Resin Tertinggi
                    </span>
                    <strong className="text-white text-sm">
                      {classifierResult.topClass ? classifierResult.topClass : '-'}
                    </strong>
                  </div>
                  <div className="bg-[#083b54]/85 p-2.5 rounded-xl">
                    <span className="text-[#9bc1d6] block text-[11px]">
                      Skor Prediksi (Belum Terkalibrasi) vs Ambang Aktif{' '}
                      {classifierResult.appliedThreshold.toFixed(2)}
                    </span>
                    <strong className="text-white text-sm">
                      {classifierResult.topScore !== null
                        ? `${(classifierResult.topScore * 100).toFixed(1)}% (${
                            classifierResult.accepted ? '≥' : '<'
                          } ${(classifierResult.appliedThreshold * 100).toFixed(0)}%)`
                        : '-'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* BANNER KEPUTUSAN AKHIR */}
              <div
                className={`p-3.5 rounded-xl border-2 text-center ${
                  classifierResult.accepted
                    ? 'bg-[#006e2f]/45 border-[#6bff8f] text-[#6bff8f]'
                    : 'bg-[#d27b22]/30 border-[#f0a345] text-[#ffd59e]'
                }`}
              >
                <p className="font-extrabold text-sm font-[family-name:var(--font-outfit)]">
                  {classifierResult.statusHeadline}
                </p>
                <p className="text-xs text-white/90 mt-1 leading-relaxed">
                  {classifierResult.statusDetail}
                </p>
              </div>

              {/* PERINGATAN VALIDASI KELAS MINORITAS (3-PVC, 6-PS, 7-OTHER) */}
              {classifierResult.isMinorityClass && (
                <div className="p-3 rounded-xl bg-[#ba1a1a]/35 border border-red-300 text-xs text-[#ffdad6]">
                  <strong className="block text-white mb-0.5">
                    ⚠️ Catatan Keandalan Kelas ({classifierResult.topClass}):
                  </strong>
                  Keandalan prediksi untuk kelas PVC, PS, dan OTHER masih perlu divalidasi lebih lanjut karena jumlah sampel pelatihan yang terbatas. Jangan menganggap skor tinggi sebagai bukti komposisi kimia.
                </div>
              )}

              {/* KARTU EDUKASI POLIMER (HANYA JIKA DITERIMA DI ATAS AMBANG AKTIF) */}
              {classifierResult.accepted && activeResinInfo && (
                <div className="p-3.5 rounded-xl bg-[#083b54]/90 border border-[#6bff8f]/30 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#6bff8f]">{activeResinInfo.code}</span>
                    <span className="text-[11px] text-[#b3e0f2]">{activeResinInfo.polymerName}</span>
                  </div>
                  <p className="text-white/90">
                    <strong>Contoh Kemasan:</strong> {activeResinInfo.commonExamples}
                  </p>
                  <p className="text-[#b3e0f2] text-[11px] leading-relaxed">
                    <strong>Risiko Mikroplastik:</strong> {activeResinInfo.microplasticRisk}
                  </p>
                </div>
              )}

              {/* DISTRIBUSI SKOR 7 KELAS */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-bold text-[#b3e0f2]">
                  Distribusi Skor Softmax 7 Kelas (Tanpa Penggabungan Kelas):
                </p>
                {RESIN_CLASSES.map((cls, idx) => {
                  const prob = classifierResult.allProbs[idx] || 0;
                  const pct = (prob * 100).toFixed(1);
                  const isMin = (MINORITY_CLASSES as readonly string[]).includes(cls);
                  return (
                    <div key={cls} className="flex items-center gap-2 text-xs">
                      <span className="w-28 font-bold text-white shrink-0">
                        {cls}{' '}
                        {isMin && (
                          <span className="text-[10px] text-[#ffb4ab] font-normal">(Validasi*)</span>
                        )}
                      </span>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#006591] to-[#6bff8f] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono text-[11px]">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PANEL C: TELEMETRI PERFORMA, LOG KEPUTUSAN AKTIF, & STATUS RUTE ASET STAGING */}
            <div className="bg-[#004c6e]/75 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 shadow-xl text-xs space-y-2">
              <h3 className="font-extrabold text-sm font-[family-name:var(--font-outfit)] text-[#6bff8f] border-b border-white/10 pb-2">
                Telemetri Inferensi, Log Keputusan Aktif & Status Rute Aset
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#083b54]/85 p-2.5 rounded-xl">
                  <span className="text-[#9bc1d6] block text-[10px]">Latensi COCO-SSD / Crop</span>
                  <strong className="text-white">
                    {telemetry.cocoInferMs !== null ? `${telemetry.cocoInferMs} ms` : '-'} /{' '}
                    {telemetry.cropResizeMs !== null ? `${telemetry.cropResizeMs} ms` : '-'}
                  </strong>
                </div>
                <div className="bg-[#083b54]/85 p-2.5 rounded-xl">
                  <span className="text-[#9bc1d6] block text-[10px]">Latensi Classifier / Total</span>
                  <strong className="text-white">
                    {telemetry.resinInferMs !== null ? `${telemetry.resinInferMs} ms` : '-'} /{' '}
                    {telemetry.totalPipelineMs !== null ? `${telemetry.totalPipelineMs} ms` : '-'}
                  </strong>
                </div>
                <div className="bg-[#083b54]/85 p-2.5 rounded-xl">
                  <span className="text-[#9bc1d6] block text-[10px]">Memori Aktif TF.js</span>
                  <strong className="text-white">
                    {telemetry.numTensors} tensor ({telemetry.numBytesMb} MB)
                  </strong>
                </div>
                <div className="bg-[#083b54]/85 p-2.5 rounded-xl">
                  <span className="text-[#9bc1d6] block text-[10px]">Status Rute Aset</span>
                  <strong className="text-[#6bff8f] text-[11px]">{telemetry.assetRouteStatus}</strong>
                </div>
                <div className="bg-[#083b54]/95 p-2.5 rounded-xl col-span-2 border border-white/10">
                  <span className="text-[#9bc1d6] block text-[10px] mb-0.5">
                    Log Keputusan Aktif (Mengikuti State Slider Saat Ini)
                  </span>
                  <code className="text-[11px] text-[#ffd59e] break-all block leading-relaxed">
                    {telemetry.lastDecisionLog}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
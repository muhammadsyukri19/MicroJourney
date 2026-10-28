'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

type Phase = 'init' | 'scanning' | 'detected' | 'pemantik';

interface Props {
  onComplete: () => void;
}

export default function Stage1Scanner({ onComplete }: Props) {
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

  const stopCamera = useCallback(() => {
    activeRef.current = false;
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  async function startCamera() {
    setCameraError(null);
    setModelLoading(true);
    activeRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setPhase('scanning');

      const [tf, cocoSsd] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/coco-ssd'),
      ]);
      await tf.ready();
      const model = await cocoSsd.load();
      setModelLoading(false);

      const plasticClasses = ['bottle', 'cup', 'bowl', 'vase', 'wine glass', 'cell phone', 'remote'];

      async function detect() {
        if (!activeRef.current || !videoRef.current || !overlayRef.current) return;
        const video = videoRef.current;
        const canvas = overlayRef.current;
        const ctx = canvas.getContext('2d')!;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const preds = await model.detect(video);
        const plastic = preds.find(p => plasticClasses.includes(p.class) && p.score > 0.4);

        if (plastic && activeRef.current) {
          const [x, y, w, h] = plastic.bbox;
          const conf = Math.round(plastic.score * 100);
          setConfidence(conf);
          setDetectedClass(plastic.class);

          const color = conf >= 80 ? '#00ff88' : '#ffcc00';
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, w, h);

          // Corner marks
          const cl = 20;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 4;
          [[x, y + cl, x, y, x + cl, y], [x + w - cl, y, x + w, y, x + w, y + cl],
           [x, y + h - cl, x, y + h, x + cl, y + h], [x + w - cl, y + h, x + w, y + h, x + w, y + h - cl]
          ].forEach(([x1, y1, x2, y2, x3, y3]) => {
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke();
          });

          ctx.fillStyle = conf >= 80 ? 'rgba(0,255,136,0.85)' : 'rgba(255,204,0,0.85)';
          ctx.fillRect(x, y - 30, 200, 28);
          ctx.fillStyle = '#000';
          ctx.font = 'bold 13px monospace';
          ctx.fillText(`${plastic.class.toUpperCase()} · ${conf}% KEPERCAYAAN`, x + 6, y - 10);

          if (conf >= 80 && activeRef.current) {
            stopCamera();
            setPhase('detected');
            setTimeout(() => setPhase('pemantik'), 800);
            return;
          }
        } else {
          setConfidence(0);
          setDetectedClass('');
        }

        animRef.current = requestAnimationFrame(detect);
      }

      detect();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kamera tidak dapat diakses';
      setCameraError(msg);
      setModelLoading(false);
    }
  }

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="relative w-full h-full bg-black flex flex-col overflow-hidden">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
      <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Scanline effect */}
      {phase === 'scanning' && <div className="ar-scanline absolute inset-0 pointer-events-none" />}

      {/* Init screen */}
      {phase === 'init' && !cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
          <div className="text-center p-8 max-w-sm">
            <span className="material-symbols-outlined text-green-400 text-6xl mb-6 block">photo_camera</span>
            <h2 className="text-white font-bold text-2xl mb-3">Scanner AI Aktif</h2>
            <p className="text-white/60 text-sm mb-6">Arahkan kamera ke objek sampah plastik di sekitarmu. AI akan mendeteksi dan menganalisisnya secara real-time.</p>
            <button
              onClick={startCamera}
              className="bg-green-500 text-black font-bold px-8 py-4 rounded-xl text-lg flex items-center gap-2 mx-auto"
            >
              <span className="material-symbols-outlined">qr_code_scanner</span> Aktifkan Kamera
            </button>
          </div>
        </div>
      )}

      {/* Camera error */}
      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950 flex-col gap-4 p-8">
          <span className="material-symbols-outlined text-red-400 text-6xl">no_photography</span>
          <p className="text-white text-center">Kamera tidak dapat diakses.<br /><span className="text-white/60 text-sm">{cameraError}</span></p>
          <button onClick={startCamera} className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-xl font-bold">Coba Lagi</button>
          <button onClick={() => { setPhase('pemantik'); }} className="text-white/50 text-sm underline">Lewati (tampilkan pemantik)</button>
        </div>
      )}

      {/* Scanning HUD */}
      {phase === 'scanning' && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Corner brackets */}
          {[['top-8 left-8', 'border-t-4 border-l-4'], ['top-8 right-8', 'border-t-4 border-r-4'],
            ['bottom-8 left-8', 'border-b-4 border-l-4'], ['bottom-8 right-8', 'border-b-4 border-r-4']
          ].map(([pos, border]) => (
            <div key={pos} className={`absolute ${pos} w-16 h-16 ${border} border-green-400 opacity-70`} />
          ))}

          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-6 py-2 rounded-full border border-green-400/40">
            <p className="text-green-400 text-sm font-mono font-bold tracking-widest">
              {modelLoading ? '⟳ MEMUAT MODEL AI...' : confidence > 0 ? `OBJEK TERDETEKSI · ${confidence}%` : 'ARAHKAN KE SAMPAH PLASTIK'}
            </p>
          </div>

          {confidence > 0 && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-72">
              <p className="text-white text-xs text-center mb-2 font-mono uppercase tracking-wider">{detectedClass} · Kepercayaan AI</p>
              <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{ width: `${confidence}%`, background: confidence >= 80 ? '#00ff88' : confidence >= 60 ? '#ffcc00' : '#ff6b6b' }}
                />
              </div>
              <p className="text-white/60 text-xs text-center mt-1">{confidence}% / 80% diperlukan untuk lock</p>
            </div>
          )}
        </div>
      )}

      {/* Detected flash */}
      {phase === 'detected' && (
        <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
      )}

      {/* Pemantik modal */}
      {phase === 'pemantik' && (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
              </div>
            </div>
            <p className="text-xs font-bold text-green-600 uppercase tracking-widest text-center mb-2">
              Objek Plastik Terdeteksi ✓
            </p>
            <h3 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-center mb-5">
              Pertanyaan Pemantik
            </h3>
            <div className="bg-[var(--color-primary-fixed)] border-l-4 border-[var(--color-primary)] rounded-lg p-5 mb-5">
              <p className="text-sm text-[var(--color-on-primary-fixed)] leading-relaxed italic">
                &ldquo;Bagaimana mungkin benda padat sintetis ini bisa menembus dan menetap di dalam usus manusia — sedangkan tubuh kita dirancang untuk mencerna makanan?&rdquo;
              </p>
            </div>
            <p className="text-xs text-[var(--color-on-surface-variant)] text-center mb-6">
              Pikirkan jawabannya. Mulai investigasi AR untuk membuktikannya secara ilmiah.
            </p>
            <button
              onClick={onComplete}
              className="w-full bg-[var(--color-primary)] text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
            >
              Mulai Investigasi <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

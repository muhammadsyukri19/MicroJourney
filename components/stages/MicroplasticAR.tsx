'use client';
import { useEffect, useRef, useState, type CSSProperties, type DetailedHTMLProps, type HTMLAttributes } from 'react';
import { createPortal } from 'react-dom';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, unknown>;
    }
  }
}

const VIEWER_SCRIPT = '/vendor/model-viewer/model-viewer-4.4.0.min.js';
const MODEL_GLB = '/models/microplastic/microplastic.glb';
const MODEL_USDZ = '/models/microplastic/microplastic.usdz';

const PARTS = [
  { name: 'Fragmen', note: 'pecahan', color: '#6eb4dc' },
  { name: 'Pelet', note: 'butiran', color: '#6ef5d2' },
  { name: 'Serat', note: 'helaian', color: '#46dceb' },
];

let viewerScript: Promise<void> | null = null;

/** Pustaka hanya diunduh saat layar AR dibuka, supaya halaman lain tidak ikut berat */
function loadViewerScript() {
  viewerScript ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = VIEWER_SCRIPT;
    script.onload = () => resolve();
    script.onerror = () => {
      viewerScript = null;
      script.remove();
      reject(new Error('Pustaka AR gagal dimuat'));
    };
    document.head.appendChild(script);
  });
  return viewerScript;
}

/**
 * AR permukaan: model berdiri di lantai atau meja dan tetap di tempatnya saat HP digerakkan.
 * iPhone memakai Quick Look, Android memakai WebXR atau Scene Viewer; tanpa AR model tetap bisa diputar.
 */
export default function MicroplasticAR({ onClose }: { onClose: () => void }) {
  const viewerRef = useRef<HTMLElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadViewerScript()
      .then(() => {
        if (!cancelled) setScriptReady(true);
      })
      .catch(() => {
        if (!cancelled) setProblem('Model 3D belum bisa dimuat. Periksa koneksi internet, lalu coba lagi.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!scriptReady || !viewer) return;
    let timer = 0;
    const checkAr = () => setArSupported(Boolean((viewer as HTMLElement & { canActivateAR?: boolean }).canActivateAR));
    const onLoad = () => {
      setModelReady(true);
      checkAr();
      // Dukungan AR di Android baru diketahui beberapa saat setelah pustaka memeriksa perangkat
      timer = window.setTimeout(checkAr, 1200);
    };
    const onError = () => setProblem('Model 3D belum bisa dimuat. Periksa koneksi internet, lalu coba lagi.');
    const onArStatus = (event: Event) => {
      const status = (event as CustomEvent<{ status: string }>).detail?.status;
      if (status === 'failed') setProblem('AR gagal dibuka di HP ini. Coba lagi, atau putar model 3D-nya dengan jari.');
      else setProblem(null);
    };
    viewer.addEventListener('load', onLoad);
    viewer.addEventListener('error', onError);
    viewer.addEventListener('ar-status', onArStatus);
    return () => {
      window.clearTimeout(timer);
      viewer.removeEventListener('load', onLoad);
      viewer.removeEventListener('error', onError);
      viewer.removeEventListener('ar-status', onArStatus);
    };
  }, [scriptReady]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#06293b] text-white">
      <div className="shrink-0 flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button
          onClick={onClose}
          aria-label="Tutup AR"
          className="w-11 h-11 shrink-0 rounded-full bg-white/15 border border-white/25 flex items-center justify-center active:scale-95"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-outfit)] text-lg font-bold leading-tight">Mikroplastik 3D</h2>
          <p className="text-[13px] text-[#6bff8f] font-semibold leading-snug">Diperbesar. Ukuran aslinya kurang dari 5 mm.</p>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        {scriptReady && (
          <model-viewer
            ref={viewerRef}
            src={MODEL_GLB}
            ios-src={MODEL_USDZ}
            alt="Model 3D mikroplastik berupa fragmen, pelet, dan serat"
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="auto"
            ar-placement="floor"
            camera-controls
            touch-action="pan-y"
            interaction-prompt="none"
            autoplay
            auto-rotate
            shadow-intensity="1"
            exposure="1"
            style={{ width: '100%', height: '100%', backgroundColor: 'transparent', '--poster-color': 'transparent' } as CSSProperties}
          >
            <button
              slot="ar-button"
              className={`absolute inset-x-4 bottom-3 min-h-14 ${arSupported === false ? 'hidden' : 'flex'} items-center justify-center gap-2 bg-[#6bff8f] text-[#06293b] text-lg font-extrabold rounded-2xl shadow-lg active:scale-95 font-[family-name:var(--font-outfit)]`}
            >
              <span className="material-symbols-outlined text-2xl">view_in_ar</span>
              Tampilkan di ruanganmu
            </button>
          </model-viewer>
        )}
        {!modelReady && !problem && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <div className="w-12 h-12 rounded-full border-4 border-white/15 border-t-[#6bff8f] animate-spin" />
            <p className="text-sm font-semibold text-white/80">Menyiapkan model 3D…</p>
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex justify-center gap-4">
          {PARTS.map(part => (
            <div key={part.name} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: part.color }} />
              <span className="text-[13px] font-semibold leading-tight">
                {part.name} <span className="font-normal text-white/70">({part.note})</span>
              </span>
            </div>
          ))}
        </div>
        <p className={`mt-2 text-center text-[13px] leading-snug ${problem ? 'text-[#ffb4ab] font-semibold' : 'text-white/80'}`}>
          {problem ??
            (arSupported === false
              ? 'Perangkat ini belum mendukung AR, tapi model 3D tetap bisa kamu putar dengan jari.'
              : 'Tekan tombol, arahkan HP ke lantai atau meja, lalu gerakkan perlahan sampai model muncul.')}
        </p>
      </div>
    </div>,
    document.body,
  );
}

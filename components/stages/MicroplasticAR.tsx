'use client';
import { useEffect, useRef, useState, type CSSProperties, type DetailedHTMLProps, type HTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { MICROPLASTIC_TYPES, type MicroplasticType } from '@/lib/microplasticTypes';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, unknown>;
    }
  }
}

const VIEWER_SCRIPT = '/vendor/model-viewer/model-viewer-4.4.0.min.js';
const LOAD_PROBLEM = 'Model 3D belum bisa dimuat. Periksa koneksi internet, lalu coba lagi.';

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
 * AR permukaan: model berada di lantai atau meja dan tetap di tempatnya saat HP digerakkan.
 * iPhone memakai Quick Look, Android memakai WebXR atau Scene Viewer; tanpa AR model tetap bisa diputar.
 * Tiap kategori punya geometri dan penjelasannya sendiri.
 */
export default function MicroplasticAR({ onClose, organName }: { onClose: () => void; organName?: string }) {
  const viewerRef = useRef<HTMLElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [type, setType] = useState<MicroplasticType>(MICROPLASTIC_TYPES[0]);

  useEffect(() => {
    let cancelled = false;
    loadViewerScript()
      .then(() => {
        if (!cancelled) setScriptReady(true);
      })
      .catch(() => {
        if (!cancelled) setProblem(LOAD_PROBLEM);
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
      window.clearTimeout(timer);
      timer = window.setTimeout(checkAr, 1200);
    };
    const onError = () => setProblem(LOAD_PROBLEM);
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

  const selectType = (next: MicroplasticType) => {
    if (next.id === type.id) return;
    setType(next);
    setModelReady(false);
    setProblem(null);
  };

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
          <p className="text-[13px] text-[#6bff8f] font-semibold leading-snug">Diperbesar. Aslinya kurang dari 5 mm.</p>
        </div>
      </div>

      <div role="group" aria-label="Pilih bentuk mikroplastik" className="shrink-0 flex gap-1.5 px-4 pb-1">
        {MICROPLASTIC_TYPES.map(item => (
          <button
            key={item.id}
            onClick={() => selectType(item)}
            aria-pressed={item.id === type.id}
            className={`flex-auto min-h-11 px-1 rounded-xl border text-[13px] font-bold active:scale-95 ${
              item.id === type.id ? 'bg-[#6bff8f] border-[#6bff8f] text-[#06293b]' : 'bg-white/10 border-white/20 text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative flex-1 min-h-0">
        {scriptReady && (
          <model-viewer
            ref={viewerRef}
            src={`/models/microplastic/${type.id}.glb`}
            ios-src={`/models/microplastic/${type.id}.usdz`}
            alt={type.alt}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="auto"
            ar-placement="floor"
            camera-controls
            camera-orbit="20deg 52deg 100%"
            min-camera-orbit="auto auto 25%"
            touch-action="none"
            interaction-prompt="none"
            auto-rotate
            rotation-per-second="14deg"
            shadow-intensity="1"
            exposure="1"
            style={{ width: '100%', height: '100%', backgroundColor: 'transparent', '--poster-color': 'transparent' } as CSSProperties}
          >
            {/* Tombol bawaan pustaka diganti tombol di bawah model */}
            <span slot="ar-button" hidden />
          </model-viewer>
        )}
        {!modelReady && !problem && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <div className="w-12 h-12 rounded-full border-4 border-white/15 border-t-[#6bff8f] animate-spin" />
            <p className="text-sm font-semibold text-white/80">Menyiapkan model 3D…</p>
          </div>
        )}
      </div>

      {arSupported !== false && (
        <div className="shrink-0 px-4 pt-1">
          <button
            onClick={() => (viewerRef.current as (HTMLElement & { activateAR?: () => Promise<void> }) | null)?.activateAR?.()}
            disabled={!modelReady}
            className="w-full min-h-13 flex items-center justify-center gap-2 bg-[#6bff8f] disabled:opacity-60 text-[#06293b] text-lg font-extrabold rounded-2xl shadow-lg active:scale-95 font-[family-name:var(--font-outfit)]"
          >
            <span className="material-symbols-outlined text-2xl">view_in_ar</span>
            Tampilkan di ruanganmu
          </button>
        </div>
      )}

      <div className="shrink-0 px-4 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p className="text-[13px] leading-snug">
          {type.shape}
          {type.size && <span className="text-[#6bff8f] font-semibold"> Di foto rujukan: {type.size}.</span>}
          {type.note && <span className="text-white/75"> {type.note}</span>}
        </p>
        {organName && (
          <p className="mt-1 text-[12px] leading-snug text-[#ffdf9a]">
            Ini bentuk umum, bukan bentuk yang pasti ada di {organName}.
          </p>
        )}
        <p className="mt-1 text-[11px] leading-snug text-white/65">
          Ilustrasi 3D dari bentuk pada foto mikroskop, bukan hasil pindai. Ketebalan dan warna hanya perkiraan, dan bentuk tidak menunjukkan jenis plastiknya.
          {type.sources.length > 0 && ' Rujukan: '}
          {type.sources.map((source, index) => (
            <span key={source.url}>
              {index > 0 && ', '}
              <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                {source.label}
              </a>
            </span>
          ))}
        </p>
        <p className={`mt-1 text-[13px] leading-snug ${problem ? 'text-[#ffb4ab] font-semibold' : 'text-white/85'}`}>
          {problem ??
            (arSupported === false
              ? 'Perangkat ini belum mendukung AR, tapi model 3D tetap bisa kamu putar dan perbesar dengan jari.'
              : 'Tekan tombol, arahkan HP ke lantai atau meja, lalu gerakkan perlahan sampai model muncul.')}
        </p>
      </div>
    </div>,
    document.body,
  );
}

'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { loadViewerScript } from '@/lib/modelViewer';

const MODEL_BASE = '/models/organs';
const LOAD_PROBLEM = 'Model 3D belum bisa dimuat. Periksa koneksi internet, lalu coba lagi.';

export type OrganViewId = 'lengkap' | 'kerongkongan' | 'lambung' | 'usus_halus' | 'usus_besar' | 'darah';

/** Pusat dan jarak kamera berasal dari keluaran scripts/build-organ-model.py, dalam meter */
const VIEWS: Record<OrganViewId, { label: string; clip: string; material: string | null; target: string; orbit: string }> = {
  lengkap: { label: 'Jalur lengkap', clip: 'jalur_lengkap', material: null, target: '0m 0.33m 0m', orbit: '0deg 85deg 1.2m' },
  kerongkongan: { label: 'Kerongkongan (mulut tidak dimodelkan)', clip: 'kerongkongan', material: 'kerongkongan', target: '0m 0.535m -0.024m', orbit: '0deg 85deg 0.65m' },
  lambung: { label: 'Lambung', clip: 'lambung', material: 'lambung', target: '0.04m 0.366m 0.028m', orbit: '0deg 85deg 0.5m' },
  usus_halus: { label: 'Usus halus', clip: 'usus_halus', material: 'usus_halus', target: '0m 0.207m 0.033m', orbit: '0deg 85deg 0.72m' },
  usus_besar: { label: 'Usus besar', clip: 'usus_besar', material: 'usus_besar', target: '-0.002m 0.166m -0.003m', orbit: '0deg 85deg 0.85m' },
  darah: { label: 'Jalur lengkap, tanpa partikel', clip: 'jalur_lengkap', material: null, target: '0m 0.33m 0m', orbit: '0deg 85deg 1.2m' },
};

// Usus halus berlapis-lapis, jadi dibuat lebih tembus supaya partikel di dalamnya tetap terlihat
const ORGAN_ALPHA: Record<string, { rest: number; focus: number }> = {
  kerongkongan: { rest: 0.5, focus: 0.55 },
  lambung: { rest: 0.5, focus: 0.5 },
  usus_halus: { rest: 0.38, focus: 0.3 },
  usus_besar: { rest: 0.45, focus: 0.42 },
};
const DIM_ALPHA = 0.1;

type ViewerMaterial = {
  name: string;
  setAlphaMode: (mode: 'OPAQUE' | 'BLEND') => void;
  pbrMetallicRoughness: { baseColorFactor: number[]; setBaseColorFactor: (color: number[]) => void };
};

type ViewerElement = HTMLElement & {
  canActivateAR?: boolean;
  activateAR?: () => Promise<void>;
  cameraOrbit?: string;
  getCameraOrbit?: () => { theta: number; phi: number; radius: number };
  play?: () => void;
  pause?: () => void;
  model?: { materials: ViewerMaterial[] };
};

function ControlButton({ icon, label, onClick, active }: { icon: string; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`flex-1 min-w-11 h-11 rounded-xl border flex items-center justify-center active:scale-95 ${
        active === false ? 'bg-white/5 border-white/15 text-white/60' : 'bg-white/15 border-white/25 text-white'
      }`}
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
    </button>
  );
}

/**
 * Saluran pencernaan 3D dengan partikel ilustratif. Hanya satu sistem: model-viewer menangani tampilan 3D,
 * dan aset yang sama dipakai untuk AR (WebXR atau Scene Viewer di Android, Quick Look di iPhone).
 */
export default function OrganViewer3D({ view, paused }: { view: OrganViewId; paused?: boolean }) {
  const viewerRef = useRef<ViewerElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [scriptReady, setScriptReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [arProblem, setArProblem] = useState<string | null>(null);
  const [particlesOn, setParticlesOn] = useState(true);
  const [interacted, setInteracted] = useState(false);
  const [resets, setResets] = useState(0);
  const config = VIEWS[view];
  // Aliran darah tidak dimodelkan, jadi partikel sengaja tidak ditampilkan pada pilihan ini
  const showParticles = particlesOn && view !== 'darah';

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
  }, [attempt]);

  const paint = useCallback(() => {
    const materials = viewerRef.current?.model?.materials;
    if (!materials) return;
    for (const material of materials) {
      const [r, g, b] = material.pbrMetallicRoughness.baseColorFactor;
      if (material.name.startsWith('partikel_')) {
        material.setAlphaMode(showParticles ? 'OPAQUE' : 'BLEND');
        material.pbrMetallicRoughness.setBaseColorFactor([r, g, b, showParticles ? 1 : 0]);
      } else {
        const look = ORGAN_ALPHA[material.name];
        const alpha = !config.material ? look.rest : material.name === config.material ? look.focus : DIM_ALPHA;
        material.pbrMetallicRoughness.setBaseColorFactor([r, g, b, alpha]);
      }
    }
  }, [config.material, showParticles]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!scriptReady || !viewer) return;
    let timer = 0;
    const checkAr = () => setArSupported(Boolean(viewer.canActivateAR));
    const onLoad = () => {
      setModelReady(true);
      checkAr();
      // Dukungan AR di Android baru diketahui beberapa saat setelah pustaka memeriksa perangkat
      window.clearTimeout(timer);
      timer = window.setTimeout(checkAr, 1200);
    };
    const onError = () => setProblem(LOAD_PROBLEM);
    const onProgress = (event: Event) => setProgress((event as CustomEvent<{ totalProgress: number }>).detail?.totalProgress ?? 0);
    const onArStatus = (event: Event) => {
      const status = (event as CustomEvent<{ status: string }>).detail?.status;
      setArProblem(status === 'failed' ? 'AR gagal dibuka di HP ini. Model tetap bisa diputar di layar.' : null);
    };
    const onCameraChange = (event: Event) => {
      if ((event as CustomEvent<{ source: string }>).detail?.source === 'user-interaction') setInteracted(true);
    };
    viewer.addEventListener('load', onLoad);
    viewer.addEventListener('error', onError);
    viewer.addEventListener('progress', onProgress);
    viewer.addEventListener('ar-status', onArStatus);
    viewer.addEventListener('camera-change', onCameraChange);
    return () => {
      window.clearTimeout(timer);
      viewer.removeEventListener('load', onLoad);
      viewer.removeEventListener('error', onError);
      viewer.removeEventListener('progress', onProgress);
      viewer.removeEventListener('ar-status', onArStatus);
      viewer.removeEventListener('camera-change', onCameraChange);
      viewer.pause?.();
    };
  }, [scriptReady, attempt]);

  useEffect(() => {
    if (modelReady) paint();
  }, [modelReady, paint]);

  useEffect(() => {
    if (!modelReady) return;
    const viewer = viewerRef.current;
    if (paused || !showParticles) viewer?.pause?.();
    else viewer?.play?.();
  }, [modelReady, paused, showParticles, view]);

  const zoomBy = (factor: number) => {
    const viewer = viewerRef.current;
    const current = viewer?.getCameraOrbit?.();
    if (viewer && current) viewer.cameraOrbit = `${current.theta}rad ${current.phi}rad ${current.radius * factor}m`;
  };

  const retry = () => {
    setProblem(null);
    setModelReady(false);
    setProgress(0);
    setScriptReady(false);
    setAttempt(value => value + 1);
  };

  // Atribut yang sama tidak menggerakkan kamera, jadi jaraknya diubah sedikit sekali saat Reset
  const orbit = resets % 2 ? config.orbit.replace(/([\d.]+)m$/, (_, radius) => `${Number(radius) * 1.0005}m`) : config.orbit;

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="relative flex-1 min-h-[46dvh] md:min-h-[340px] rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-[radial-gradient(ellipse_78%_62%_at_50%_50%,#1a6c8a_0%,#0c4059_55%,#06293b_100%)]">
        {problem ? (
          <div className="absolute inset-0 flex flex-col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/organ.png" alt="Gambar anatomi organ pencernaan" className="flex-1 min-h-0 w-full object-contain opacity-70" />
            <div className="shrink-0 p-3 text-center">
              <p className="text-[13px] font-semibold text-[#ffb4ab]">{problem}</p>
              <button onClick={retry} className="mt-1.5 min-h-11 px-4 rounded-xl border border-white/25 bg-white/15 text-sm font-bold active:scale-95">
                Coba lagi
              </button>
            </div>
          </div>
        ) : (
          scriptReady && (
            <model-viewer
              key={attempt}
              ref={viewerRef}
              src={`${MODEL_BASE}/digestive.glb`}
              ios-src={`${MODEL_BASE}/digestive.usdz`}
              alt="Model 3D kerongkongan, lambung, usus halus, dan usus besar dengan partikel mikroplastik ilustratif"
              ar
              ar-modes="webxr scene-viewer quick-look"
              ar-scale="auto"
              ar-placement="floor"
              camera-controls
              disable-pan
              camera-target={config.target}
              camera-orbit={orbit}
              min-camera-orbit="auto auto 0.25m"
              max-camera-orbit="auto auto 2m"
              touch-action="pan-y"
              interaction-prompt="none"
              loading="eager"
              autoplay
              animation-name={config.clip}
              animation-crossfade-duration="0"
              environment-image="/models/microplastic/v2/studio.hdr"
              exposure="1.05"
              shadow-intensity="0.5"
              shadow-softness="1"
              style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, backgroundColor: 'transparent', '--poster-color': 'transparent' } as CSSProperties}
            >
              <span slot="ar-button" hidden />
            </model-viewer>
          )
        )}

        {!problem && (
          <span className="absolute left-2 top-2 rounded-full bg-[#06293b]/85 border border-[#6bff8f]/40 px-2.5 py-1 text-[11px] font-bold text-[#6bff8f] pointer-events-none">
            {config.label}
          </span>
        )}
        {view === 'darah' && modelReady && !problem && (
          <p className="absolute inset-x-2 bottom-2 rounded-xl bg-[#06293b]/90 border border-[#ffdf9a]/40 px-3 py-2 text-[12px] leading-snug text-[#ffdf9a] pointer-events-none">
            Aliran darah tidak dimodelkan di sini, jadi partikel tidak ditampilkan.
          </p>
        )}
        {view !== 'darah' && modelReady && !interacted && !problem && (
          <span className="absolute inset-x-0 bottom-2 text-center text-[12px] font-medium text-white/80 pointer-events-none">
            Geser untuk memutar, cubit untuk memperbesar
          </span>
        )}
        {!modelReady && !problem && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <div className="w-12 h-12 rounded-full border-4 border-white/15 border-t-[#6bff8f] animate-spin" />
            <p className="text-sm font-semibold text-white/80">Menyiapkan model 3D… {Math.round(progress * 100)}%</p>
          </div>
        )}
      </div>

      <div className="shrink-0 flex gap-1.5" role="group" aria-label="Kontrol model 3D">
        <ControlButton icon="zoom_out" label="Perkecil" onClick={() => zoomBy(1.25)} />
        <ControlButton icon="zoom_in" label="Perbesar" onClick={() => zoomBy(0.8)} />
        <ControlButton icon="restart_alt" label="Atur ulang tampilan" onClick={() => setResets(value => value + 1)} />
        <ControlButton
          icon={particlesOn ? 'grain' : 'blur_off'}
          label={particlesOn ? 'Sembunyikan partikel' : 'Tampilkan partikel'}
          active={particlesOn}
          onClick={() => setParticlesOn(value => !value)}
        />
      </div>

      {arSupported !== false && !problem && (
        <button
          onClick={() => viewerRef.current?.activateAR?.()}
          disabled={!modelReady}
          className="shrink-0 w-full min-h-12 flex items-center justify-center gap-2 bg-[#6bff8f] disabled:opacity-60 text-[#06293b] font-extrabold rounded-xl shadow-lg active:scale-95 font-[family-name:var(--font-outfit)]"
        >
          <span className="material-symbols-outlined text-2xl">view_in_ar</span>
          Lihat dalam AR
        </button>
      )}
      <p className={`shrink-0 text-[12px] leading-snug ${arProblem ? 'text-[#ffb4ab] font-semibold' : 'text-white/80'}`}>
        {arProblem ??
          (arSupported === false
            ? 'AR belum didukung di perangkat ini. Model tetap bisa diputar dan diperbesar di layar.'
            : 'Jalur partikel hanya ilustrasi, bukan hasil pengamatan di dalam tubuh. Ukuran partikel sangat diperbesar.')}
      </p>
      {arSupported === false && (
        <p className="shrink-0 text-[12px] leading-snug text-white/80">Jalur partikel hanya ilustrasi, bukan hasil pengamatan di dalam tubuh. Ukuran partikel sangat diperbesar.</p>
      )}
    </div>
  );
}

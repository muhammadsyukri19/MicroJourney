'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { MICROPLASTIC_TYPES, type MicroplasticType } from '@/lib/microplasticTypes';
import { loadViewerScript } from '@/lib/modelViewer';

const MODEL_BASE = '/models/microplastic/v2';
const LOAD_PROBLEM = 'Model 3D belum bisa dimuat. Periksa koneksi internet, lalu coba lagi.';
const NOAA_URL = 'https://oceanservice.noaa.gov/facts/microplastics.html';
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';

/**
 * AR permukaan: model berada di lantai atau meja dan tetap di tempatnya saat HP digerakkan.
 * iPhone memakai Quick Look, Android memakai WebXR atau Scene Viewer; tanpa AR model tetap bisa diputar.
 * Tiap kategori punya geometri, foto pembanding, dan penjelasannya sendiri.
 */
export default function MicroplasticAR({ onClose, organName }: { onClose: () => void; organName?: string }) {
  const viewerRef = useRef<HTMLElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [type, setType] = useState<MicroplasticType>(MICROPLASTIC_TYPES[0]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [interacted, setInteracted] = useState(false);

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
    const onCameraChange = (event: Event) => {
      if ((event as CustomEvent<{ source: string }>).detail?.source === 'user-interaction') setInteracted(true);
    };
    viewer.addEventListener('load', onLoad);
    viewer.addEventListener('error', onError);
    viewer.addEventListener('ar-status', onArStatus);
    viewer.addEventListener('camera-change', onCameraChange);
    return () => {
      window.clearTimeout(timer);
      viewer.removeEventListener('load', onLoad);
      viewer.removeEventListener('error', onError);
      viewer.removeEventListener('ar-status', onArStatus);
      viewer.removeEventListener('camera-change', onCameraChange);
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

      <div className="relative flex-1 min-h-0 flex flex-col">
        <div className="relative flex-1 min-h-0 bg-[radial-gradient(ellipse_78%_62%_at_50%_54%,#1a6c8a_0%,#0c4059_55%,#06293b_100%)]">
          {scriptReady && (
            <model-viewer
              ref={viewerRef}
              src={`${MODEL_BASE}/${type.id}.glb`}
              ios-src={`${MODEL_BASE}/${type.id}.usdz`}
              alt={type.alt}
              ar
              ar-modes="webxr scene-viewer quick-look"
              ar-scale="auto"
              ar-placement="floor"
              camera-controls
              camera-orbit={type.orbit}
              min-camera-orbit="auto auto 20%"
              touch-action="none"
              interaction-prompt="none"
              loading="eager"
              {...(detailsOpen ? {} : { 'auto-rotate': true })}
              rotation-per-second="12deg"
              environment-image={`${MODEL_BASE}/studio.hdr`}
              exposure="1.2"
              shadow-intensity="1.3"
              shadow-softness="0.75"
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent', '--poster-color': 'transparent' } as CSSProperties}
            >
              {/* Tombol bawaan pustaka diganti tombol di bawah model */}
              <span slot="ar-button" hidden />
            </model-viewer>
          )}
          <span className="absolute left-3 top-2 rounded-full bg-[#06293b]/80 border border-[#6bff8f]/40 px-2.5 py-1 text-[11px] font-semibold text-[#6bff8f] pointer-events-none">
            Ilustrasi 3D, bukan hasil pindai
          </span>
          {modelReady && !interacted && (
            <span className="absolute inset-x-0 bottom-2 text-center text-[12px] font-medium text-white/80 pointer-events-none">
              Geser untuk memutar, cubit untuk memperbesar
            </span>
          )}
          {!modelReady && !problem && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
              <div className="w-12 h-12 rounded-full border-4 border-white/15 border-t-[#6bff8f] animate-spin" />
              <p className="text-sm font-semibold text-white/80">Menyiapkan model 3D…</p>
            </div>
          )}
        </div>

        {arSupported !== false && (
          <div className="shrink-0 px-4 pt-2">
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

        <div className="shrink-0 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="text-[13px] leading-snug">
            {type.shape}
            {type.size && <span className="text-[#6bff8f] font-semibold"> Contoh di foto: {type.size}.</span>}
          </p>
          {organName && (
            <p className="mt-1 text-[12px] leading-snug text-[#ffdf9a]">
              Ini bentuk umum, bukan bentuk yang pasti ada di {organName}.
            </p>
          )}
          <div className="mt-1 flex items-center gap-3">
            <p className={`flex-1 min-w-0 text-[12px] leading-snug ${problem ? 'text-[#ffb4ab] font-semibold' : 'text-white/75'}`}>
              {problem ??
                (arSupported === false
                  ? 'AR belum didukung di perangkat ini. Model tetap bisa diputar dan diperbesar.'
                  : 'Untuk AR, arahkan HP ke lantai atau meja, lalu gerakkan perlahan.')}
            </p>
            <button
              onClick={() => setDetailsOpen(true)}
              className="shrink-0 min-h-11 px-3 rounded-xl border border-white/25 bg-white/10 text-[13px] font-bold active:scale-95"
            >
              Foto asli
            </button>
          </div>
        </div>

        {detailsOpen && (
          <div className="absolute inset-0 z-10 overflow-y-auto bg-[#06293b] px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-[family-name:var(--font-outfit)] text-base font-bold">Foto asli dan sumber</h3>
              <button
                onClick={() => setDetailsOpen(false)}
                aria-label="Tutup foto asli"
                className="w-11 h-11 shrink-0 rounded-full bg-white/15 border border-white/25 flex items-center justify-center active:scale-95"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <Image
              src={type.photo.src}
              width={type.photo.width}
              height={type.photo.height}
              alt={type.photo.caption}
              unoptimized
              className="mt-1 mx-auto w-auto max-w-full max-h-[24dvh] rounded-xl"
            />
            <p className="mt-1.5 text-[12px] leading-snug">{type.photo.caption}</p>
            <p className="mt-1 text-[11px] leading-snug text-white/70">
              Foto:{' '}
              <a href={type.photo.source.url} target="_blank" rel="noreferrer" className="underline">
                {type.photo.source.label}
              </a>
              , © penulis,{' '}
              <a href={LICENSE_URL} target="_blank" rel="noreferrer" className="underline">
                CC BY 4.0
              </a>
              , {type.photo.changes}.
            </p>
            {type.size && (
              <p className="mt-1.5 text-[12px] leading-snug">
                <span className="text-[#6bff8f] font-semibold">Contoh ukuran di foto rujukan: {type.size}.</span> Ini perkiraan dari batang skala, bukan rentang semua mikroplastik.
              </p>
            )}
            {type.note && <p className="mt-1.5 text-[12px] leading-snug text-[#ffdf9a]">{type.note}</p>}
            <p className="mt-1.5 text-[11px] leading-snug text-white/80">
              Model 3D adalah ilustrasi dari bentuk pada foto. Ketebalan, warna, tekstur, dan perbandingan ukuran antarpartikel hanya perkiraan, dan bentuk tidak menunjukkan jenis plastiknya. Batas kurang dari 5 mm mengikuti{' '}
              <a href={NOAA_URL} target="_blank" rel="noreferrer" className="underline">
                NOAA
              </a>
              .
            </p>
            {type.sources.length > 0 && (
              <p className="mt-1.5 text-[11px] leading-snug text-white/80">
                Rujukan bentuk:{' '}
                {type.sources.map((source, index) => (
                  <span key={source.url}>
                    {index > 0 && ', '}
                    <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                      {source.label}
                    </a>
                  </span>
                ))}
              </p>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

import { useEffect, useRef, useState } from 'react';

type BackHandler = { run: () => boolean; priority: number };

const handlers = new Set<BackHandler>();
let returningStage: number | null = null;

function clearReturningStage(stage: number) {
  if (returningStage === stage) returningStage = null;
}

/**
 * Mendaftarkan langkah mundur di dalam tahap untuk tombol kembali di header.
 * Handler mengembalikan true bila masih ada langkah untuk dimundurkan.
 * Komponen di dalam halaman tahap memakai priority lebih tinggi agar ditanya lebih dulu.
 */
export function useStageBack(handler: () => boolean, priority = 0) {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => {
    const entry: BackHandler = { run: () => latest.current(), priority };
    handlers.add(entry);
    return () => {
      handlers.delete(entry);
    };
  }, [priority]);
}

/** Mengembalikan true bila tahap aktif sudah memundurkan langkahnya sendiri */
export function runStageBack() {
  return [...handlers].sort((a, b) => b.priority - a.priority).some(entry => entry.run());
}

/**
 * Tombol kembali: mundur satu langkah di tahap aktif. Setelah langkahnya habis, masuk ke langkah
 * terakhir tahap sebelumnya; dari Tahap 1 kembali ke peta.
 */
export function goBackStep(router: { push: (href: string) => void }, stage: number) {
  if (runStageBack()) {
    window.scrollTo(0, 0);
    return;
  }
  if (stage > 1) {
    returningStage = stage - 1;
    router.push(`/journey/tahap-${stage - 1}`);
    return;
  }
  router.push('/journey');
}

/** true bila halaman tahap ini dibuka lewat tombol kembali, jadi harus mulai dari langkah terakhirnya */
export function useReturnedToStage(stage: number) {
  const [returned] = useState(() => returningStage === stage);
  useEffect(() => clearReturningStage(stage), [stage]);
  return returned;
}

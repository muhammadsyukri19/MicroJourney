import { useEffect, useRef } from 'react';

type BackHandler = { run: () => boolean; priority: number };

const handlers = new Set<BackHandler>();

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

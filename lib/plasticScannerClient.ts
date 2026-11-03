type Box = [number, number, number, number];

export interface DetectedObject {
  bbox: Box;
  class: string;
  score: number;
}

let worker: Worker | null = null;
let ready: Promise<unknown> | null = null;
let binReady: Promise<unknown> | null = null;
let nextId = 0;
const pending = new Map<number, { resolve: (value: never) => void; reject: (err: Error) => void }>();

function failAll(err: Error) {
  pending.forEach(({ reject }) => reject(err));
  pending.clear();
  worker?.terminate();
  worker = null;
  ready = null;
  binReady = null;
}

function call<T>(message: Record<string, unknown>, transfer: Transferable[] = []): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (!worker) {
      reject(new Error('AI scanner belum dimulai'));
      return;
    }
    const id = ++nextId;
    pending.set(id, { resolve: resolve as (value: never) => void, reject });
    worker.postMessage({ ...message, id }, transfer);
  });
}

/** Menyiapkan AI di latar belakang; aman dipanggil berkali-kali */
export function startScannerAI() {
  if (ready) return ready;
  worker = new Worker(new URL('./plasticScanner.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    const request = pending.get(data.id);
    if (!request) return;
    pending.delete(data.id);
    if (data.ok) request.resolve(data.result as never);
    else request.reject(new Error(data.error));
  };
  worker.onerror = event => failAll(new Error(event.message || 'AI scanner gagal dimuat'));
  ready = call({ type: 'init', origin: window.location.origin }).catch(err => {
    failAll(err);
    throw err;
  });
  return ready;
}

/** Melepas memori AI saat siswa keluar dari Tahap 1 */
export function stopScannerAI() {
  failAll(new Error('AI scanner dihentikan'));
}

export const detectObjects = (frame: ImageBitmap) =>
  call<DetectedObject[]>({ type: 'detect', frame }, [frame]);

export const classifyCrop = (box: Box) => call<number[] | null>({ type: 'classify', box });

export const releaseFrame = () => call<null>({ type: 'release' });

/** Memuat detektor tempat sampah di worker yang sama; aman dipanggil berkali-kali */
export function startBinDetector() {
  if (binReady) return binReady;
  binReady = startScannerAI()
    .then(() => call({ type: 'initBin', origin: window.location.origin }))
    .catch(err => {
      binReady = null;
      throw err;
    });
  return binReady;
}

export const detectBin = (frame: ImageBitmap) =>
  call<{ score: number; bbox: Box } | null>({ type: 'detectBin', frame }, [frame]);

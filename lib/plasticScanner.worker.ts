// Seluruh AI scanner berjalan di sini agar tampilan tidak macet saat model dimuat atau dijalankan
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

type Box = [number, number, number, number];

type Request =
  | { id: number; type: 'init'; origin: string }
  | { id: number; type: 'detect'; frame: ImageBitmap }
  | { id: number; type: 'classify'; box: Box }
  | { id: number; type: 'release' }
  | { id: number; type: 'initBin'; origin: string }
  | { id: number; type: 'detectBin'; frame: ImageBitmap };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (message: unknown) => void;
};

let coco: cocoSsd.ObjectDetection | null = null;
let resin: tf.GraphModel | null = null;
let frame: ImageBitmap | null = null;
let cropCanvas: OffscreenCanvas | null = null;
let binModel: tf.GraphModel | null = null;
let binCanvas: OffscreenCanvas | null = null;

// Detektor tempat sampah: masukan persegi 224 dengan letterbox, keluaran grid 7x7 [skor, l, t, r, b]
const BIN_INPUT = 224;
const BIN_GRID = 7;

async function init(origin: string) {
  await tf.ready();
  const cocoUrl = `${origin}/models/coco-ssd/model.json`;
  const [loadedCoco, loadedResin] = await Promise.all([
    cocoSsd.load({ base: 'lite_mobilenet_v2', modelUrl: cocoUrl }),
    tf.loadGraphModel(`${origin}/models/plastic/model.json`),
  ]);

  // Pemanasan agar tombol Scan pertama tidak menunggu kompilasi shader
  const warmFrame = tf.zeros([300, 300, 3], 'int32') as tf.Tensor3D;
  await loadedCoco.detect(warmFrame);
  warmFrame.dispose();
  const warmCrops = tf.zeros([2, 224, 224, 3], 'float32');
  const warmOut = loadedResin.predict(warmCrops) as tf.Tensor;
  await warmOut.data();
  warmCrops.dispose();
  warmOut.dispose();

  coco = loadedCoco;
  resin = loadedResin;
  return { backend: tf.getBackend() };
}

function releaseFrame() {
  frame?.close();
  frame = null;
}

async function detect(next: ImageBitmap) {
  if (!coco) throw new Error('Model belum siap');
  releaseFrame();
  frame = next;
  const pixels = tf.browser.fromPixels(next);
  try {
    return await coco.detect(pixels, 6, 0.2);
  } finally {
    pixels.dispose();
  }
}

// Crop diperkecil ke 224x224 (Rescaling sudah tertanam di graph), dirata-ratakan dengan versi cerminnya
function classify([x, y, w, h]: Box): number[] | null {
  const cw = Math.round(w);
  const ch = Math.round(h);
  if (!frame || !resin || cw < 8 || ch < 8) return null;

  if (!cropCanvas) cropCanvas = new OffscreenCanvas(cw, ch);
  if (cropCanvas.width !== cw) cropCanvas.width = cw;
  if (cropCanvas.height !== ch) cropCanvas.height = ch;
  const ctx = cropCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(frame, Math.round(x), Math.round(y), cw, ch, 0, 0, cw, ch);

  // Crop yang nyaris satu warna tidak perlu dinilai
  const data = ctx.getImageData(0, 0, cw, ch).data;
  const step = Math.max(4, Math.floor(data.length / 4 / 1024)) * 4;
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += step) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += lum;
    sumSq += lum * lum;
    count++;
  }
  if (count === 0) return null;
  const mean = sum / count;
  if (sumSq / count - mean * mean < 1.0) return null;

  const model = resin;
  const canvas = cropCanvas;
  return tf.tidy(() => {
    const resized = tf.image
      .resizeBilinear(tf.browser.fromPixels(canvas as unknown as HTMLCanvasElement), [224, 224], false)
      .toFloat();
    const output = model.predict(tf.stack([resized, tf.reverse(resized, 1)])) as tf.Tensor;
    return Array.from(output.mean(0).dataSync());
  });
}

// Baru dimuat saat siswa mencari tempat sampah, agar unduhan awal Tahap 1 tidak bertambah
async function initBin(origin: string) {
  if (binModel) return;
  const model = await tf.loadGraphModel(`${origin}/models/bin/model.json`);
  const warmInput = tf.zeros([1, BIN_INPUT, BIN_INPUT, 3], 'float32');
  const warmOutput = model.predict(warmInput) as tf.Tensor;
  await warmOutput.data();
  warmInput.dispose();
  warmOutput.dispose();
  binModel = model;
}

function detectBin(next: ImageBitmap) {
  if (!binModel) {
    next.close();
    throw new Error('Detektor tempat sampah belum siap');
  }
  if (!binCanvas) binCanvas = new OffscreenCanvas(BIN_INPUT, BIN_INPUT);
  const ctx = binCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    next.close();
    return null;
  }
  // Letterbox: sama seperti saat model dilatih
  const scale = BIN_INPUT / Math.max(next.width, next.height);
  const drawW = Math.max(1, Math.round(next.width * scale));
  const drawH = Math.max(1, Math.round(next.height * scale));
  const offsetX = Math.floor((BIN_INPUT - drawW) / 2);
  const offsetY = Math.floor((BIN_INPUT - drawH) / 2);
  ctx.fillStyle = 'rgb(128,128,128)';
  ctx.fillRect(0, 0, BIN_INPUT, BIN_INPUT);
  ctx.drawImage(next, offsetX, offsetY, drawW, drawH);
  next.close();

  const model = binModel;
  const canvas = binCanvas;
  const grid = tf.tidy(() => {
    const input = tf.browser.fromPixels(canvas as unknown as HTMLCanvasElement).toFloat().expandDims(0);
    return (model.predict(input) as tf.Tensor).dataSync();
  });

  let best = 0;
  for (let i = 1; i < BIN_GRID * BIN_GRID; i++) {
    if (grid[i * 5] > grid[best * 5]) best = i;
  }
  const row = Math.floor(best / BIN_GRID);
  const col = best % BIN_GRID;
  const centerX = ((col + 0.5) / BIN_GRID) * BIN_INPUT;
  const centerY = ((row + 0.5) / BIN_GRID) * BIN_INPUT;
  const left = centerX - grid[best * 5 + 1] * BIN_INPUT;
  const top = centerY - grid[best * 5 + 2] * BIN_INPUT;
  const right = centerX + grid[best * 5 + 3] * BIN_INPUT;
  const bottom = centerY + grid[best * 5 + 4] * BIN_INPUT;
  return {
    score: grid[best * 5],
    bbox: [
      (left - offsetX) / scale,
      (top - offsetY) / scale,
      (right - left) / scale,
      (bottom - top) / scale,
    ] as Box,
  };
}

scope.onmessage = async ({ data }) => {
  try {
    let result: unknown = null;
    if (data.type === 'init') result = await init(data.origin);
    else if (data.type === 'detect') result = await detect(data.frame);
    else if (data.type === 'classify') result = classify(data.box);
    else if (data.type === 'initBin') await initBin(data.origin);
    else if (data.type === 'detectBin') result = detectBin(data.frame);
    else releaseFrame();
    scope.postMessage({ id: data.id, ok: true, result });
  } catch (err) {
    scope.postMessage({ id: data.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};

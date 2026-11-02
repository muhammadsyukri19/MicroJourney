// Seluruh AI scanner berjalan di sini agar tampilan tidak macet saat model dimuat atau dijalankan
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

type Box = [number, number, number, number];

type Request =
  | { id: number; type: 'init'; origin: string }
  | { id: number; type: 'detect'; frame: ImageBitmap }
  | { id: number; type: 'classify'; box: Box }
  | { id: number; type: 'release' };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (message: unknown) => void;
};

let coco: cocoSsd.ObjectDetection | null = null;
let resin: tf.GraphModel | null = null;
let frame: ImageBitmap | null = null;
let cropCanvas: OffscreenCanvas | null = null;

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

scope.onmessage = async ({ data }) => {
  try {
    let result: unknown = null;
    if (data.type === 'init') result = await init(data.origin);
    else if (data.type === 'detect') result = await detect(data.frame);
    else if (data.type === 'classify') result = classify(data.box);
    else releaseFrame();
    scope.postMessage({ id: data.id, ok: true, result });
  } catch (err) {
    scope.postMessage({ id: data.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};

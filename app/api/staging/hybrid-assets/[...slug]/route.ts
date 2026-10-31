import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const RESIN_MODEL_DIR = path.resolve(
  process.cwd(),
  'experiments/plastic_resin_dataset/exp01_mobilenetv2_050/tfjs_graph_model'
);
const COCO_CACHE_DIR = path.resolve(
  process.cwd(),
  'experiments/.cache/ssdlite_mobilenet_v2'
);
const EXP02_DIR = path.resolve(
  process.cwd(),
  'experiments/plastic_resin_dataset/exp02_hybrid_poc'
);

const MIME_MAP: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.bin': 'application/octet-stream',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function resolveStagingAssetPath(slug: string[]): { filePath: string; contentType: string } | null {
  if (!slug || slug.length === 0) return null;

  // 1. Resin Classifier model assets: /api/staging/hybrid-assets/resin/<filename>
  if (slug[0] === 'resin' && slug.length === 2) {
    const safeName = path.basename(slug[1]);
    const filePath = path.join(RESIN_MODEL_DIR, safeName);
    const ext = path.extname(safeName).toLowerCase();
    return {
      filePath,
      contentType: MIME_MAP[ext] || 'application/octet-stream',
    };
  }

  // 2. COCO-SSD cached model assets: /api/staging/hybrid-assets/coco-ssd/<filename>
  if (slug[0] === 'coco-ssd' && slug.length === 2) {
    const safeName = path.basename(slug[1]);
    const filePath = path.join(COCO_CACHE_DIR, safeName);
    const contentType = safeName.endsWith('.json')
      ? 'application/json; charset=utf-8'
      : 'application/octet-stream';
    return { filePath, contentType };
  }

  // 3. Sample images for staging verification: /api/staging/hybrid-assets/samples/<group>/<filename>
  if (slug[0] === 'samples' && slug.length === 3) {
    const group = slug[1];
    const safeName = path.basename(slug[2]);
    let subDir = '';
    if (group === 'external') subDir = 'external_test_images';
    else if (group === 'test') subDir = 'test_full_images';
    else if (group === 'negative') subDir = 'negative_control_images';
    else return null;

    const filePath = path.join(EXP02_DIR, subDir, safeName);
    const ext = path.extname(safeName).toLowerCase();
    return {
      filePath,
      contentType: MIME_MAP[ext] || 'image/jpeg',
    };
  }

  // 4. Manifest JSONs for staging sample gallery: /api/staging/hybrid-assets/manifests/<type>
  if (slug[0] === 'manifests' && slug.length === 2) {
    const type = slug[1];
    if (type === 'external') {
      return {
        filePath: path.join(EXP02_DIR, 'external_test_manifest.json'),
        contentType: 'application/json; charset=utf-8',
      };
    }
    if (type === 'benchmark') {
      return {
        filePath: path.join(EXP02_DIR, 'hybrid_center_roi_benchmark_results.json'),
        contentType: 'application/json; charset=utf-8',
      };
    }
  }

  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const resolved = resolveStagingAssetPath(slug);

    if (!resolved || !fs.existsSync(resolved.filePath) || !fs.statSync(resolved.filePath).isFile()) {
      return NextResponse.json(
        { ok: false, error: 'Staging asset not found', slug },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(resolved.filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': resolved.contentType,
        'Content-Length': String(fileBuffer.byteLength),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to serve staging asset';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function HEAD(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const resolved = resolveStagingAssetPath(slug);

    if (!resolved || !fs.existsSync(resolved.filePath) || !fs.statSync(resolved.filePath).isFile()) {
      return new NextResponse(null, { status: 404 });
    }

    const stat = fs.statSync(resolved.filePath);
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': resolved.contentType,
        'Content-Length': String(stat.size),
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}


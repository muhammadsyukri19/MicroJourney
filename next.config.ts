import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Quick Look di iPhone dan Scene Viewer di Android mengenali model dari jenis kontennya
  async headers() {
    return [
      // Model AI scanner disimpan browser, jadi kunjungan berikutnya tidak mengunduh atau mengecek ulang.
      // Bila isinya berubah, pakai folder versi baru.
      {
        source: '/models/tfjs-wasm-4.22.0/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/models/coco-ssd/v2/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/models/plastic/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }],
      },
      // Aset v2 boleh disimpan browser sehari; bila isinya berubah, pakai folder versi baru
      {
        source: '/models/microplastic/v2/:file([a-z]+\.usdz)',
        headers: [
          { key: 'Content-Type', value: 'model/vnd.usdz+zip' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/models/microplastic/v2/:file([a-z]+\.glb)',
        headers: [
          { key: 'Content-Type', value: 'model/gltf-binary' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/models/microplastic/v2/:file([a-z]+\.hdr)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        source: '/models/organs/:file([a-z]+\\.usdz)',
        headers: [{ key: 'Content-Type', value: 'model/vnd.usdz+zip' }],
      },
      {
        source: '/models/organs/:file([a-z]+\\.glb)',
        headers: [{ key: 'Content-Type', value: 'model/gltf-binary' }],
      },
      {
        source: '/models/microplastic/:file([a-z]+\\.usdz)',
        headers: [{ key: 'Content-Type', value: 'model/vnd.usdz+zip' }],
      },
      {
        source: '/models/microplastic/:file([a-z]+\\.glb)',
        headers: [{ key: 'Content-Type', value: 'model/gltf-binary' }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;

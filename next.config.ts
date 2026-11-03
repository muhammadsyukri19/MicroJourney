import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Quick Look di iPhone dan Scene Viewer di Android mengenali model dari jenis kontennya
  async headers() {
    return [
      {
        source: '/models/microplastic/microplastic.usdz',
        headers: [{ key: 'Content-Type', value: 'model/vnd.usdz+zip' }],
      },
      {
        source: '/models/microplastic/microplastic.glb',
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

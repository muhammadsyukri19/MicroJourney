'use client';

import { getYouTubeEmbedUrl, getYouTubeWatchUrl } from '@/lib/utils/youtube.utils';

interface YouTubePlayerProps {
  url: string;
  title?: string;
  className?: string;
}

export default function YouTubePlayer({ url, title = 'Video Pembelajaran YouTube', className = '' }: YouTubePlayerProps) {
  const embedUrl = getYouTubeEmbedUrl(url);
  const watchUrl = getYouTubeWatchUrl(url);

  return (
    <div className={`w-full flex flex-col gap-3 ${className}`}>
      {/* Responsive Aspect Ratio Video Container (16:9) */}
      <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-xl bg-black border-4 border-white/90 group">
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full rounded-xl md:rounded-2xl"
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>

      {/* Direct link button to watch on YouTube in a new tab */}
      <div className="flex justify-end">
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#bec8d2] hover:border-[#ba1a1a] text-[#191c1e] hover:text-[#ba1a1a] text-xs md:text-sm font-bold transition-all shadow-sm active:scale-95 group"
        >
          <span className="material-symbols-outlined text-red-600 text-lg group-hover:scale-110 transition-transform">play_circle</span>
          <span>Buka di Tab Baru / Tonton di YouTube</span>
          <span className="material-symbols-outlined text-xs text-slate-400 group-hover:text-red-600">open_in_new</span>
        </a>
      </div>
    </div>
  );
}

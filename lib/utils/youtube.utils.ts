/**
 * lib/utils/youtube.utils.ts
 * Utility untuk konversi URL YouTube ke format embed dan watch tab baru.
 */

export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return 'https://www.youtube.com/embed/3D6tIkBV2RM';
  if (url.includes('youtube.com/embed/')) return url;

  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return url;
}

export function getYouTubeWatchUrl(url: string): string {
  if (!url) return 'https://www.youtube.com/watch?v=3D6tIkBV2RM';
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) {
    return `https://www.youtube.com/watch?v=${match[1]}`;
  }
  return url;
}

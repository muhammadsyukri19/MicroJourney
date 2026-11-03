import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, unknown>;
    }
  }
}

const VIEWER_SCRIPT = '/vendor/model-viewer/model-viewer-4.4.0.min.js';

let viewerScript: Promise<void> | null = null;

/** Pustaka hanya diunduh saat model dibuka, supaya halaman lain tidak ikut berat */
export function loadViewerScript() {
  viewerScript ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = VIEWER_SCRIPT;
    script.onload = () => resolve();
    script.onerror = () => {
      viewerScript = null;
      script.remove();
      reject(new Error('Pustaka AR gagal dimuat'));
    };
    document.head.appendChild(script);
  });
  return viewerScript;
}

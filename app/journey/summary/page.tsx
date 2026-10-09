// Redirect old route /journey/summary to standalone route /summary
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JourneySummaryRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/summary');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#083b54] text-white">
      <div className="text-center space-y-3">
        <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
        <p className="font-bold text-sm">Mengarahkan ke Halaman Rangkuman Mandiri...</p>
      </div>
    </div>
  );
}

'use client';

import Navbar from '@/components/Navbar';
import MateriTemplate from '@/components/templates/pages/materi/MateriTemplate';

export default function MateriPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fa] flex flex-col font-[family-name:var(--font-inter)] selection:bg-[#6bff8f] selection:text-[#083b54]">
      <Navbar />
      <MateriTemplate />
    </div>
  );
}

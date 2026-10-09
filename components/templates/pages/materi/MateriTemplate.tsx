'use client';

import { useState } from 'react';
import PageContainer from '@/components/ui/PageContainer';
import MateriBgPattern from '@/components/atoms/materi/MateriBgPattern';
import MateriTabSwitcher, { MateriTabType } from '@/components/molecules/materi/MateriTabSwitcher';
import MateriVideoSection from '@/components/organisms/materi/MateriVideoSection';
import MateriPdfSection from '@/components/organisms/materi/MateriPdfSection';
import MateriSummaryGrid from '@/components/organisms/materi/MateriSummaryGrid';
import MateriCtaBanner from '@/components/organisms/materi/MateriCtaBanner';

export default function MateriTemplate() {
  const [activeTab, setActiveTab] = useState<MateriTabType>('video');

  return (
    <div className="relative overflow-hidden flex-grow pt-4 pb-16">
      {/* Atom: Dynamic Decorative Background Pattern */}
      <MateriBgPattern />

      <PageContainer maxWidth="wide">
        {/* Header Section */}
        <div className="relative z-10 max-w-4xl mx-auto text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#006591]/30 text-[#006591] font-bold text-xs shadow-sm mb-4">
            <span className="w-2 h-2 rounded-full bg-[#006591] animate-pulse" />
            <span>Modul Pembelajaran Digital · IPA Kelas VIII</span>
          </div>

          <h1 className="font-[family-name:var(--font-outfit)] text-3xl md:text-5xl font-extrabold text-[#083b54] tracking-tight leading-tight mb-3">
            Eksplorasi Sains <span className="text-[#006591] underline decoration-[#6bff8f] decoration-wavy decoration-2">MicroJourney AR</span>
          </h1>
          <p className="text-[#3e4850] text-sm md:text-base max-w-2xl mx-auto font-medium leading-relaxed">
            Pahami fenomena pelapukan plastik, bioakumulasi rantai makanan laut, hingga dampaknya pada tubuh manusia secara profesional dan interaktif.
          </p>

          {/* Molecule: Interactive Tab Switcher Navigation */}
          <MateriTabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Organisms: Conditionally Rendered Content Sections */}
        {activeTab === 'video' && (
          <MateriVideoSection onSwitchToPdf={() => setActiveTab('pdf')} />
        )}

        {activeTab === 'pdf' && (
          <MateriPdfSection />
        )}

        {activeTab === 'summary' && (
          <MateriSummaryGrid />
        )}

        {/* Organism: Bottom Action CTA Banner */}
        <MateriCtaBanner />
      </PageContainer>
    </div>
  );
}

'use client';

export type MateriTabType = 'video' | 'pdf' | 'summary';

interface MateriTabSwitcherProps {
  activeTab: MateriTabType;
  onTabChange: (tab: MateriTabType) => void;
}

export default function MateriTabSwitcher({ activeTab, onTabChange }: MateriTabSwitcherProps) {
  return (
    <div className="flex justify-center mt-8">
      <div className="inline-flex p-1.5 rounded-2xl bg-white border border-[#bec8d2] shadow-md backdrop-blur-md gap-1">
        <button
          onClick={() => onTabChange('video')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs md:text-sm font-[family-name:var(--font-outfit)] transition-all ${
            activeTab === 'video'
              ? 'bg-[#006591] text-white shadow-md'
              : 'text-[#3e4850] hover:text-[#006591] hover:bg-slate-50'
          }`}
        >
          <span className="material-symbols-outlined text-lg">smart_display</span>
          <span>Video &amp; Catatan</span>
        </button>

        <button
          onClick={() => onTabChange('pdf')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs md:text-sm font-[family-name:var(--font-outfit)] transition-all ${
            activeTab === 'pdf'
              ? 'bg-[#006591] text-white shadow-md'
              : 'text-[#3e4850] hover:text-[#006591] hover:bg-slate-50'
          }`}
        >
          <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
          <span>Modul Ajar PDF</span>
        </button>

        <button
          onClick={() => onTabChange('summary')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs md:text-sm font-[family-name:var(--font-outfit)] transition-all ${
            activeTab === 'summary'
              ? 'bg-[#006591] text-white shadow-md'
              : 'text-[#3e4850] hover:text-[#006591] hover:bg-slate-50'
          }`}
        >
          <span className="material-symbols-outlined text-lg">grid_view</span>
          <span>Poin Utama IPA</span>
        </button>
      </div>
    </div>
  );
}

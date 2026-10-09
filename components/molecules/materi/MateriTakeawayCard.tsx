'use client';

export interface TakeawayItem {
  id: number;
  title: string;
  desc: string;
  icon: string;
  color: string;
  bg: string;
}

interface MateriTakeawayCardProps {
  item: TakeawayItem;
}

export default function MateriTakeawayCard({ item }: MateriTakeawayCardProps) {
  return (
    <div
      className="p-3.5 rounded-2xl border transition-all hover:shadow-md flex items-start gap-3"
      style={{ backgroundColor: item.bg, borderColor: `${item.color}30` }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm mt-0.5"
        style={{ backgroundColor: item.color }}
      >
        <span className="material-symbols-outlined text-lg">{item.icon}</span>
      </div>
      <div>
        <h4 className="font-bold text-xs sm:text-sm text-[#083b54] font-[family-name:var(--font-outfit)]">
          {item.title}
        </h4>
        <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
          {item.desc}
        </p>
      </div>
    </div>
  );
}

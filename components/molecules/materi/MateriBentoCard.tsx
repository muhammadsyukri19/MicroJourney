'use client';

export interface BentoSummaryCard {
  badge: string;
  title: string;
  desc: string;
  icon: string;
  accent: string;
}

interface MateriBentoCardProps {
  card: BentoSummaryCard;
}

export default function MateriBentoCard({ card }: MateriBentoCardProps) {
  return (
    <div
      className="bg-white rounded-3xl p-6 shadow-xl border-2 transition-all hover:scale-[1.01] hover:shadow-2xl flex flex-col justify-between"
      style={{ borderColor: `${card.accent}30` }}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider font-[family-name:var(--font-mono)]"
            style={{ backgroundColor: `${card.accent}15`, color: card.accent }}
          >
            {card.badge}
          </span>
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
            style={{ backgroundColor: card.accent }}
          >
            <span className="material-symbols-outlined text-xl">{card.icon}</span>
          </div>
        </div>

        <h3 className="font-extrabold text-[#083b54] text-lg mb-2 font-[family-name:var(--font-outfit)]">
          {card.title}
        </h3>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          {card.desc}
        </p>
      </div>
    </div>
  );
}

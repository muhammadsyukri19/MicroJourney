// MOLECULE: SummaryKpiCard
// Card statistik ringkasan hasil eksplorasi siswa pasca-Tahap 6.
import React from 'react';
import { cn } from '@/libs/utils';

interface SummaryKpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  accentColor?: string;
  badge?: string;
  className?: string;
}

const SummaryKpiCard: React.FC<SummaryKpiCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  accentColor = '#006591',
  badge,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden',
        className
      )}
    >
      <div
        className="absolute top-0 left-0 w-1.5 h-full"
        style={{ backgroundColor: accentColor }}
      />
      <div className="flex items-center justify-between mb-2 pl-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </div>
      </div>

      <div className="pl-2">
        <div className="flex items-baseline justify-between gap-1">
          <p
            className="text-xl lg:text-2xl font-extrabold text-[#083b54]"
            style={{ fontFamily: 'var(--font-outfit)' }}
          >
            {value}
          </p>
          {badge && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default SummaryKpiCard;

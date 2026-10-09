// ATOM: StatCard
// Card ringkasan statistik angka dengan border aksen warna & icon.
import React from 'react';
import { cn } from '@/libs/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  accentColor?: string;
  badgeText?: string;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon = 'analytics',
  accentColor = '#006591',
  badgeText,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between',
        className
      )}
    >
      <div
        className="absolute top-0 left-0 w-1.5 h-full"
        style={{ backgroundColor: accentColor }}
      />
      <div className="flex items-center justify-between mb-3 pl-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
      </div>

      <div className="pl-2">
        <div className="flex items-baseline justify-between">
          <p
            className="text-2xl lg:text-3xl font-extrabold text-[#083b54]"
            style={{ fontFamily: 'var(--font-outfit)' }}
          >
            {value}
          </p>
          {badgeText && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-md"
              style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
            >
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;

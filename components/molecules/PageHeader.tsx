// MOLECULE: PageHeader
// Header halaman standar dengan badge, judul, dan subjudul terpadu.
import React from 'react';
import { cn } from '@/libs/utils';

interface PageHeaderProps {
  badgeText?: string;
  badgeColor?: string;
  title: string | React.ReactNode;
  subtitle?: string;
  align?: 'center' | 'left';
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  badgeText,
  badgeColor = '#006591',
  title,
  subtitle,
  align = 'center',
  className,
}) => {
  return (
    <div className={cn('mb-8 md:mb-10', align === 'center' ? 'text-center' : 'text-left', className)}>
      {badgeText && (
        <div
          className={cn(
            'inline-flex items-center gap-2 bg-white border border-slate-200/80 px-4 py-1.5 rounded-full mb-4 shadow-2xs',
            align === 'center' ? 'mx-auto' : ''
          )}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: badgeColor }}
          />
          <span
            className="text-xs font-mono font-bold uppercase tracking-widest"
            style={{ color: badgeColor }}
          >
            {badgeText}
          </span>
        </div>
      )}

      <h1 className="font-[family-name:var(--font-outfit)] text-3xl md:text-5xl font-extrabold text-[#083b54] mb-3 leading-tight">
        {title}
      </h1>

      {subtitle && (
        <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default PageHeader;

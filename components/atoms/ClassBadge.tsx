// ATOM: ClassBadge
// Tag/Badge label kelas dengan varian aktif & non-aktif.
import React from 'react';
import { cn } from '@/libs/utils';

interface ClassBadgeProps {
  classNameLabel: string;
  studentCount?: number;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

const ClassBadge: React.FC<ClassBadgeProps> = ({
  classNameLabel,
  studentCount,
  isActive = false,
  onClick,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer',
        isActive
          ? 'bg-[#006591] text-white border-[#006591] shadow-xs scale-[1.02]'
          : 'bg-white border-slate-200 text-slate-600 hover:border-[#006591] hover:text-[#006591]',
        className
      )}
    >
      <span>{classNameLabel}</span>
      {studentCount !== undefined && (
        <span
          className={cn(
            'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
            isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
          )}
        >
          {studentCount}
        </span>
      )}
    </button>
  );
};

export default ClassBadge;

// MOLECULE: ClassCard
// Card informasi kelas yang dibuat guru (Nama Kelas, Jumlah Siswa, Akses Cepat).
'use client';

import React from 'react';
import { cn } from '@/libs/utils';
import ClassBadge from '@/components/atoms/ClassBadge';

interface ClassCardProps {
  name: string;
  academicYear?: string;
  studentCount: number;
  completedCount: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  className?: string;
}

export default function ClassCard({
  name,
  academicYear = '2026/2027',
  studentCount,
  completedCount,
  isSelected = false,
  onSelect,
  onDelete,
  className,
}: ClassCardProps) {
  const percentage = studentCount > 0 ? Math.round((completedCount / studentCount) * 100) : 0;

  return (
    <div
      onClick={onSelect}
      className={cn(
        'cursor-pointer bg-white rounded-2xl p-5 border transition-all relative overflow-hidden flex flex-col justify-between',
        isSelected
          ? 'border-[#006591] ring-2 ring-[#006591]/20 shadow-md bg-[#006591]/[0.01]'
          : 'border-slate-200 hover:border-[#006591]/50 hover:shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <ClassBadge classNameLabel={academicYear} isActive={false} />
          <h4
            className="text-xl font-extrabold text-[#083b54] mt-2"
            style={{ fontFamily: 'var(--font-outfit)' }}
          >
            Kelas {name}
          </h4>
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Hapus Kelas"
            className="text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Siswa Terdaftar</span>
          <span className="font-bold text-[#083b54]">{studentCount} Siswa</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Tuntas Ekspedisi</span>
          <span className="font-bold text-[#006e2f]">{completedCount} / {studentCount} ({percentage}%)</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#006591] to-[#006e2f] transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#006591]">
        <span>{isSelected ? '✓ Kelas Aktif Dipilih' : 'Pilih untuk Analisis'}</span>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
      </div>
    </div>
  );
}

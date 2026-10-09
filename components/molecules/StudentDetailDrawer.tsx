// MOLECULE: StudentDetailDrawer
// Slide-over drawer untuk menampilkan detail hasil laboratorium, PR Google Drive, & E-LKPD 6 Tahap siswa.
'use client';

import React from 'react';
import { cn } from '@/libs/utils';
import ClassBadge from '@/components/atoms/ClassBadge';
import StarRating from '@/components/atoms/StarRating';

export interface Submission {
  _id: string;
  createdAt: string;
  studentName: string;
  studentClass: string;
  totalParticles: number;
  mostDangerousOrgan: string;
  lkpd1: string;
  lkpd2: string;
  lkpd3q1: string;
  lkpd3q2: string;
  lkpd4: string;
  commitment: string;
  selectedFoods: string[];
  quizCorrect: number;
  quizWrong: number;
  driveLink?: string;
  sosmedLink?: string;
  actionNote?: string;
  rating?: number;
  feedback?: string;
}

interface StudentDetailDrawerProps {
  submission: Submission | null;
  onClose: () => void;
  parseOrganLabel: (raw: string) => string;
  className?: string;
}

export default function StudentDetailDrawer({
  submission,
  onClose,
  parseOrganLabel,
  className,
}: StudentDetailDrawerProps) {
  if (!submission) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 lg:absolute lg:right-0 lg:top-0 lg:bottom-0 w-full lg:w-[420px] bg-white border-l border-slate-200 lg:rounded-2xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300',
        className
      )}
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-[#006591]/[0.03] rounded-t-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h3
              className="font-extrabold text-lg text-[#083b54]"
              style={{ fontFamily: 'var(--font-outfit)' }}
            >
              {submission.studentName}
            </h3>
            <ClassBadge classNameLabel={submission.studentClass} isActive={true} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Waktu Submit: {new Date(submission.createdAt).toLocaleString('id-ID')}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-800 transition-colors p-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
        {/* KPI Ringkasan */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-0.5">
              Tingkat Kontaminasi
            </p>
            <p className="text-base font-extrabold text-red-700">
              {submission.totalParticles.toLocaleString('id-ID')} Partikel
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-0.5">
              Organ Paling Kritis
            </p>
            <p
              className="text-sm font-extrabold text-amber-800 truncate"
              title={parseOrganLabel(submission.mostDangerousOrgan)}
            >
              {parseOrganLabel(submission.mostDangerousOrgan)}
            </p>
          </div>
        </div>

        {/* Skor Kuis */}
        <div className="bg-[#006591]/5 border border-[#006591]/20 rounded-xl p-3.5 flex justify-between items-center">
          <p className="font-bold text-[#006591]">Hasil Kuis Pilihan Ganda</p>
          <div className="flex gap-2">
            <span className="text-emerald-700 font-extrabold bg-emerald-100 px-2.5 py-0.5 rounded-md">
              ✓ {submission.quizCorrect || 0} Benar
            </span>
            <span className="text-red-600 font-extrabold bg-red-100 px-2.5 py-0.5 rounded-md">
              ✗ {submission.quizWrong || 0} Salah
            </span>
          </div>
        </div>

        {/* Section: Tugas PR & Kampanye Sosmed */}
        <div className="bg-[#f0f7fc] border border-[#b8d8eb] rounded-xl p-3.5 space-y-2.5">
          <p className="font-extrabold text-[#006591] uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">folder_shared</span>
            Pengumpulan PR Digital & Media Sosial
          </p>

          <div className="flex flex-col gap-2">
            {submission.driveLink ? (
              <a
                href={submission.driveLink}
                target="_blank"
                rel="noreferrer"
                className="bg-white border border-[#006591]/30 hover:border-[#006591] text-[#006591] font-bold py-2 px-3 rounded-lg flex items-center justify-between transition-colors shadow-2xs"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span className="material-symbols-outlined text-[16px]">add_to_drive</span>
                  Buka Folder Google Drive PR
                </span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            ) : (
              <span className="text-slate-400 italic">Google Drive PR: (belum dilampirkan)</span>
            )}

            {submission.sosmedLink ? (
              <a
                href={submission.sosmedLink}
                target="_blank"
                rel="noreferrer"
                className="bg-white border border-emerald-300 hover:border-emerald-600 text-emerald-700 font-bold py-2 px-3 rounded-lg flex items-center justify-between transition-colors shadow-2xs"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span className="material-symbols-outlined text-[16px]">share</span>
                  Lihat Video Kampanye Sosmed
                </span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            ) : null}

            {submission.actionNote && (
              <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-700 text-[11px] mb-0.5">Catatan Aksi Lingkungan:</p>
                <p className="text-slate-600 text-[11px] leading-relaxed">{submission.actionNote}</p>
              </div>
            )}
          </div>
        </div>

        {/* Section: Refleksi & Rating Bintang Siswa */}
        {submission.rating && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-extrabold text-amber-800 text-[11px]">Umpan Balik Pembelajaran</p>
              <StarRating value={submission.rating} readonly size="sm" />
            </div>
            {submission.feedback && (
              <p className="text-amber-900 text-[11px] italic bg-white/70 p-2 rounded-md border border-amber-200/60 mt-1">
                &ldquo;{submission.feedback}&rdquo;
              </p>
            )}
          </div>
        )}

        <hr className="border-slate-100" />

        {/* Jawaban E-LKPD 6 Tahap */}
        <div className="space-y-4">
          <p className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
            Lembar Jawaban E-LKPD Sains (6 Tahap)
          </p>

          {[
            { l: 'Tahap 1: Identifikasi AR Scanner Plastik', t: submission.lkpd1 },
            { l: 'Tahap 2: Simulasi Pelapukan UV & Ombak', t: submission.lkpd2 },
            { l: 'Tahap 3: Bioakumulasi Rantai Makanan Laut', t: submission.lkpd3q1 },
            { l: 'Tahap 4: Refleksi Pola Konsumsi Harian', t: submission.lkpd3q2 },
            { l: 'Tahap 5: Sintesis Analisis Anatomi HOTS', t: submission.lkpd4 },
            { l: 'Tahap 6: Deklarasi Sumpah Komitmen', t: submission.commitment },
          ].map((item, i) => (
            <div key={i} className="space-y-1">
              <p className="font-bold text-[#006591] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#006591]"></span>
                {item.l}
              </p>
              <p className="text-slate-700 leading-relaxed bg-[#FAFAFA] border border-slate-200 rounded-xl p-3 font-medium">
                {item.t || <span className="text-slate-400 italic font-normal">Tidak diisi oleh siswa</span>}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

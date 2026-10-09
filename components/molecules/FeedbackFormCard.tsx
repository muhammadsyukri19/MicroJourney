// MOLECULE: FeedbackFormCard
// Form umpan balik (rating 1-5 bintang & ulasan) siswa tentang media pembelajaran.
'use client';

import React from 'react';
import { cn } from '@/libs/utils';
import StarRating from '@/components/atoms/StarRating';

interface FeedbackFormCardProps {
  rating: number;
  onRatingChange: (val: number) => void;
  feedback: string;
  onFeedbackChange: (val: string) => void;
  className?: string;
}

const FeedbackFormCard: React.FC<FeedbackFormCardProps> = ({
  rating,
  onRatingChange,
  feedback,
  onFeedbackChange,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3.5 text-xs',
        className
      )}
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h4
            className="font-extrabold text-base text-[#083b54]"
            style={{ fontFamily: 'var(--font-outfit)' }}
          >
            Refleksi & Umpan Balik Siswa
          </h4>
          <p className="text-[#648796] text-[11px]">
            Berikan nilai & ulasan pengalaman belajarmu bersama MicroJourney AR.
          </p>
        </div>
        <StarRating value={rating} onChange={onRatingChange} size="md" />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-[#a0b4bf] block mb-1.5">
          Pesan & Ulasan Pengalaman Belajar
        </label>
        <textarea
          rows={2}
          value={feedback}
          onChange={(e) => onFeedbackChange(e.target.value)}
          placeholder="Apa hal paling berkesan yang kamu pelajari? Apa saranmu untuk pembelajaran selanjutnya?"
          className="w-full p-3 rounded-xl text-[#083b54] placeholder-[#c8d8df] text-xs outline-none transition-all bg-[#f7fbfd] border border-[#d4e5ed] focus:border-[#006591]"
        />
      </div>
    </div>
  );
};

export default FeedbackFormCard;

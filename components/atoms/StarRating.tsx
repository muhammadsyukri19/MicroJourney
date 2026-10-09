// ATOM: StarRating
// Komponen rating 1-5 bintang interaktif untuk feedback siswa.
'use client';

import React, { useState } from 'react';
import { cn } from '@/libs/utils';

interface StarRatingProps {
  value?: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  value = 5,
  onChange,
  readonly = false,
  size = 'md',
  className,
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'text-lg gap-1',
    md: 'text-2xl gap-1.5',
    lg: 'text-3xl gap-2',
  };

  const activeValue = hovered !== null ? hovered : value;

  return (
    <div className={cn('inline-flex items-center', sizeClasses[size], className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= activeValue;
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(null)}
            aria-label={`Beri rating ${star} dari 5`}
            className={cn(
              'transition-all duration-150 focus:outline-none',
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'
            )}
          >
            <span
              className={cn(
                'material-symbols-outlined transition-colors',
                isFilled ? 'text-amber-400 fill-amber-400 font-bold drop-shadow-xs' : 'text-slate-300'
              )}
              style={{
                fontVariationSettings: isFilled ? "'FILL' 1, 'wght' 700" : "'FILL' 0, 'wght' 400",
              }}
            >
              star
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;

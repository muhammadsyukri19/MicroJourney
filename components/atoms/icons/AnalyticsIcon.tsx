// src/components/atoms/icons/AnalyticsIcon.tsx
import React from 'react';
import { cn } from '@/libs/utils';
import { IconProps } from '@/types/iconProps';

const AnalyticsIcon: React.FC<IconProps> = ({ className }) => {
  return (
    <svg
      className={cn('w-4 h-4', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
};

export default AnalyticsIcon;

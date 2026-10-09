// src/components/atoms/icons/SchoolIcon.tsx
import React from 'react';
import { cn } from '@/libs/utils';
import { IconProps } from '@/types/iconProps';

const SchoolIcon: React.FC<IconProps> = ({ className }) => {
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
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
};

export default SchoolIcon;

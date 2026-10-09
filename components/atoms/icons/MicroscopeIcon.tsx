// src/components/atoms/icons/MicroscopeIcon.tsx
import React from 'react';
import { cn } from '@/libs/utils';
import { IconProps } from '@/types/iconProps';

const MicroscopeIcon: React.FC<IconProps> = ({ className }) => {
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
      <path d="M6 18h8" />
      <path d="M3 22h18" />
      <path d="M14 22a7 7 0 1 0-14 0" />
      <path d="M9 14l2-2" />
      <path d="M12 6l3 3" />
      <path d="M14 4l3 3" />
      <path d="M17 2l3 3" />
    </svg>
  );
};

export default MicroscopeIcon;

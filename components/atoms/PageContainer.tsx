// ATOM: PageContainer
// Container tata letak global dengan batas lebar & margin samping terpadu di seluruh aplikasi.
import React from 'react';
import { cn } from '@/libs/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'narrow' | 'default' | 'wide' | 'full';
  py?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
  maxWidth = 'default',
  py = 'py-6 md:py-10',
}) => {
  const maxWidthMap = {
    narrow: 'max-w-4xl',
    default: 'max-w-[1400px]',
    wide: 'max-w-[1600px]',
    full: 'max-w-full',
  };

  return (
    <div
      className={cn(
        'w-full mx-auto px-4 lg:px-6',
        maxWidthMap[maxWidth],
        py,
        className
      )}
    >
      {children}
    </div>
  );
};

export default PageContainer;

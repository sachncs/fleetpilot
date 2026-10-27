import * as React from 'react';
import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative grid size-9 shrink-0 place-items-center overflow-hidden border border-black bg-black text-white dark:border-white dark:bg-white dark:text-black',
        className,
      )}
    >
      <svg viewBox="0 0 32 32" fill="none" className="size-6">
        <path d="M6 22.5 12.2 16l4.1 3.8L26 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6" cy="22.5" r="1.5" fill="currentColor" />
        <circle cx="12.2" cy="16" r="1.5" fill="currentColor" />
        <circle cx="16.3" cy="19.8" r="1.5" fill="currentColor" />
        <circle cx="26" cy="9.5" r="1.5" fill="currentColor" />
      </svg>
    </span>
  );
}

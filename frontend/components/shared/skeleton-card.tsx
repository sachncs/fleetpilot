import * as React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonCard({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={`space-y-3 rounded-xl border p-4 ${className ?? ''}`}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

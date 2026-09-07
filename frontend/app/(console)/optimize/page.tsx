import { Suspense } from 'react';

import { SkeletonCard } from '@/components/shared/skeleton-card';

import { OptimizeClient } from './optimize-client';

export default function OptimizePage(): React.ReactElement {
  return (
    <Suspense fallback={<div className="p-6"><SkeletonCard /></div>}>
      <OptimizeClient />
    </Suspense>
  );
}

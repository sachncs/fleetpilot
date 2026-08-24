import { SkeletonCard } from '@/components/shared/skeleton-card';

export default function OverviewLoading(): React.ReactElement {
  return (
    <div className="space-y-6 p-6">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

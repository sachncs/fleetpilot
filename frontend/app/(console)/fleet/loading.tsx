import { SkeletonCard } from '@/components/shared/skeleton-card';

export default function FleetLoading(): React.ReactElement {
  return (
    <div className="space-y-6 p-6">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

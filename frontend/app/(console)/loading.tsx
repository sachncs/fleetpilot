import { SkeletonCard } from '@/components/shared/skeleton-card';

export default function ConsoleLoading(): React.JSX.Element {
  return (
    <div className="space-y-4 p-6">
      <SkeletonCard />
      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

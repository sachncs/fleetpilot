'use client';

import { ErrorState } from '@/components/shared/error-state';

export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  return <ErrorState error={error} reset={reset} />;
}

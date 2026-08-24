'use client';

import { ErrorState } from '@/components/shared/error-state';

export default function ConsoleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  return <ErrorState error={error} reset={reset} />;
}

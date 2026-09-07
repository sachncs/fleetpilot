'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}

/** Shared error state used by route-level error.tsx boundaries. */
export function ErrorState({ error, reset, title = 'Something went wrong' }: ErrorStateProps): React.JSX.Element {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. Try again, and if the problem persists, check the server logs.
        {error.digest ? ` (ref: ${error.digest})` : ''}
      </p>
      <Button onClick={reset} variant="outline" size="sm">
        <RefreshCw className="mr-2 h-4 w-4" /> Retry
      </Button>
    </div>
  );
}

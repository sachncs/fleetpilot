'use client';

import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

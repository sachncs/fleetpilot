'use client';

import * as React from 'react';
import { ThemeProvider } from 'next-themes';

import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster />
    </ThemeProvider>
  );
}

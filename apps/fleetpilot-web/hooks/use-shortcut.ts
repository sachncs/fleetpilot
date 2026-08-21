'use client';

import * as React from 'react';

interface ShortcutOptions {
  key: string;
  meta?: boolean;
  enabled?: boolean;
}

export function useShortcut(
  callback: () => void,
  { key, meta = true, enabled = true }: ShortcutOptions,
): void {
  const cbRef = React.useRef(callback);
  cbRef.current = callback;

  React.useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent): void => {
      const metaPressed = e.metaKey || e.ctrlKey;
      if (meta && !metaPressed) return;
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      e.preventDefault();
      cbRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, meta, enabled]);
}

type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | { [key: string]: boolean | null | undefined | string };

function toVal(mix: ClassValue): string {
  if (!mix) return '';
  if (typeof mix === 'string' || typeof mix === 'number') return String(mix);
  if (Array.isArray(mix)) return mix.map(toVal).filter(Boolean).join(' ');
  if (typeof mix === 'object') {
    return Object.entries(mix)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k)
      .join(' ');
  }
  return '';
}

export function cn(...inputs: ClassValue[]): string {
  return inputs.map(toVal).filter(Boolean).join(' ');
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1000) {
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

export function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatPercent(value: number, total: number): string {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}
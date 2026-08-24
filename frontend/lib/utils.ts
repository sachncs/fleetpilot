import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '—';
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes - Math.floor(minutes)) * 60);
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '—';
  return `${km.toFixed(2)} km`;
}

export function formatCost(cost: number): string {
  if (!Number.isFinite(cost) || cost < 0) return '—';
  return `${cost.toFixed(2)}`;
}

export function formatCo2(kg: number): string {
  if (!Number.isFinite(kg) || kg < 0) return '—';
  return `${kg.toFixed(2)} kg`;
}

/**
 * Returns true when running in Node.js (process.versions.node present).
 */
export function isNode(): boolean {
  return (
    typeof process !== 'undefined' &&
    typeof process.versions !== 'undefined' &&
    typeof process.versions.node === 'string'
  );
}

/**
 * Returns true when running in a browser-like environment (window + document).
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

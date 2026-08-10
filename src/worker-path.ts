import { resolve } from 'path';
import { fileURLToPath } from 'url';

import { isBrowser } from './env.js';

/**
 * Resolves the absolute path of the worker bundle shipped in dist/.
 *
 * - Node.js: returns the absolute path to `dist/worker.js`. The
 *   `VRP_WORKER_PATH` env var overrides the resolved path (used by
 *   tests to point at the built worker artifact).
 * - Browser: returns a URL to `dist/worker.browser.js` so callers can
 *   construct `new Worker(url, { type: 'module' })`.
 *
 * @returns Absolute path or URL of the worker script
 */
export function getWorkerPath(): string | URL {
  if (isBrowser()) {
    return new URL('./worker.browser.js', import.meta.url);
  }
  const override = process.env['VRP_WORKER_PATH'];
  if (override) return override;
  if (typeof __dirname !== 'undefined') {
    return resolve(__dirname, 'worker.js');
  }
  return fileURLToPath(new URL('./worker.js', import.meta.url));
}

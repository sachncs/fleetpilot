import { resolve } from 'path';
import { fileURLToPath } from 'url';

/**
 * Resolves the absolute path of the worker bundle shipped in dist/.
 *
 * The worker entry is co-located with this module in the package output
 * (dist/), so it is resolved relative to the current module instead of
 * process.cwd(), which breaks when consumers run from another directory.
 *
 * Set VRP_WORKER_PATH to override the resolved path (used by tests to point
 * at the built worker artifact).
 *
 * @returns Absolute path to the worker script
 */
export function getWorkerPath(): string {
  const override = process.env['VRP_WORKER_PATH'];
  if (override) return override;
  if (typeof __dirname !== 'undefined') {
    return resolve(__dirname, 'worker.js');
  }
  return fileURLToPath(new URL('./worker.js', import.meta.url));
}

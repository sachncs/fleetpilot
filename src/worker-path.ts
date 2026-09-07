import { isBrowser } from './env.js';

/**
 * Returns the URL/path of the worker bundle shipped in dist/.
 *
 * - Node.js: returns the relative path `./worker.js`. The Node worker
 *   `Worker` ctor resolves this against the script's `import.meta.url`,
 *   which is what the orchestrator does. The `FLEETPILOT_WORKER_PATH` env var
 *   overrides to an absolute path (used by tests).
 * - Browser: returns the relative URL `./worker.browser.js`. The browser
 *   `Worker` ctor resolves this against the document's base URL.
 *
 * We use a relative identifier (not `import.meta.url`-derived) so the
 * bundle is bundle-tool-friendly: webpack/rollup/static-asset hashing
 * does not need to rewrite the `import.meta.url` site.
 *
 * @returns Worker path or URL
 */
export function getWorkerPath(): string | URL {
  if (isBrowser()) {
    return './worker.browser.js';
  }
  const override = process.env['FLEETPILOT_WORKER_PATH'];
  if (override) return override;
  return './worker.js';
}

import { isBrowser } from './env.js';
import { getWorkerPath } from './worker-path.js';

/**
 * Unified worker interface that abstracts both `worker_threads.Worker`
 * (Node) and the Web Worker global `Worker` (browser).
 */
export interface CrossWorker {
  postMessage(msg: unknown): void;
  onMessage(handler: (msg: unknown) => void): void;
  onError(handler: (err: Error) => void): void;
  onExit(handler: (code: number) => void): void;
  terminate(): Promise<void>;
}

class NodeWorkerHandle implements CrossWorker {
  private readonly worker: {
    postMessage: (msg: unknown) => void;
    on: (event: string, handler: (...args: unknown[]) => void) => void;
    off: (event: string, handler: (...args: unknown[]) => void) => void;
    terminate: () => Promise<number>;
  };
  constructor(worker: NodeWorkerHandle['worker']) {
    this.worker = worker;
  }
  postMessage(msg: unknown): void {
    this.worker.postMessage(msg);
  }
  onMessage(handler: (msg: unknown) => void): void {
    this.worker.on('message', (...args: unknown[]) => {
      handler(args[0]);
    });
  }
  onError(handler: (err: Error) => void): void {
    this.worker.on('error', (...args: unknown[]) => {
      const err = args[0];
      handler(err instanceof Error ? err : new Error(String(err)));
    });
  }
  onExit(handler: (code: number) => void): void {
    this.worker.on('exit', (...args: unknown[]) => {
      handler(Number(args[0] ?? 0));
    });
  }
  terminate(): Promise<void> {
    return this.worker.terminate().then(() => undefined);
  }
}

class BrowserWorkerHandle implements CrossWorker {
  private readonly worker: Worker;
  constructor(url: string | URL) {
    this.worker = new Worker(url, { type: 'module' });
  }
  postMessage(msg: unknown): void {
    this.worker.postMessage(msg);
  }
  onMessage(handler: (msg: unknown) => void): void {
    this.worker.onmessage = (event) => {
      handler(event.data);
    };
  }
  onError(handler: (err: Error) => void): void {
    this.worker.onerror = (event) => {
      const message = event.message || 'Unknown worker error';
      handler(new Error(message));
    };
  }
  onExit(handler: (code: number) => void): void {
    // Browsers don't expose a real exit code; report 0 when the worker
    // terminates or fails. `onerror` will fire for runtime errors.
    handler(0);
  }
  terminate(): Promise<void> {
    this.worker.terminate();
    return Promise.resolve();
  }
}

/**
 * Spawns a worker appropriate for the current environment.
 * - Node: a `worker_threads.Worker` (CJS-style, no `workerData`).
 * - Browser: a `Worker` (ESM, loaded via `new URL(...)`).
 *
 * The parent posts the problem payload after the worker emits `{ type: 'ready' }`.
 */
export async function spawnWorker(): Promise<CrossWorker> {
  const url = getWorkerPath();
  if (isBrowser()) {
    return new BrowserWorkerHandle(url);
  }
  const { Worker: NodeWorker } = await import('worker_threads');
  try {
    return new NodeWorkerHandle(new NodeWorker(url));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to spawn worker: ${message}`);
  }
}

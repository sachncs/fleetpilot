import { parentPort } from 'worker_threads';

import { runWorkerTask, type WorkerIO } from './worker-core.js';
import { isWorkerData, validateWorkerData } from './worker-validation.js';

/**
 * Bootstraps the Node.js worker thread entry. The parent posts the
 * `WorkerData` over the message channel after the worker emits a `ready`
 * signal, so the worker waits for the first message rather than relying
 * on `workerData`. Keeping the protocol message-based lets the same
 * algorithm run in a Web Worker unchanged.
 */
export function bootstrapWorker(): void {
  if (!parentPort) {
    console.error('worker_threads parentPort unavailable');
    return;
  }

  const port = parentPort;
  const io: WorkerIO = {
    postMessage: (msg) => {
      port.postMessage(msg);
    },
    onMessage: (handler) => {
      port.on('message', handler);
    },
    offMessage: (handler) => {
      port.off('message', handler);
    },
  };

  port.postMessage({ type: 'ready' });

  let started = false;
  port.on('message', (raw: unknown) => {
    if (started) return;
    started = true;
    if (!isWorkerData(raw)) {
      port.postMessage({
        error:
          'Invalid workerData: expected ' +
          '{ nodes, customers, vehicles, depotNodeId, problemKind, type, options }',
        type: 'unknown',
      });
      return;
    }
    const validationError = validateWorkerData(raw);
    if (validationError) {
      port.postMessage({
        error: `Invalid workerData: ${validationError}`,
        type: raw.type,
      });
      return;
    }
    void runWorkerTask(raw, io);
  });
}

bootstrapWorker();

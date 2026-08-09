import { workerData, parentPort } from 'worker_threads';

import { runWorkerTask, type WorkerIO } from './worker-core.js';
import { isWorkerData, validateWorkerData } from './worker-validation.js';

/**
 * Bootstraps the worker: validates workerData, sets up the message channel,
 * and starts the worker task. Exported for in-process tests; the file's
 * top-level code path also calls it for the real worker_threads entry.
 */
export function bootstrapWorker(
  data: unknown,
  port: { postMessage: (msg: unknown) => void; on: (event: string, h: (m: unknown) => void) => void; off: (event: string, h: (m: unknown) => void) => void } | null,
): void {
  if (!isWorkerData(data)) {
    port?.postMessage({
      error: 'Invalid workerData: expected ' +
        '{ nodes, customers, vehicles, depotNodeId, problemKind, type, options }',
      type: 'unknown',
    });
    return;
  }

  const validationError = validateWorkerData(data);
  if (validationError) {
    port?.postMessage({
      error: `Invalid workerData: ${validationError}`,
      type: data.type,
    });
    return;
  }

  if (!port) {
    console.error('worker_threads parentPort unavailable');
    return;
  }

  const io: WorkerIO = {
    postMessage: msg => {
      port.postMessage(msg);
    },
    onMessage: handler => {
      port.on('message', handler);
    },
    offMessage: handler => {
      port.off('message', handler);
    },
  };

  void runWorkerTask(data, io);
}

bootstrapWorker(workerData, parentPort);

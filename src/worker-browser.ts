/**
 * Browser counterpart to `src/worker.ts`. Uses `self.postMessage` and
 * `self.onmessage` to communicate with the orchestrator. The orchestrator
 * (or a `web-worker` polyfill in tests) is responsible for posting the
 * `WorkerData` after the worker emits a `ready` signal.
 */

import { runWorkerTask, type WorkerIO } from './worker-core.js';
import { isWorkerData, validateWorkerData } from './worker-validation.js';

// `DedicatedWorkerGlobalScope` is the type of `self` inside a Web Worker
// (or a `web-worker` polyfill in Node).
interface WorkerGlobalScope {
  postMessage(msg: unknown): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  removeEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
}

const scope = self as unknown as WorkerGlobalScope;

const io: WorkerIO = {
  postMessage: (msg) => {
    scope.postMessage(msg);
  },
  onMessage: (handler) => {
    scope.onmessage = (event: { data: unknown }) => {
      handler(event.data);
    };
  },
  offMessage: () => {
    scope.onmessage = null;
  },
};

scope.postMessage({ type: 'ready' });

let started = false;
const messageHandler = (event: { data: unknown }): void => {
  if (started) return;
  started = true;
  scope.removeEventListener('message', messageHandler);
  const raw = event.data;
  if (!isWorkerData(raw)) {
    scope.postMessage({
      error:
        'Invalid workerData: expected ' +
        '{ nodes, customers, vehicles, depotNodeId, problemKind, type, options }',
      type: 'unknown',
    });
    return;
  }
  const validationError = validateWorkerData(raw);
  if (validationError) {
    scope.postMessage({
      error: `Invalid workerData: ${validationError}`,
      type: raw.type,
    });
    return;
  }
  void runWorkerTask(raw, io);
};
scope.addEventListener('message', messageHandler);

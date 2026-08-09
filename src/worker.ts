import { workerData, parentPort } from 'worker_threads';

import { runWorkerTask, type WorkerIO } from './worker-core.js';
import { isWorkerData, validateWorkerData } from './worker-validation.js';

if (!isWorkerData(workerData)) {
  parentPort?.postMessage({
    error: 'Invalid workerData: expected ' +
      '{ nodes, customers, vehicles, depotNodeId, problemKind, type, options }',
    type: 'unknown',
  });
  process.exit(1);
}

const validationError = validateWorkerData(workerData);
if (validationError) {
  parentPort?.postMessage({
    error: `Invalid workerData: ${validationError}`,
    type: workerData.type,
  });
  process.exit(1);
}

const port = parentPort;
if (!port) {
  console.error('worker_threads parentPort unavailable');
  process.exit(1);
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

void runWorkerTask(workerData, io);

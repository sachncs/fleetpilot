import { fork, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WorkerMessage, ProgressMessage, SolutionMessage, ErrorMessage } from './ipc';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface JobQueue {
  enqueue(jobId: string): void;
}

const jobQueue: JobQueue = { enqueue: () => {} };

export function getJobQueue(): JobQueue {
  return jobQueue;
}

const progressEmitter = new EventEmitter();
let worker: ChildProcess | null = null;

export function onWorkerMessage(handler: (msg: WorkerMessage) => void): () => void {
  progressEmitter.on('message', handler);
  return () => progressEmitter.off('message', handler);
}

export function startWorker(): void {
  if (worker) return;

  const scriptPath = resolve(__dirname, 'process.ts');

  worker = fork(scriptPath, [], {
    execArgv: ['--import', 'tsx/esm'],
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });

  worker.on('message', (msg: unknown) => {
    progressEmitter.emit('message', msg);
  });

  worker.on('exit', (code) => {
    console.error(`[FleetPilot Worker] exited with code ${code}, restarting in 2s...`);
    worker = null;
    setTimeout(startWorker, 2000);
  });

  worker.on('error', (err) => {
    console.error(`[FleetPilot Worker] error:`, err);
  });

  console.log('[FleetPilot Worker] started');
}

export function stopWorker(): void {
  if (worker) {
    worker.kill();
    worker = null;
  }
}

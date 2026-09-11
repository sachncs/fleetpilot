import { fork, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WorkerMessage } from './ipc';
import { log } from '../log';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface JobQueue {
  enqueue(jobId: string): void;
  pending(): number;
  running(): number;
}

const pendingJobs = new Set<string>();
const progressEmitter = new EventEmitter();
let worker: ChildProcess | null = null;

const jobQueue: JobQueue = {
  enqueue(jobId: string): void {
    pendingJobs.add(jobId);
    if (worker?.connected) {
      worker.send({ type: 'enqueue', jobId });
    }
    progressEmitter.emit('queue');
  },
  pending(): number {
    return pendingJobs.size;
  },
  running(): number {
    return 0;
  },
};

export function getJobQueue(): JobQueue {
  return jobQueue;
}

export function onWorkerMessage(handler: (msg: WorkerMessage) => void): () => void {
  progressEmitter.on('message', handler);
  return () => progressEmitter.off('message', handler);
}

export function cancelJob(jobId: string): boolean {
  if (!worker || !worker.connected) return false;
  worker.send({ type: 'cancel', jobId });
  return true;
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
    if (msg && typeof msg === 'object') {
      const m = msg as { type?: string; jobId?: string };
      if (m.type === 'completed' || m.type === 'failed' || m.type === 'cancelled') {
        if (m.jobId) pendingJobs.delete(m.jobId);
      }
    }
  });

  worker.on('exit', (code) => {
    log.error(`Worker exited with code ${code}, restarting in 2s...`);
    worker = null;
    setTimeout(startWorker, 2000);
  });

  worker.on('error', (err) => {
    log.error('Worker error:', err);
  });

  log.info('Worker started');
}

export function stopWorker(): void {
  if (worker) {
    worker.kill();
    worker = null;
  }
}

import { EventEmitter } from 'node:events';
import type { WorkerMessage } from '../worker/ipc';

class JobPubSub extends EventEmitter {
  publish(jobId: string, message: WorkerMessage): void {
    this.emit(`job:${jobId}`, message);
  }

  subscribe(jobId: string, handler: (msg: WorkerMessage) => void): () => void {
    const event = `job:${jobId}`;
    this.on(event, handler);
    return () => this.off(event, handler);
  }
}

let _instance: JobPubSub | null = null;

export function getPubSub(): JobPubSub {
  if (!_instance) {
    _instance = new JobPubSub();
  }
  return _instance;
}

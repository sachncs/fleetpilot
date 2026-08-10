import { expect } from 'chai';

import { bootstrapWorker } from '../src/worker.js';

describe('worker.ts bootstrapWorker (Node entry)', () => {
  it('logs and exits when parentPort is unavailable', () => {
    const origConsoleError = console.error;
    let captured = '';
    console.error = (m: unknown) => {
      captured += String(m);
    };
    try {
      bootstrapWorker();
    } finally {
      console.error = origConsoleError;
    }
    expect(captured).to.match(/parentPort unavailable/);
  });
});

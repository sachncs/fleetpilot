import { expect } from 'chai';

import { sendCommand } from '../src/algorithms/brkga/island-messenger.js';

function makeMockWorker(opts: { exitCode?: number; emit?: string; errorMessage?: string } = {}) {
  type Handler = ((msg: unknown) => void) | ((err: Error) => void) | ((code: number) => void);
  const handlers: { name: string; fn: Handler }[] = [];
  return {
    posted: [] as unknown[],
    on(name: string, fn: Handler) { handlers.push({ name, fn }); },
    off(name: string, fn: Handler) {
      const idx = handlers.findIndex(h => h.name === name && h.fn === fn);
      if (idx >= 0) handlers.splice(idx, 1);
    },
    postMessage(msg: unknown) { this.posted.push(msg); },
    trigger(name: 'message' | 'error' | 'exit', payload: unknown) {
      for (const h of handlers.filter(h => h.name === name)) {
        (h.fn as (p: unknown) => void)(payload);
      }
    },
    ...opts,
  };
}

describe('island-messenger sendCommand', () => {
  it('resolves on a checkpoint message', async () => {
    const worker = makeMockWorker();
    const promise = sendCommand(worker as never, { type: 'evolve', generations: 5 });
    worker.trigger('message', {
      type: 'checkpoint',
      islandId: 0,
      generation: 1,
      population: [{ chromosome: { priorities: [0.5], assignments: [0.5], dependencies: [0.5] }, fitness: 0 }],
    });
    const result = await promise;
    expect(result.type).to.equal('checkpoint');
  });

  it('resolves on a finish message', async () => {
    const worker = makeMockWorker();
    const promise = sendCommand(worker as never, { type: 'finish' });
    worker.trigger('message', {
      type: 'finish',
      islandId: 0,
      bestIndividual: null,
    });
    const result = await promise;
    expect(result.type).to.equal('finish');
  });

  it('rejects on invalid message format', async () => {
    const worker = makeMockWorker();
    const promise = sendCommand(worker as never, { type: 'evolve', generations: 5 });
    worker.trigger('message', { foo: 'bar' });
    try {
      await promise;
      expect.fail('expected rejection');
    } catch (err) {
      expect((err as Error).message).to.include('Invalid');
    }
  });

  it('rejects when the worker errors', async () => {
    const worker = makeMockWorker();
    const promise = sendCommand(worker as never, { type: 'evolve', generations: 5 });
    worker.trigger('error', new Error('boom'));
    try {
      await promise;
      expect.fail('expected rejection');
    } catch (err) {
      expect((err as Error).message).to.include('boom');
    }
  });

  it('rejects when the worker exits abnormally', async () => {
    const worker = makeMockWorker();
    const promise = sendCommand(worker as never, { type: 'finish' });
    worker.trigger('exit', 1);
    try {
      await promise;
      expect.fail('expected rejection');
    } catch (err) {
      expect((err as Error).message).to.include('exited');
    }
  });
});

import { expect } from 'chai';

import type { WorkerData } from '../src/worker-validation.js';

import { bootstrapWorker } from '../src/worker.js';

function makeMockPort(): {
  posted: unknown[];
  port: {
    posted: unknown[];
    postMessage: (msg: unknown) => void;
    on: (event: string, h: (m: unknown) => void) => void;
    off: (event: string, h: (m: unknown) => void) => void;
  };
} {
  const posted: unknown[] = [];
  const handlers = new Map<string, Set<(m: unknown) => void>>();
  const port = {
    posted,
    postMessage: (msg: unknown) => {
      posted.push(msg);
    },
    on: (event: string, h: (m: unknown) => void) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(h);
    },
    off: (event: string, h: (m: unknown) => void) => {
      handlers.get(event)?.delete(h);
    },
  };
  return { posted, port };
}

function makeWorkerData(overrides: Partial<WorkerData> = {}): WorkerData {
  return {
    type: 'BRKGA',
    nodes: {
      0: { id: 0, x: 0, y: 0, name: 'Depot' },
      1: { id: 1, x: 10, y: 0, name: 'D1' },
      2: { id: 2, x: 20, y: 0, name: 'P1' },
    },
    customers: [{ id: 1, deliveryNodeId: 1, pickupNodeId: 2, processingTime: 10 }],
    vehicles: [{ id: 1, capacity: 10 }],
    depotNodeId: 0,
    problemKind: 'base',
    options: { populationSize: 5, maxGenerations: 1 },
    ...overrides,
  } as unknown as WorkerData;
}

describe('worker.ts bootstrapWorker (happy path)', () => {
  it('rejects invalid workerData with a clear error', () => {
    const { port, posted } = makeMockPort();
    bootstrapWorker({ not: 'a worker data' }, port);
    expect(posted).to.have.lengthOf(1);
    const msg = posted[0] as { error: string; type: string };
    expect(msg.error).to.match(/Invalid workerData/);
    expect(msg.type).to.equal('unknown');
  });

  it('rejects null workerData without crashing', () => {
    const { port, posted } = makeMockPort();
    bootstrapWorker(null, port);
    expect(posted).to.have.lengthOf(1);
    const msg = posted[0] as { error: string };
    expect(msg.error).to.match(/Invalid workerData/);
  });

  it('handles missing port gracefully (logs, no crash)', () => {
    const origConsoleError = console.error;
    let captured = '';
    console.error = (m: unknown) => {
      captured += String(m);
    };
    try {
      bootstrapWorker(makeWorkerData(), null);
    } finally {
      console.error = origConsoleError;
    }
    expect(captured).to.match(/parentPort unavailable/);
  });

  it('reports validation errors for malformed problem data', () => {
    const { port, posted } = makeMockPort();
    bootstrapWorker({ ...makeWorkerData(), type: 'UNKNOWN' as 'BRKGA' }, port);
    // Either isWorkerData or validateWorkerData will reject; both paths post an error.
    expect(posted).to.have.lengthOf(1);
    const msg = posted[0] as { error?: string };
    expect(msg.error ?? '').to.match(/Invalid workerData/);
  });
});
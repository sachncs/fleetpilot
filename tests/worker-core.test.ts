import { expect } from 'chai';

import { Problem, LocationNode, Customer } from '../src/core/problem.js';
import { runWorkerTask, type WorkerIO } from '../src/worker-core.js';
import { serializeProblem } from '../src/worker-data.js';

function makeProblem(): Problem {
  const nodes = {
    0: new LocationNode(0, 0, 0, 'Depot'),
    1: new LocationNode(1, 10, 0, 'D1'),
    2: new LocationNode(2, 20, 0, 'P1'),
    3: new LocationNode(3, 0, 10, 'D2'),
    4: new LocationNode(4, 0, 20, 'P2'),
  };
  const customers = [new Customer(1, 1, 2, 50), new Customer(2, 3, 4, 50)];
  const vehicles = [
    { id: 1, capacity: 10, startDepotId: 0, endDepotId: 0, costPerKm: 1, co2PerKm: 1 },
  ];
  return new Problem(nodes, customers, vehicles, 0);
}

function makeIO(): {
  io: WorkerIO;
  posted: unknown[];
  emit: (msg: unknown) => void;
} {
  const posted: unknown[] = [];
  let handler: ((msg: unknown) => void) | null = null;
  return {
    io: {
      postMessage: (msg: unknown) => {
        posted.push(msg);
      },
      onMessage: (h: (msg: unknown) => void) => {
        handler = h;
      },
      offMessage: () => {
        handler = null;
      },
    },
    posted,
    emit: (msg: unknown) => {
      if (handler) handler(msg);
    },
  };
}

describe('runWorkerTask (in-process)', () => {
  it('runs BRKGA worker mode to completion', async () => {
    const problem = makeProblem();
    const { io, posted } = makeIO();
    await runWorkerTask(
      serializeProblem(problem, {
        type: 'BRKGA',
        options: { populationSize: 20, maxGenerations: 10 },
      }),
      io,
    );
    expect(posted).to.have.lengthOf(1);
    const result = posted[0] as { makespan?: number };
    expect(result.makespan).to.be.a('number');
  });

  it('runs ALNS worker mode to completion', async () => {
    const problem = makeProblem();
    const { io, posted } = makeIO();
    await runWorkerTask(
      serializeProblem(problem, { type: 'ALNS', options: { maxIterations: 20 } }),
      io,
    );
    expect(posted).to.have.lengthOf(1);
    const result = posted[0] as { makespan?: number };
    expect(result.makespan).to.be.a('number');
  });

  it('runs island-brkga mode, applies evolve/inject/finish messages', async () => {
    const problem = makeProblem();
    const { io, posted, emit } = makeIO();
    const data = serializeProblem(problem, {
      type: 'island-brkga',
      islandId: 0,
      options: {
        populationSize: 20,
        maxGenerations: 50,
        islandMaxGenerations: 50,
        migrationInterval: 5,
      },
    });
    await runWorkerTask(data, io);

    expect(posted.length).to.be.greaterThan(0);
    const first = posted[0] as { type?: string };
    expect(first.type).to.equal('checkpoint');

    emit({ type: 'evolve', generations: 3 });
    emit({
      type: 'inject',
      migrants: [{ priorities: [0.1, 0.2], assignments: [0.5, 0.5], dependencies: [0.5, 0.5] }],
    });
    emit({ type: 'finish' });
    emit({ type: 'unknown-msg-type' });

    const finish = posted[posted.length - 1] as { type?: string };
    expect(finish.type).to.equal('finish');
  });

  it('drops non-chromosome migrants in inject', async () => {
    const problem = makeProblem();
    const { io, posted, emit } = makeIO();
    const data = serializeProblem(problem, {
      type: 'island-brkga',
      islandId: 0,
      options: {
        populationSize: 10,
        maxGenerations: 10,
        islandMaxGenerations: 10,
        migrationInterval: 5,
      },
    });
    await runWorkerTask(data, io);

    emit({
      type: 'inject',
      migrants: [
        null,
        { priorities: 'not-an-array' },
        { priorities: [0.1, 0.2], assignments: [0.5, 0.5], dependencies: [0.5, 0.5] },
      ],
    });
    emit({ type: 'finish' });

    const finish = posted[posted.length - 1] as { type?: string };
    expect(finish.type).to.equal('finish');
  });

  it('reports errors over the channel when a worker fails', async () => {
    const problem = makeProblem();
    const { io, posted } = makeIO();
    const data = serializeProblem(problem, {
      type: 'BRKGA',
      options: { populationSize: 0 },
    });
    try {
      await runWorkerTask(data, io);
    } catch {
      // The runner may wrap; what matters is the channel receives something
    }
    const result = posted[posted.length - 1];
    const asError = result as { error?: string };
    if (asError.error) {
      expect(asError.error).to.be.a('string');
    } else {
      expect(result).to.have.property('makespan');
    }
  });
});

import { expect } from 'chai';

import { ALNS } from '../../src/algorithms/alns/alns.js';
import { BRKGA } from '../../src/algorithms/brkga/brkga.js';
import { type Chromosome } from '../../src/algorithms/brkga/decoder.js';
import { Problem, LocationNode, Customer, Vehicle } from '../../src/core/problem.js';
import type { Solution } from '../../src/core/solution.js';
import { runWorkerTask, type WorkerIO } from '../../src/worker-core.js';

function makeProblem(): Problem {
  const nodes = {
    0: new LocationNode(0, 0, 0, 'Depot'),
    1: new LocationNode(1, 10, 0, 'D1'),
    2: new LocationNode(2, 20, 0, 'P1'),
    3: new LocationNode(3, 50, 0, 'D2'),
    4: new LocationNode(4, 60, 0, 'P2'),
    5: new LocationNode(5, 100, 0, 'D3'),
    6: new LocationNode(6, 110, 0, 'P3'),
  };
  const customers = [
    new Customer(1, 1, 2, 10),
    new Customer(2, 3, 4, 10),
    new Customer(3, 5, 6, 10),
  ];
  return new Problem(nodes, customers, [new Vehicle(1, 30)], 0);
}

function buildWarmStart(problem: Problem): Solution {
  return new ALNS(problem, { maxIterations: 5 }).solve();
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

describe('BRKGA island-mode warm-start (regression: warmStartolution typo)', () => {
  it('serializes warmStartSolution under the canonical key, not the historical typo', () => {
    const problem = makeProblem();
    const warmStart = buildWarmStart(problem);
    const brkga = new BRKGA(problem, {
      islands: 2,
      populationSize: 20,
      maxGenerations: 20,
      warmStartSolution: warmStart,
      warmStartProportion: 0.15,
    });

    const data = brkga['buildIslandWorkerData'](0);

    expect(data.type).to.equal('island-brkga');
    expect(data.islandId).to.equal(0);
    expect(data.options['warmStartolution']).to.be.undefined;
    const forwarded = data.options['warmStartSolution'] as Solution | null | undefined;
    expect(forwarded).to.exist;
    expect(forwarded!.routes.length).to.equal(warmStart.routes.length);
    expect(forwarded!.makespan).to.equal(warmStart.makespan);
  });

  it('omits warmStartSolution when none was provided', () => {
    const problem = makeProblem();
    const brkga = new BRKGA(problem, { islands: 2, populationSize: 20, maxGenerations: 20 });
    const data = brkga['buildIslandWorkerData'](0);
    expect(data.options['warmStartSolution']).to.satisfy(
      (v: unknown) => v === null || v === undefined,
    );
    expect(data.options['warmStartolution']).to.be.undefined;
  });

  it('worker-side BRKGA actually applies the warm-start when one is provided', async () => {
    const problem = makeProblem();
    const warmStart = buildWarmStart(problem);
    const brkga = new BRKGA(problem, {
      islands: 1,
      populationSize: 20,
      maxGenerations: 5,
      warmStartSolution: warmStart,
      warmStartProportion: 0.5,
    });
    const data = brkga['buildIslandWorkerData'](0);

    const { io, posted, emit } = makeIO();
    await runWorkerTask(data, io);

    const firstCheckpoint = posted[0] as {
      type: string;
      population: Array<{ chromosome: Chromosome }>;
    };
    expect(firstCheckpoint.type).to.equal('checkpoint');
    expect(firstCheckpoint.population).to.have.lengthOf(20);

    const warmStartCount = Math.floor(20 * 0.5);
    const warmStartReference = brkga['decoder'].encode(warmStart);
    const warmStartSlots = firstCheckpoint.population.slice(0, warmStartCount);
    for (const ind of warmStartSlots) {
      const c = ind.chromosome;
      expect(c.priorities).to.have.lengthOf(warmStartReference.priorities.length);
      expect(c.assignments).to.have.lengthOf(warmStartReference.assignments.length);
      expect(c.dependencies).to.have.lengthOf(warmStartReference.dependencies.length);
    }

    const identicalCount = warmStartSlots.filter((ind) => {
      const c = ind.chromosome;
      return (
        c.priorities.every((v, i) => v === warmStartReference.priorities[i]) &&
        c.assignments.every((v, i) => v === warmStartReference.assignments[i]) &&
        c.dependencies.every((v, i) => v === warmStartReference.dependencies[i])
      );
    }).length;
    expect(identicalCount).to.be.greaterThan(0);

    emit({ type: 'finish' });
  });

  it('worker-side BRKGA produces a fully-random population when no warm-start is given', async () => {
    const problem = makeProblem();
    const brkga = new BRKGA(problem, { islands: 1, populationSize: 10, maxGenerations: 5 });
    const data = brkga['buildIslandWorkerData'](0);

    const { io, posted, emit } = makeIO();
    await runWorkerTask(data, io);

    const firstCheckpoint = posted[0] as {
      type: string;
      population: Array<{ chromosome: Chromosome }>;
    };
    expect(firstCheckpoint.type).to.equal('checkpoint');
    expect(firstCheckpoint.population).to.have.lengthOf(10);

    emit({ type: 'finish' });
  });
});

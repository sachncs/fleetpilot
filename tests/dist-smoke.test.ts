import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect } from 'chai';

import type { VrpProblem, Vehicle, Customer, LocationNode } from '../src/core/problem.js';
import type { VrpRpdSolver } from '../src/index.js';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const distIndex = path.join(root, 'dist', 'index.mjs');

describe('Dist smoke test', () => {
  before(function (this: Mocha.Context) {
    if (!existsSync(distIndex)) {
      this.skip();
    }
  });

  it('build emits dist/worker.js alongside index', () => {
    const workerPath = path.join(root, 'dist', 'worker.js');
    expect(existsSync(workerPath), 'dist/worker.js must be emitted by the build').to.equal(true);
  });

  it('dist/index.mjs loads and solves a tiny problem', async () => {
    const mod = (await import(distIndex)) as unknown as {
      VrpRpdSolver: typeof VrpRpdSolver;
      VrpProblem: typeof VrpProblem;
      Vehicle: typeof Vehicle;
      Customer: typeof Customer;
      LocationNode: typeof LocationNode;
    };
    const {
      VrpRpdSolver: DistSolver,
      VrpProblem: DistProblem,
      Vehicle: DistVehicle,
      Customer: DistCustomer,
      LocationNode: DistLocationNode,
    } = mod;
    const nodes = {
      0: new DistLocationNode(0, 0, 0, 'Depot'),
      1: new DistLocationNode(1, 10, 0, 'D1'),
      2: new DistLocationNode(2, 20, 0, 'P1'),
      3: new DistLocationNode(3, 0, 10, 'D2'),
      4: new DistLocationNode(4, 0, 20, 'P2'),
    };
    const problem = new DistProblem(
      nodes,
      [new DistCustomer(1, 1, 2, 5), new DistCustomer(2, 3, 4, 5)],
      [new DistVehicle(1, 10)],
    );
    const solution = await new DistSolver(problem).solve({
      populationSize: 50,
      maxGenerations: 20,
      maxTimeMs: 2000,
    });
    expect(solution.isComplete()).to.equal(true);
  });
});

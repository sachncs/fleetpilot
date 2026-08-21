// Smoke test for the benchmark suite. Runs the smallest instance from each
// family with a reduced config and asserts feasibility + correct output.
// Skipped automatically if benchmarks/results/ hasn't been populated.

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect } from 'chai';

import { ADAPTERS, type Family } from '../benchmarks/runner/adapters.js';
import { FleetPilotSolver } from '../src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const SMOKE_INSTANCES: Array<{ family: Family; instance: string }> = [
  { family: 'synthetic', instance: 'synth-10c-small.json' },
  { family: 'cordeau', instance: 'mdvrp-2d-16c.json' },
  { family: 'darp', instance: 'darp-8req-4veh.json' },
  { family: 'salhi-nagy', instance: 'vrpb-20c.json' },
  // Note: Li & Lim and Solomon 100-customer instances are too slow for the
  // Mocha smoke test (~30s+ each). Run them manually via the runner:
  //   npx tsx benchmarks/runner/runner.ts --family lilim --instance lc1_2_1.txt --max-time 5000
  //   npx tsx benchmarks/runner/runner.ts --family solomon --instance c1_2_1.txt --max-time 5000
  // The smoke test is bounded to ~30s wall-clock to keep CI fast.
];

function familyDir(family: Family): string {
  switch (family) {
    case 'lilim':
      return path.resolve(root, 'benchmarks', 'lilim', 'pdptw', '100');
    case 'solomon':
      return path.resolve(root, 'benchmarks', 'solomon', '100');
    case 'cordeau':
      return path.resolve(root, 'benchmarks', 'cordeau', 'mdvrp');
    case 'darp':
      return path.resolve(root, 'benchmarks', 'darp');
    case 'salhi-nagy':
      return path.resolve(root, 'benchmarks', 'salhi-nagy', 'vrpb');
    case 'synthetic':
      return path.resolve(root, 'benchmarks', 'synthetic');
  }
}

describe('Benchmark smoke (smallest instance per family)', function () {
  this.timeout(120_000);

  for (const { family, instance } of SMOKE_INSTANCES) {
    it(`${family} / ${instance} solves feasibly`, async function () {
      const instancePath = path.resolve(familyDir(family), instance);
      if (!existsSync(instancePath)) {
        // Skip if the instance isn't vendored.
        this.skip();
        return;
      }
      const adapter = ADAPTERS[family];
      const parsed = adapter.parse(instancePath);
      const problem = adapter.toProblem(parsed);
      const solver = new FleetPilotSolver(problem);
      const solution = await solver.solve({
        maxTimeMs: 10_000,
        alnsIterations: 50,
        populationSize: 100,
        maxGenerations: 50,
        seed: 1,
      });
      expect(solution.isFeasible(), 'solution must be feasible').to.equal(true);
      expect(solution.isComplete(), 'solution must be complete').to.equal(true);
      expect(solution.makespan, 'makespan must be positive').to.be.greaterThan(0);
    });
  }
});

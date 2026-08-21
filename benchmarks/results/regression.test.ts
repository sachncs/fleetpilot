// Regression test: re-run the smoke on every CI and assert each makespan
// is within 1.3× of the committed baseline. Uses seed=1 so both runs are
// deterministic.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect } from 'chai';

import { FleetPilotSolver } from '../../src/index.js';
import { ADAPTERS, type Family } from '../runner/adapters.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const baselinePath = path.resolve(root, 'benchmarks', 'results', 'smoke-results.json');

const REGRESSION_FACTOR = 1.3;

interface BaselineRow {
  family: Family;
  instance: string;
  customers: number;
  vehicles: number;
  makespan: number | null;
  runtimeMs: number;
  feasible: boolean | null;
}

interface BaselineFile {
  generated: string;
  config: { seed: number; maxTimeMs: number; alnsIterations: number; populationSize: number; maxGenerations: number };
  results: BaselineRow[];
}

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
  throw new Error(`unknown family: ${family as string}`);
}

describe('Benchmark regression (within 1.3× of baseline)', function () {
  this.timeout(300_000);

  before(function () {
    if (!existsSync(baselinePath)) {
      this.skip();
    }
  });

  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as BaselineFile;
  const baselineByKey = new Map<string, BaselineRow>();
  for (const row of baseline.results) {
    baselineByKey.set(`${row.family}/${row.instance}`, row);
  }

  for (const row of baseline.results) {
    const { family, instance } = row;
    if (row.makespan === null || row.makespan <= 0) continue; // skip historical failures
    const baselineMakespan = row.makespan;
    it(`${family}/${instance} stays within ${REGRESSION_FACTOR}× of baseline makespan=${baselineMakespan.toFixed(2)}`, async function () {
      this.timeout(60_000);
      const instancePath = path.resolve(familyDir(family), instance);
      if (!existsSync(instancePath)) {
        this.skip();
        return;
      }
      const adapter = ADAPTERS[family];
      const parsed = adapter.parse(instancePath);
      const problem = adapter.toProblem(parsed);
      const solver = new FleetPilotSolver(problem);
      const solution = await solver.solve({
        maxTimeMs: baseline.config.maxTimeMs,
        alnsIterations: baseline.config.alnsIterations,
        populationSize: baseline.config.populationSize,
        maxGenerations: baseline.config.maxGenerations,
        seed: baseline.config.seed,
      });
      expect(solution.isFeasible(), 'solution must be feasible').to.equal(true);
      const actualMakespan = solution.makespan;
      const factor = actualMakespan / baselineMakespan;
      if (factor > REGRESSION_FACTOR) {
        expect.fail(
          `regression: ${family}/${instance} makespan=${actualMakespan.toFixed(2)} ` +
            `vs baseline=${baselineMakespan.toFixed(2)} (factor=${factor.toFixed(3)} > ${REGRESSION_FACTOR})`,
        );
      }
    });
  }
});

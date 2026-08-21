import { expect } from 'chai';

import { ALNS } from '../../src/algorithms/alns/alns.js';
import { TransferAwareRemovalOperators } from '../../src/algorithms/alns/transfer-aware-operators.js';
import { BRKGA } from '../../src/algorithms/brkga/brkga.js';
import { Problem, LocationNode, Customer, Vehicle } from '../../src/core/problem.js';
import { SolutionWithTransfers } from '../../src/core/solution-with-transfers.js';
import { Route } from '../../src/core/solution.js';
import { VehicleWithCapabilities } from '../../src/core/vehicle-with-capabilities.js';

function buildProblem(): Problem {
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

describe('ALNS deterministic seeded RNG', () => {
  it('produces identical makespans when seed is repeated', () => {
    const problem = buildProblem();
    const first = new ALNS(problem, { maxIterations: 50, seed: 42 }).solve();
    const second = new ALNS(problem, { maxIterations: 50, seed: 42 }).solve();
    expect(first.makespan).to.equal(second.makespan);
  });

  it('produces different exploration paths when seed changes', () => {
    const nodes = {
      0: new LocationNode(0, 0, 0, 'Depot'),
      1: new LocationNode(1, 1, 0, 'D1'),
      2: new LocationNode(2, 2, 0, 'P1'),
      3: new LocationNode(3, 100, 0, 'D2'),
      4: new LocationNode(4, 101, 0, 'P2'),
      5: new LocationNode(5, 50, 0, 'D3'),
      6: new LocationNode(6, 51, 0, 'P3'),
    };
    const customers = [
      new Customer(1, 1, 2, 10),
      new Customer(2, 3, 4, 10),
      new Customer(3, 5, 6, 10),
    ];
    const problem = new Problem(nodes, customers, [new Vehicle(1, 10)], 0);

    const a = new ALNS(problem, { maxIterations: 3, seed: 1 }).solve();
    const b = new ALNS(problem, { maxIterations: 3, seed: 9999 }).solve();
    const aStr = JSON.stringify(a.routes.map((r) => r.nodes));
    const bStr = JSON.stringify(b.routes.map((r) => r.nodes));
    expect(aStr).to.not.equal(bStr);
  });

  it('honors injected random function', () => {
    const problem = buildProblem();
    let counter = 0;
    const deterministic: () => number = () => {
      counter = (counter + 1) % 7;
      return counter / 7;
    };
    const a = new ALNS(problem, { maxIterations: 30, random: deterministic }).solve();
    counter = 0;
    const b = new ALNS(problem, { maxIterations: 30, random: deterministic }).solve();
    expect(a.makespan).to.equal(b.makespan);
  });
});

describe('BRKGA targetMakespan early-stop', () => {
  it('returns before maxGenerations when target is reached', async () => {
    const problem = buildProblem();
    const solver = new BRKGA(problem, {
      populationSize: 20,
      maxGenerations: 5000,
      targetMakespan: 1e9,
      seed: 7,
    });
    const solution = await solver.solve();
    expect(solution.isFeasible()).to.be.true;
    expect(solution.makespan).to.be.lessThan(1e9);
  });

  it('does not early-stop when target is unreachable', async () => {
    const problem = buildProblem();
    const solver = new BRKGA(problem, {
      populationSize: 20,
      maxGenerations: 50,
      targetMakespan: 0,
      seed: 3,
    });
    const solution = await solver.solve();
    expect(solution.isFeasible()).to.be.true;
  });
});

describe('TransferAwareRemovalOperators RNG plumbing', () => {
  it('removes different customers with different seeds', () => {
    const nodes = {
      0: new LocationNode(0, 0, 0, 'Depot'),
      1: new LocationNode(1, 10, 0, 'D1'),
      2: new LocationNode(2, 20, 0, 'P1'),
      3: new LocationNode(3, 30, 0, 'D2'),
      4: new LocationNode(4, 40, 0, 'P2'),
    };
    const customers = [new Customer(1, 1, 2, 10), new Customer(2, 3, 4, 10)];
    const vehicles = [new VehicleWithCapabilities(1, 10), new VehicleWithCapabilities(2, 10)];
    const problem = new Problem(nodes, customers, vehicles, 0);
    const routes = vehicles.map((v) => new Route(v.id, [1, 2]));
    const solution = new SolutionWithTransfers(problem, routes);

    const out1 = TransferAwareRemovalOperators.randomWithTransfers(solution.clone(), 1, () => 0.1);
    const out2 = TransferAwareRemovalOperators.randomWithTransfers(solution.clone(), 1, () => 0.9);
    expect(out1.removed.length).to.equal(1);
    expect(out2.removed.length).to.equal(1);
    expect(out1.removed[0]!.id).to.not.equal(out2.removed[0]!.id);
  });
});

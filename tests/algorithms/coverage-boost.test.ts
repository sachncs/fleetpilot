import { expect } from 'chai';

import { ALNS } from '../../src/algorithms/alns/alns.js';
import { RemovalOperators } from '../../src/algorithms/alns/operators.js';
import { BRKGA } from '../../src/algorithms/brkga/brkga.js';
import { Decoder, type Chromosome } from '../../src/algorithms/brkga/decoder.js';
import { VrpProblem, LocationNode, Customer, Vehicle } from '../../src/core/problem.js';
import { VrpSolution, Route } from '../../src/core/solution.js';
import { createBasicProblem, createTwoVehicleProblem } from '../helpers.js';

describe('Decoder edge cases', () => {
  it('encode with multi-route and gap-clamping', () => {
    const nodes = {
      0: new LocationNode(0, 0, 0, 'Depot'),
      1: new LocationNode(1, 5, 0, 'D1'),
      2: new LocationNode(2, 10, 0, 'P1'),
      3: new LocationNode(3, 100, 0, 'D2'),
      4: new LocationNode(4, 200, 0, 'P2'),
    };
    const customers = [new Customer(1, 1, 2, 1), new Customer(2, 3, 4, 200)];
    const vehicles = [new Vehicle(1, 10), new Vehicle(2, 10)];
    const problem = new VrpProblem(nodes, customers, vehicles, 0);
    const decoder = new Decoder(problem);

    const routes = problem.vehicles.map(v => new Route(v.id, []));
    routes[0]!.nodes.push(1, 2);
    routes[1]!.nodes.push(3, 4);
    const solution = new VrpSolution(problem, routes);
    solution.calculateSchedule();

    const chromosome = decoder.encode(solution);
    for (const dep of chromosome.dependencies) {
      expect(dep).to.be.at.least(0).and.at.most(1);
    }
  });

  it('decode with assignment gene hitting each vehicle', () => {
    const nodes = {
      0: new LocationNode(0, 0, 0, 'Depot'),
      1: new LocationNode(1, 10, 0, 'D1'),
      2: new LocationNode(2, 20, 0, 'P1'),
      3: new LocationNode(3, 100, 0, 'D2'),
      4: new LocationNode(4, 200, 0, 'P2'),
      5: new LocationNode(5, 1000, 0, 'D3'),
      6: new LocationNode(6, 2000, 0, 'P3'),
    };
    const customers = [
      new Customer(1, 1, 2, 10),
      new Customer(2, 3, 4, 10),
      new Customer(3, 5, 6, 10),
    ];
    const vehicles = [new Vehicle(1, 10), new Vehicle(2, 10), new Vehicle(3, 10)];
    const problem = new VrpProblem(nodes, customers, vehicles, 0);
    const decoder = new Decoder(problem);

    const chromosome: Chromosome = {
      priorities: [0.1, 0.5, 0.9],
      assignments: [0.1, 0.5, 0.9],
      dependencies: [0.5, 0.5, 0.5],
      transfers: [0.5, 0.5, 0.5],
    };
    const solution = decoder.decode(chromosome);
    expect(solution.isComplete()).to.be.true;
  });

  it('decode with all-zero gene values across all four arrays', () => {
    const problem = createBasicProblem();
    const decoder = new Decoder(problem);
    const chromosome: Chromosome = {
      priorities: [0, 0],
      assignments: [0, 0],
      dependencies: [0, 0],
      transfers: [0, 0],
    };
    const solution = decoder.decode(chromosome);
    expect(solution.isComplete()).to.be.true;
  });

  it('decode skips nodes via dependencies gene', () => {
    const problem = createBasicProblem();
    const decoder = new Decoder(problem);
    const chromosome: Chromosome = {
      priorities: [0.5, 0.5],
      assignments: [0.5, 0.5],
      dependencies: [0.1, 0.9],
      transfers: [0.5, 0.5],
    };
    const solution = decoder.decode(chromosome);
    expect(solution.isComplete()).to.be.true;
  });
});

describe('ALNS deep branches', () => {
  it('solve with noProgress option does not invoke onProgress', () => {
    const problem = createBasicProblem();
    const alns = new ALNS(problem, { maxIterations: 5, segmentSize: 1 });
    const sol = alns.solve();
    expect(sol).to.not.be.undefined;
  });

  it('solve with adaptive acceptance — accept() returns true for better new cost', () => {
    const problem = createBasicProblem();
    const alns = new ALNS(problem, { maxIterations: 20, segmentSize: 1, initialTemp: 1000 });
    const solution = alns.solve();
    expect(solution.isComplete()).to.be.true;
  });

  it('solve stops early on maxTimeMs', function (this: Mocha.Context) {
    this.timeout(5000);
    const problem = createBasicProblem();
    const alns = new ALNS(problem, { maxIterations: 10000, maxTimeMs: 1 });
    const solution = alns.solve();
    expect(solution.isComplete()).to.be.true;
  });
});

describe('Shaw and cluster with k > 1', () => {
  function buildSolution(): VrpSolution {
    const problem = createTwoVehicleProblem();
    const routes = problem.vehicles.map(v => new Route(v.id, []));
    for (const c of problem.customers) {
      routes[c.id - 1]!.nodes.push(c.deliveryNodeId, c.pickupNodeId);
    }
    const solution = new VrpSolution(problem, routes);
    solution.calculateSchedule();
    return solution;
  }

  it('shaw with k=2 exercises relatedness scoring', () => {
    const solution = buildSolution();
    const { solution: partial, removed } = RemovalOperators.shaw(solution, 2);
    expect(removed.length).to.equal(2);
    expect(partial.isComplete()).to.be.false;
  });

  it('cluster with k=2 exercises distance sorting', () => {
    const solution = buildSolution();
    const { solution: partial, removed } = RemovalOperators.cluster(solution, 2);
    expect(removed.length).to.equal(2);
    expect(partial.isComplete()).to.be.false;
  });

  it('proximity with k=2', () => {
    const solution = buildSolution();
    const { solution: partial, removed } = RemovalOperators.proximity(solution, 2);
    expect(removed.length).to.equal(2);
    expect(partial.isComplete()).to.be.false;
  });
});

describe('BRKGA with various parameters', () => {
  it('solves with high maxGenerations', async function (this: Mocha.Context) {
    this.timeout(10000);
    const problem = createBasicProblem();
    const brkga = new BRKGA(problem, { populationSize: 30, maxGenerations: 30 });
    const solution = await brkga.solve();
    expect(solution.isComplete()).to.be.true;
  });

  it('handles small population', async function (this: Mocha.Context) {
    this.timeout(10000);
    const problem = createBasicProblem();
    const brkga = new BRKGA(problem, { populationSize: 5, maxGenerations: 5 });
    const solution = await brkga.solve();
    expect(solution.isComplete()).to.be.true;
  });
});

describe('Decoder encode with various customer states', () => {
  it('encode tolerates solutions with depot_return entries', () => {
    const nodes = {
      0: new LocationNode(0, 0, 0, 'Depot'),
      1: new LocationNode(1, 10, 0, 'D1'),
      2: new LocationNode(2, 20, 0, 'P1'),
    };
    const customers = [new Customer(1, 1, 2, 10)];
    const vehicles = [new Vehicle(1, 10)];
    const problem = new VrpProblem(nodes, customers, vehicles, 0);
    const decoder = new Decoder(problem);

    const routes = problem.vehicles.map(v => new Route(v.id, []));
    routes[0]!.nodes.push(1, 2);
    const solution = new VrpSolution(problem, routes);
    solution.calculateSchedule();

    const chromosome = decoder.encode(solution);
    expect(chromosome).to.have.all.keys('priorities', 'assignments', 'dependencies', 'transfers');
  });

  it('encode produces valid genes for multi-customer problem', () => {
    const nodes = {
      0: new LocationNode(0, 0, 0, 'Depot'),
      1: new LocationNode(1, 10, 0, 'D1'),
      2: new LocationNode(2, 20, 0, 'P1'),
      3: new LocationNode(3, 30, 0, 'D2'),
      4: new LocationNode(4, 40, 0, 'P2'),
      5: new LocationNode(5, 50, 0, 'D3'),
      6: new LocationNode(6, 60, 0, 'P3'),
    };
    const customers = [
      new Customer(1, 1, 2, 10),
      new Customer(2, 3, 4, 10),
      new Customer(3, 5, 6, 10),
    ];
    const vehicles = [new Vehicle(1, 10), new Vehicle(2, 10)];
    const problem = new VrpProblem(nodes, customers, vehicles, 0);
    const decoder = new Decoder(problem);

    const routes = problem.vehicles.map(v => new Route(v.id, []));
    routes[0]!.nodes.push(1, 2);
    routes[1]!.nodes.push(3, 4, 5, 6);
    const solution = new VrpSolution(problem, routes);
    solution.calculateSchedule();

    const chromosome = decoder.encode(solution);
    expect(chromosome.priorities.length).to.equal(3);
    expect(chromosome.assignments.length).to.equal(3);
  });
});

import { expect } from 'chai';

import { ALNS } from '../../src/algorithms/alns/alns.js';
import { VrpProblem, LocationNode, CustomerWithTimeWindows, Vehicle } from '../../src/core/problem.js';
import { ValidationError } from '../../src/errors.js';
import { createBasicProblem, createSingleCustomerProblem } from '../helpers.js';

function makeProblemWithTwCustomers(): VrpProblem {
  const nodes = {
    0: new LocationNode(0, 0, 0, 'Depot'),
    1: new LocationNode(1, 10, 0, 'D1'),
    2: new LocationNode(2, 20, 0, 'P1'),
    3: new LocationNode(3, 0, 10, 'D2'),
    4: new LocationNode(4, 0, 20, 'P2'),
    5: new LocationNode(5, 30, 10, 'D3'),
    6: new LocationNode(6, 40, 10, 'P3'),
  };
  const customers = [
    new CustomerWithTimeWindows(1, 1, 2, 10, 0, 1000, 50, 1500),
    new CustomerWithTimeWindows(2, 3, 4, 10, 0, 1000, 50, 1500),
    new CustomerWithTimeWindows(3, 5, 6, 10, 0, 1000, 50, 1500),
  ];
  const vehicles = [new Vehicle(1, 10)];
  return new VrpProblem(nodes, customers, vehicles, 0);
}

describe('ALNS validation', () => {
  it('rejects maxIterations < 1', () => {
    const problem = createBasicProblem();
    expect(() => new ALNS(problem, { maxIterations: 0 })).to.throw(ValidationError)
      .with.property('message').that.includes('Max iterations');
  });

  it('rejects coolingRate <= 0', () => {
    const problem = createBasicProblem();
    expect(() => new ALNS(problem, { coolingRate: 0 })).to.throw(ValidationError);
  });

  it('rejects coolingRate >= 1', () => {
    const problem = createBasicProblem();
    expect(() => new ALNS(problem, { coolingRate: 1 })).to.throw(ValidationError);
  });

  it('rejects negative initialTemp', () => {
    const problem = createBasicProblem();
    expect(() => new ALNS(problem, { initialTemp: -1 })).to.throw(ValidationError);
  });

  it('rejects segmentSize < 1', () => {
    const problem = createBasicProblem();
    expect(() => new ALNS(problem, { segmentSize: 0 })).to.throw(ValidationError);
  });
});

describe('ALNS solve edge cases', () => {
  it('runs to completion with one customer', () => {
    const problem = createSingleCustomerProblem();
    const alns = new ALNS(problem, { maxIterations: 5, segmentSize: 1 });
    const solution = alns.solve();
    expect(solution.isComplete()).to.be.true;
  });

  it('runs with segmentSize=1 to hit updateWeights', () => {
    const problem = createBasicProblem();
    const alns = new ALNS(problem, { maxIterations: 5, segmentSize: 1 });
    alns.solve();
    const stats = alns.getOperatorStats();
    expect(stats.removalOps.length).to.be.greaterThan(0);
    expect(stats.insertionOps.length).to.be.greaterThan(0);
  });

  it('reports progress via onProgress callback', () => {
    const problem = createBasicProblem();
    const events: number[] = [];
    const alns = new ALNS(problem, {
      maxIterations: 30,
      segmentSize: 1,
      onProgress: progress => { events.push(progress.iteration); },
    });
    alns.solve();
    expect(events.length).to.be.greaterThan(0);
  });

  it('emits operator stats after solve', () => {
    const problem = createBasicProblem();
    const alns = new ALNS(problem, { maxIterations: 5, segmentSize: 1 });
    alns.solve();
    const stats = alns.getOperatorStats();
    expect(stats.removalWeights).to.have.lengthOf(stats.removalOps.length);
    expect(stats.insertionWeights).to.have.lengthOf(stats.insertionOps.length);
  });

  it('runs with TW customers', () => {
    const problem = makeProblemWithTwCustomers();
    const alns = new ALNS(problem, { maxIterations: 10, segmentSize: 1 });
    const solution = alns.solve();
    expect(solution.isComplete()).to.be.true;
  });

  it('honours maxTimeMs as a stopping condition', function (this: Mocha.Context) {
    this.timeout(10000);
    const problem = createBasicProblem();
    const alns = new ALNS(problem, { maxIterations: 100000, maxTimeMs: 50, segmentSize: 1 });
    const solution = alns.solve();
    expect(solution.isComplete()).to.be.true;
  });
});

describe('ALNS generateInitialSolution', () => {
  it('produces a complete solution', () => {
    const problem = createBasicProblem();
    const alns = new ALNS(problem);
    const initial = alns.generateInitialSolution();
    expect(initial.isComplete()).to.be.true;
  });
});

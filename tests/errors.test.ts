import { expect } from 'chai';

import { Problem, LocationNode, CustomerWithTimeWindows, Vehicle } from '../src/core/problem.js';
import {
  Error,
  ValidationError,
  InfeasibleSolutionError,
  AlgorithmConvergenceError,
} from '../src/errors/index.js';
import { FleetPilotSolver } from '../src/index.js';

describe('Typed Errors', () => {
  it('Error is an Error', () => {
    const err = new Error('base');
    expect(err).to.be.an.instanceOf(Error);
    expect(err.name).to.equal('Error');
    expect(err.message).to.equal('base');
  });

  it('ValidationError is a Error', () => {
    const err = new ValidationError('bad input');
    expect(err).to.be.an.instanceOf(Error);
    expect(err.name).to.equal('ValidationError');
    expect(err.message).to.equal('bad input');
  });

  it('InfeasibleSolutionError is a Error', () => {
    const err = new InfeasibleSolutionError('infeasible');
    expect(err).to.be.an.instanceOf(Error);
    expect(err.name).to.equal('InfeasibleSolutionError');
  });

  it('AlgorithmConvergenceError is a Error', () => {
    const err = new AlgorithmConvergenceError('no convergence');
    expect(err).to.be.an.instanceOf(Error);
    expect(err.name).to.equal('AlgorithmConvergenceError');
  });

  it('errors can be caught by base class', () => {
    try {
      throw new ValidationError('test');
    } catch (e) {
      expect(e).to.be.an.instanceOf(ValidationError);
      if (e instanceof ValidationError) {
        expect(e.message).to.equal('test');
      }
    }
  });

  it('solver throws InfeasibleSolutionError when no feasible solution exists', async () => {
    const nodes = {
      0: new LocationNode(0, 0, 0, 'Depot'),
      1: new LocationNode(1, 10, 0, 'D1'),
      2: new LocationNode(2, 0, 10, 'P1'),
    };
    const customers = [new CustomerWithTimeWindows(1, 1, 2, 5, 0, 0, 0, 1000)];
    const problem = new Problem(nodes, customers, [new Vehicle(1, 10)], 0);

    let threw: unknown = null;
    try {
      await new FleetPilotSolver(problem).solve({
        alnsIterations: 20,
        populationSize: 20,
        maxGenerations: 10,
        maxTimeMs: 2000,
      });
    } catch (err) {
      threw = err;
    }
    expect(threw).to.be.instanceOf(InfeasibleSolutionError);
  });
});

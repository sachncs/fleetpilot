import { expect } from 'chai';

import { VrpProblem, LocationNode, Customer, Vehicle } from '../src/core/problem.js';
import { AbortError, VrpError } from '../src/errors/index.js';
import * as rootExports from '../src/index.js';
import { FleetPilotSolver } from '../src/index.js';

const { AbortError: RootAbortError, VrpError: RootVrpError } = rootExports;

function buildProblem(): VrpProblem {
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
  return new VrpProblem(nodes, customers, [new Vehicle(1, 30)], 0);
}

describe('AbortError', () => {
  it('extends VrpError', () => {
    expect(new AbortError()).to.be.instanceOf(VrpError);
  });

  it('has a descriptive default message', () => {
    expect(new AbortError().message).to.equal('Operation aborted');
  });

  it('is re-exported from the package root', () => {
    expect(RootAbortError).to.be.a('function');
    expect(RootAbortError.name).to.equal('AbortError');
    const instance = new RootAbortError('custom');
    expect(instance.message).to.equal('custom');
    expect(instance).to.be.instanceOf(AbortError);
    expect(instance).to.be.instanceOf(VrpError);
    expect(instance).to.be.instanceOf(RootVrpError);
  });
});

describe('FleetPilotSolver AbortSignal', () => {
  it('rejects with AbortError when signal is pre-aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    let caught: unknown = null;
    try {
      await new FleetPilotSolver(buildProblem()).solve({
        alnsIterations: 5000,
        signal: controller.signal,
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).to.be.instanceOf(AbortError);
  });

  it('continues to completion when no signal is provided', async () => {
    const solution = await new FleetPilotSolver(buildProblem()).solve({
      alnsIterations: 100,
      populationSize: 30,
      maxGenerations: 20,
      maxTimeMs: 5000,
    });
    expect(solution.isFeasible()).to.be.true;
  });
});

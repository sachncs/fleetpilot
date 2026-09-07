import { expect } from 'chai';

import { LocationNode, Customer, Vehicle } from '../src/core/problem.js';
import { TrafficModel, TrafficAwareProblem } from '../src/core/traffic-aware-problem.js';

import { createBasicProblem } from './helpers.js';

function makeSegment(fromId: number, toId: number) {
  return {
    fromId,
    toId,
    baseTravelTime: 10,
    currentTravelTime: 10,
    congestionLevel: 'low' as const,
  };
}

describe('TrafficModel', () => {
  it('setSegment / hasSegment / getAllSegments round-trip', () => {
    const model = new TrafficModel();
    expect(model.hasSegment(1, 2)).to.equal(false);

    model.setSegment(makeSegment(1, 2));
    expect(model.hasSegment(1, 2)).to.equal(true);
    expect(model.hasSegment(2, 1)).to.equal(false);

    const all = model.getAllSegments();
    expect(all).to.have.lengthOf(1);
    expect(all[0]?.fromId).to.equal(1);
    expect(all[0]?.toId).to.equal(2);
  });

  it('setSegment replaces an existing segment for the same road', () => {
    const model = new TrafficModel();
    model.setSegment(makeSegment(1, 2));
    model.setSegment({ ...makeSegment(1, 2), baseTravelTime: 20 });
    const all = model.getAllSegments();
    expect(all).to.have.lengthOf(1);
    expect(all[0]?.baseTravelTime).to.equal(20);
  });

  it('getTravelTime falls back to 0 without traffic data', () => {
    const model = new TrafficModel();
    expect(model.getTravelTime(3, 4)).to.equal(0);
  });

  it('getTravelTime uses currentTravelTime when no time factors match', () => {
    const model = new TrafficModel();
    model.setSegment({ ...makeSegment(1, 2), currentTravelTime: 15 });
    expect(model.getTravelTime(1, 2, 100)).to.equal(15);
  });

  it('getTravelTime applies the latest applicable time factor', () => {
    const model = new TrafficModel();
    model.setSegment(makeSegment(1, 2));
    model.setTimeFactors(1, 2, [
      { startTime: 0, factor: 1.0 },
      { startTime: 60, factor: 1.5 },
    ]);
    expect(model.getTravelTime(1, 2, 10)).to.equal(10);
    expect(model.getTravelTime(1, 2, 90)).to.equal(15);
  });

  it('getAllTimeFactors groups factors by road', () => {
    const model = TrafficModel.fromSerialized(
      [makeSegment(1, 2)],
      [{ fromId: 1, toId: 2, factors: [{ startTime: 0, factor: 1.25 }] }],
    );
    const grouped = model.getAllTimeFactors();
    expect(grouped).to.have.lengthOf(1);
    expect(grouped[0]?.fromId).to.equal(1);
    expect(grouped[0]?.toId).to.equal(2);
    expect(grouped[0]?.factors[0]?.factor).to.equal(1.25);
    expect(model.getTravelTime(1, 2, 5)).to.equal(12.5);
  });

  it('getCongestionLevel returns undefined for unknown roads', () => {
    const model = new TrafficModel();
    expect(model.getCongestionLevel(9, 9)).to.equal(undefined);
  });

  it('updateTraffic reclassifies congestion by ratio tiers', () => {
    const model = new TrafficModel();

    model.setSegment(makeSegment(1, 2));
    model.updateTraffic(1, 2, 11);
    expect(model.getCongestionLevel(1, 2)).to.equal('low');

    model.setSegment(makeSegment(3, 4));
    model.updateTraffic(3, 4, 13);
    expect(model.getCongestionLevel(3, 4)).to.equal('medium');

    model.setSegment(makeSegment(5, 6));
    model.updateTraffic(5, 6, 18);
    expect(model.getCongestionLevel(5, 6)).to.equal('high');

    model.setSegment(makeSegment(7, 8));
    model.updateTraffic(7, 8, 25);
    expect(model.getCongestionLevel(7, 8)).to.equal('severe');

    model.updateTraffic(99, 98, 30); // no-op on unknown road
    expect(model.hasSegment(99, 98)).to.equal(false);
  });
});

describe('TrafficAwareProblem', () => {
  function makeTafficAware(defaultSpeed = 1) {
    const base = createBasicProblem();
    return new TrafficAwareProblem(
      base.nodes,
      base.customers,
      base.vehicles,
      0,
      new TrafficModel(),
      defaultSpeed,
    );
  }

  it('exposes the wrapped problem data and default options', () => {
    const problem = makeTafficAware(2);
    expect(problem.trafficModel).to.be.instanceOf(TrafficModel);
    expect(problem.defaultSpeed).to.equal(2);
    expect(problem.customers).to.have.lengthOf(2);
  });

  it('getTravelTime falls back to distance / speed without segments', () => {
    const problem = makeTafficAware(2);
    const expected = problem.getDistance(0, 1) / 2;
    expect(problem.getTravelTime(0, 1)).to.equal(expected);
  });

  it('initializeTrafficFromDistances seeds every road and getTravelTime uses them', () => {
    const problem = makeTafficAware(2);
    problem.initializeTrafficFromDistances();

    const distance01 = problem.getDistance(0, 1);
    expect(problem.trafficModel.hasSegment(0, 1)).to.equal(true);
    expect(problem.getTravelTime(0, 1)).to.equal(distance01 / 2);
    expect(problem.getTravelTime(0, 1, 123)).to.equal(distance01 / 2);
  });

  it('applyTrafficMultiplier scales travel time and updates congestion', () => {
    const problem = makeTafficAware(1);
    problem.initializeTrafficFromDistances();
    const before = problem.getTravelTime(0, 1);

    problem.applyTrafficMultiplier(0, 1, 1.3);
    expect(problem.getTravelTime(0, 1)).to.be.closeTo(before * 1.3, 1e-9);
    expect(problem.trafficModel.getCongestionLevel(0, 1)).to.equal('medium');
  });

  it('works as a Problem for solver input (smoke)', () => {
    const nodes = {
      0: new LocationNode(0, 0, 0, 'Depot'),
      1: new LocationNode(1, 10, 0, 'D1'),
      2: new LocationNode(2, 20, 0, 'P1'),
    };
    const problem = new TrafficAwareProblem(
      nodes,
      [new Customer(1, 1, 2, 50)],
      [new Vehicle(1, 10)],
    );
    expect(problem.depotNodeId).to.equal(0);
  });
});

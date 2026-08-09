import { expect } from 'chai';

import { VrpProblem, LocationNode, CustomerWithTimeWindows, Vehicle } from '../src/core/problem.js';
import { VrpSolution, Route } from '../src/core/solution.js';

import { createBasicProblem, createTwoVehicleProblem } from './helpers.js';

describe('Solution evaluation methods', () => {
  it('evaluateMakespanWithRoute returns the new makespan for a candidate route', () => {
    const problem = createBasicProblem();
    const solution = new VrpSolution(problem, problem.vehicles.map(v => new Route(v.id, [])));
    const c = problem.customers[0]!;
    const candidate = new Route(1, [c.deliveryNodeId, c.pickupNodeId]);

    // Walk the route manually: depot -> D -> (process 50) -> P (must wait) -> depot
    // Distances: 0->D=10, D->P=10, P->0=20. Arrival at P = 10+50 = 60.
    // Return time = 60 + 20 = 80.
    const makespan = solution.evaluateMakespanWithRoute(0, candidate);
    expect(makespan).to.equal(80);
  });

  it('evaluateMakespanWithRoute matches calculateSchedule when applied', () => {
    const problem = createBasicProblem();
    const routes = problem.vehicles.map(v => new Route(v.id, []));
    const c = problem.customers[0]!;
    routes[0]!.nodes.push(c.deliveryNodeId, c.pickupNodeId);
    const solution = new VrpSolution(problem, routes);
    solution.calculateSchedule();

    const candidate = routes[0]!;
    const expectedMakespan = solution.makespan;
    const evaluated = solution.evaluateMakespanWithRoute(0, candidate);
    expect(evaluated).to.equal(expectedMakespan);
  });

  it('evaluateMakespanWithRoute: longer route -> strictly larger makespan', () => {
    const problem = createBasicProblem();
    const solution = new VrpSolution(problem, problem.vehicles.map(v => new Route(v.id, [])));
    const c1 = problem.customers[0]!;
    const c2 = problem.customers[1]!;

    const short = new Route(1, [c1.deliveryNodeId, c1.pickupNodeId]);
    const long = new Route(1, [
      c1.deliveryNodeId,
      c1.pickupNodeId,
      c2.deliveryNodeId,
      c2.pickupNodeId,
    ]);

    const shortMakespan = solution.evaluateMakespanWithRoute(0, short);
    const longMakespan = solution.evaluateMakespanWithRoute(0, long);
    expect(longMakespan).to.be.greaterThan(shortMakespan);
  });

  it('evaluateMakespanWithTwoRoutes returns the combined makespan', () => {
    const problem = createBasicProblem();
    const solution = new VrpSolution(problem, problem.vehicles.map(v => new Route(v.id, [])));
    const c1 = problem.customers[0]!;
    const c2 = problem.customers[1]!;
    const r1 = new Route(1, [c1.deliveryNodeId, c1.pickupNodeId]);
    const r2 = new Route(2, [c2.deliveryNodeId, c2.pickupNodeId]);

    const result = solution.evaluateMakespanWithTwoRoutes(0, r1, 1, r2, 0);
    // Independent routes, each ends at time 80.
    expect(result.makespan).to.equal(80);
    expect(result.hubReadyTime).to.equal(0);
  });

  it('evaluateMakespanWithTwoRoutes: takes max of both route return times', () => {
    const problem = createTwoVehicleProblem();
    const solution = new VrpSolution(problem, problem.vehicles.map(v => new Route(v.id, [])));
    const c1 = problem.customers[0]!;
    const c2 = problem.customers[1]!;
    const r1 = new Route(1, [c1.deliveryNodeId, c1.pickupNodeId]);
    const r2 = new Route(2, [c2.deliveryNodeId, c2.pickupNodeId]);

    const result = solution.evaluateMakespanWithTwoRoutes(0, r1, 1, r2, 0);
    const onlyR1 = solution.evaluateMakespanWithRoute(0, r1);
    expect(result.makespan).to.be.at.least(onlyR1);
  });

  it('evaluateRouteReturnTime returns the depot-return time for the route', () => {
    const problem = createBasicProblem();
    const routes = problem.vehicles.map(v => new Route(v.id, []));
    const c = problem.customers[0]!;
    routes[0]!.nodes.push(c.deliveryNodeId, c.pickupNodeId);
    const solution = new VrpSolution(problem, routes);
    solution.calculateSchedule();

    const result = solution.evaluateRouteReturnTime(routes[0]!, {});
    expect(result.returnTime).to.be.a('number');
    expect(Number.isFinite(result.returnTime)).to.be.true;
    // Same problem as the first test: depot -> 10 -> 50 (service) -> 10 -> 20 back
    expect(result.returnTime).to.equal(80);
  });

  it('evaluateRouteReturnTime: empty route returns travel-from-depot-to-depot', () => {
    const problem = createBasicProblem();
    const solution = new VrpSolution(problem, problem.vehicles.map(v => new Route(v.id, [])));
    const emptyRoute = new Route(1, []);
    const result = solution.evaluateRouteReturnTime(emptyRoute, {});
    // Single vehicle starting and ending at depot with no stops: distance 0.
    expect(result.returnTime).to.equal(0);
  });

  it('updateRouteAfterAppend matches full calculateSchedule for append-only routes', () => {
    const problem = createBasicProblem();
    const c1 = problem.customers[0]!;
    const c2 = problem.customers[1]!;

    // Incremental: append one node at a time, updating after each.
    const solution = new VrpSolution(problem, problem.vehicles.map(v => new Route(v.id, [])));
    const route = solution.routes[0]!;
    for (const nodeId of [c1.deliveryNodeId, c1.pickupNodeId, c2.deliveryNodeId, c2.pickupNodeId]) {
      route.nodes.push(nodeId);
      solution.updateRouteAfterAppend(0);
    }
    const incrementalMakespan = solution.makespan;

    // Full recalculation on a fresh solution with same routes.
    const solution2 = new VrpSolution(problem, [
      new Route(1, [c1.deliveryNodeId, c1.pickupNodeId, c2.deliveryNodeId, c2.pickupNodeId]),
    ]);
    solution2.calculateSchedule();
    const fullMakespan = solution2.makespan;

    expect(incrementalMakespan).to.equal(fullMakespan);
  });

  it('calculateRouteDistance returns Euclidean distance', () => {
    const problem = createBasicProblem();
    const routes = problem.vehicles.map(v => new Route(v.id, []));
    const c = problem.customers[0]!;
    routes[0]!.nodes.push(c.deliveryNodeId, c.pickupNodeId);
    const solution = new VrpSolution(problem, routes);
    const distance = solution.calculateRouteDistance(routes[0]!);
    expect(distance).to.be.greaterThan(0);
  });

  it('checkTimeWindows returns true for feasible TW', () => {
    const nodes = {
      0: new LocationNode(0, 0, 0, 'Depot'),
      1: new LocationNode(1, 10, 0, 'D1'),
      2: new LocationNode(2, 20, 0, 'P1'),
    };
    const customers = [new CustomerWithTimeWindows(1, 1, 2, 10, 0, 1000, 50, 2000)];
    const problem = new VrpProblem(nodes, customers, [new Vehicle(1, 10)], 0);
    const routes = problem.vehicles.map(v => new Route(v.id, []));
    routes[0]!.nodes.push(1, 2);
    const solution = new VrpSolution(problem, routes);
    solution.calculateSchedule();
    expect(solution.checkTimeWindows()).to.be.true;
  });

  it('checkTimeWindows returns false for TW violations', () => {
    const nodes = {
      0: new LocationNode(0, 0, 0, 'Depot'),
      1: new LocationNode(1, 10, 0, 'D1'),
      2: new LocationNode(2, 20, 0, 'P1'),
    };
    const customers = [new CustomerWithTimeWindows(1, 1, 2, 10, 0, 5, 0, 5)];
    const problem = new VrpProblem(nodes, customers, [new Vehicle(1, 10)], 0);
    const routes = problem.vehicles.map(v => new Route(v.id, []));
    routes[0]!.nodes.push(1, 2);
    const solution = new VrpSolution(problem, routes);
    solution.calculateSchedule();
    expect(solution.checkTimeWindows()).to.be.false;
  });

  it('getObjectives returns distance, cost, and CO2', () => {
    const problem = createTwoVehicleProblem();
    const solution = new VrpSolution(problem, problem.vehicles.map(v => new Route(v.id, [])));
    for (const c of problem.customers) {
      solution.routes[0]!.nodes.push(c.deliveryNodeId, c.pickupNodeId);
    }
    solution.calculateSchedule();
    const objectives = solution.getObjectives();
    expect(objectives).to.have.property('totalDistance');
    expect(objectives).to.have.property('totalCost');
    expect(objectives).to.have.property('totalCO2');
  });

  it('Route.addNode and removeNode maintain a set', () => {
    const route = new Route(1, []);
    route.addNode(5);
    expect(route.hasNode(5)).to.be.true;
    route.removeNode(5);
    expect(route.hasNode(5)).to.be.false;
  });

  it('Route.clone is a deep copy', () => {
    const route = new Route(1, [1, 2, 3]);
    const cloned = route.clone();
    expect(cloned.nodes).to.deep.equal(route.nodes);
    cloned.nodes.push(99);
    expect(route.nodes).to.not.include(99);
  });

  it('Solution.clone produces an independent solution', () => {
    const problem = createBasicProblem();
    const solution = new VrpSolution(problem, problem.vehicles.map(v => new Route(v.id, [])));
    const cloned = solution.clone();
    cloned.routes[0]!.nodes.push(99);
    expect(solution.routes[0]!.nodes).to.not.include(99);
  });

  it('checkCapacity returns true for feasible routes', () => {
    const problem = createBasicProblem();
    const routes = problem.vehicles.map(v => new Route(v.id, []));
    for (const c of problem.customers) {
      routes[0]!.nodes.push(c.deliveryNodeId);
    }
    const solution = new VrpSolution(problem, routes);
    solution.calculateSchedule();
    expect(solution.checkCapacity()).to.be.true;
  });

  it('isFeasible returns false if any check fails', () => {
    const problem = createBasicProblem();
    const routes = problem.vehicles.map(v => new Route(v.id, []));
    const solution = new VrpSolution(problem, routes);
    expect(solution.isFeasible()).to.be.false;
  });

  it('serialize then deserialize round-trips', () => {
    const problem = createBasicProblem();
    const solution = new VrpSolution(problem, problem.vehicles.map(v => new Route(v.id, [])));
    for (const c of problem.customers) {
      solution.routes[0]!.nodes.push(c.deliveryNodeId, c.pickupNodeId);
    }
    solution.calculateSchedule();
    const data = solution.serialize();
    const restored = VrpSolution.deserialize(data, problem);
    expect(restored.routes).to.have.lengthOf(solution.routes.length);
    expect(restored.makespan).to.equal(solution.makespan);
    expect(restored.totalDistance).to.equal(solution.totalDistance);
    expect(restored.totalCost).to.equal(solution.totalCost);
    expect(restored.totalCO2).to.equal(solution.totalCO2);
  });
});

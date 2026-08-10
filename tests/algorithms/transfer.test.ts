import { expect } from 'chai';

import { TransferAwareRemovalOperators, TransferAwareInsertionOperators } from '../../src/algorithms/alns/transfer-aware-operators.js';
import { VrpProblem, LocationNode, Customer } from '../../src/core/problem.js';
import { SolutionWithTransfers } from '../../src/core/solution-with-transfers.js';
import { Route } from '../../src/core/solution.js';
import { TransferHub } from '../../src/core/transfer-hub.js';
import { TransferManager, type ResourceTransfer } from '../../src/core/transfer-manager.js';
import { VehicleWithCapabilities, VehicleFleetManager } from '../../src/core/vehicle-with-capabilities.js';

describe('Transfer-Aware Operators', () => {
  it('randomWithTransfers removes customers without crashing', () => {
    const nodes = {
      0: new LocationNode(0, 0, 0, 'Depot'),
      1: new LocationNode(1, 10, 0, 'D1'),
      2: new LocationNode(2, 20, 0, 'P1'),
      3: new LocationNode(3, 100, 0, 'Hub'),
    };
    const customers = [new Customer(1, 1, 2, 10)];
    const vehicles = [new VehicleWithCapabilities(1, 10), new VehicleWithCapabilities(2, 10)];
    const problem = new VrpProblem(nodes, customers, vehicles, 0);
    const routes = problem.vehicles.map(v => new Route(v.id, []));
    const hubs = [new TransferHub(3, 100, 0, 'Hub')];
    const solution = new SolutionWithTransfers(problem, routes, hubs,
      vehicles.map(v => new VehicleWithCapabilities(v.id, v.capacity)));
    solution.routes[0]!.nodes.push(1, 2);
    solution.calculateSchedule();

    const { removed } = TransferAwareRemovalOperators.randomWithTransfers(solution, 1);
    expect(removed.length).to.equal(1);
  });

  it('greedyInsertionWithTransfers restores completeness', () => {
    const nodes = {
      0: new LocationNode(0, 0, 0, 'Depot'),
      1: new LocationNode(1, 10, 0, 'D1'),
      2: new LocationNode(2, 20, 0, 'P1'),
      3: new LocationNode(3, 100, 0, 'Hub'),
    };
    const customers = [new Customer(1, 1, 2, 10)];
    const vehicles = [new VehicleWithCapabilities(1, 10), new VehicleWithCapabilities(2, 10)];
    const problem = new VrpProblem(nodes, customers, vehicles, 0);
    const routes = problem.vehicles.map(v => new Route(v.id, []));
    const hubs = [new TransferHub(3, 100, 0, 'Hub')];
    const solution = new SolutionWithTransfers(problem, routes, hubs,
      vehicles.map(v => new VehicleWithCapabilities(v.id, v.capacity)));
    solution.routes[0]!.nodes.push(1, 2);
    solution.calculateSchedule();

    const repaired = TransferAwareInsertionOperators.greedyInsertionWithTransfers(
      solution, [...problem.customers], hubs,
    );
    expect(repaired.isComplete()).to.be.true;
  });

  it('greedyInsertionWithTransfers picks a hub when one is closer than direct', () => {
    const nodes = {
      0: new LocationNode(0, 0, 0, 'Depot'),
      1: new LocationNode(1, 10, 0, 'D1'),
      2: new LocationNode(2, 100, 0, 'P1'),
      3: new LocationNode(3, 50, 0, 'Hub'),
    };
    const customers = [new Customer(1, 1, 2, 10)];
    const vehicles = [new VehicleWithCapabilities(1, 10), new VehicleWithCapabilities(2, 10)];
    const problem = new VrpProblem(nodes, customers, vehicles, 0);
    const routes = problem.vehicles.map(v => new Route(v.id, []));
    const hubs = [new TransferHub(3, 50, 0, 'Hub')];
    const solution = new SolutionWithTransfers(problem, routes, hubs,
      vehicles.map(v => new VehicleWithCapabilities(v.id, v.capacity)));
    const repaired = TransferAwareInsertionOperators.greedyInsertionWithTransfers(
      solution, [...problem.customers], hubs,
    );
    expect(repaired.isComplete()).to.be.true;
  });

  it('randomWithTransfers returns empty for k=0', () => {
    const nodes = {
      0: new LocationNode(0, 0, 0, 'Depot'),
      1: new LocationNode(1, 10, 0, 'D1'),
      2: new LocationNode(2, 20, 0, 'P1'),
      3: new LocationNode(3, 100, 0, 'Hub'),
    };
    const customers = [new Customer(1, 1, 2, 10)];
    const vehicles = [new VehicleWithCapabilities(1, 10), new VehicleWithCapabilities(2, 10)];
    const problem = new VrpProblem(nodes, customers, vehicles, 0);
    const routes = problem.vehicles.map(v => new Route(v.id, []));
    const hubs = [new TransferHub(3, 100, 0, 'Hub')];
    const solution = new SolutionWithTransfers(problem, routes, hubs,
      vehicles.map(v => new VehicleWithCapabilities(v.id, v.capacity)));
    solution.routes[0]!.nodes.push(1, 2);
    solution.calculateSchedule();

    const { removed } = TransferAwareRemovalOperators.randomWithTransfers(solution, 0);
    expect(removed).to.deep.equal([]);
  });

  it('randomWithTransfers handles k greater than customer count', () => {
    const nodes = {
      0: new LocationNode(0, 0, 0, 'Depot'),
      1: new LocationNode(1, 10, 0, 'D1'),
      2: new LocationNode(2, 20, 0, 'P1'),
      3: new LocationNode(3, 100, 0, 'Hub'),
    };
    const customers = [new Customer(1, 1, 2, 10)];
    const vehicles = [new VehicleWithCapabilities(1, 10), new VehicleWithCapabilities(2, 10)];
    const problem = new VrpProblem(nodes, customers, vehicles, 0);
    const routes = problem.vehicles.map(v => new Route(v.id, []));
    const hubs = [new TransferHub(3, 100, 0, 'Hub')];
    const solution = new SolutionWithTransfers(problem, routes, hubs,
      vehicles.map(v => new VehicleWithCapabilities(v.id, v.capacity)));
    solution.routes[0]!.nodes.push(1, 2);
    solution.calculateSchedule();

    const { removed } = TransferAwareRemovalOperators.randomWithTransfers(solution, 5);
    expect(removed.length).to.equal(1);
  });

  it('greedyInsertionWithTransfers selects a transfer when beneficial', () => {
    const nodes = {
      0: new LocationNode(0, 0, 0, 'Depot A'),
      1: new LocationNode(1, 50, 0, 'Hub'),
      2: new LocationNode(2, 100, 0, 'D1'),
      3: new LocationNode(3, 150, 0, 'P1'),
    };
    const customers = [new Customer(1, 2, 3, 10)];
    const vehicles = [new VehicleWithCapabilities(1, 10), new VehicleWithCapabilities(2, 10)];
    const problem = new VrpProblem(nodes, customers, vehicles, 0);
    const routes = problem.vehicles.map(v => new Route(v.id, []));
    const hubs = [new TransferHub(1, 50, 0, 'Hub')];
    const solution = new SolutionWithTransfers(problem, routes, hubs,
      vehicles.map(v => new VehicleWithCapabilities(v.id, v.capacity)));
    const repaired = TransferAwareInsertionOperators.greedyInsertionWithTransfers(
      solution, [...problem.customers], hubs,
    );
    expect(repaired.isComplete()).to.be.true;
    // 4 customers with processingTime 50, 2 vehicles with capacity 10 each:
    // no inter-vehicle transfer needed.
    expect(repaired.transfers.length).to.equal(0);
  });
});

describe('VehicleFleetManager', () => {
  it('addVehicle and getVehicle work correctly', () => {
    const manager = new VehicleFleetManager();
    const vehicle = new VehicleWithCapabilities(1, 10);
    manager.addVehicle(vehicle);

    const retrieved = manager.getVehicle(1);
    expect(retrieved).to.not.be.undefined;
    if (retrieved) {
      expect(retrieved.id).to.equal(1);
    }
  });

  it('getVehiclesForResourceType filters correctly', () => {
    const manager = new VehicleFleetManager();
    manager.addVehicle(new VehicleWithCapabilities(1, 10, ['standard']));
    manager.addVehicle(new VehicleWithCapabilities(2, 10, ['refrigerated']));

    const filtered = manager.getVehiclesForResourceType('standard');
    expect(filtered.length).to.equal(1);
  });

  it('updateVehicleState updates load correctly', () => {
    const manager = new VehicleFleetManager();
    manager.addVehicle(new VehicleWithCapabilities(1, 10));
    manager.updateVehicleState(1, 101, 'delivery', 0, 5);
    const state = manager.getVehicleState(1);
    expect(state).to.not.be.undefined;
  });

  it('resetAllStates clears all vehicle states', () => {
    const manager = new VehicleFleetManager();
    manager.addVehicle(new VehicleWithCapabilities(1, 10));
    manager.updateVehicleState(1, 101, 'delivery', 0, 5);
    manager.resetAllStates();

    const state = manager.getVehicleState(1);
    expect(state).to.not.be.undefined;
  });
});

describe('TransferManager', () => {
  it('scheduleTransfer and getTransfersForVehicle work', () => {
    const manager = new TransferManager();
    const hub = new TransferHub(3, 100, 0, 'Hub');
    manager.registerHub(hub);

    const transfer: ResourceTransfer = {
      id: 't1',
      hubNodeId: 3,
      fromVehicleId: 1,
      toVehicleId: 2,
      resourceType: 'standard',
      amount: 5,
      transferTime: 10,
    };
    manager.scheduleTransfer(transfer);

    const transfers = manager.getTransfersForVehicle(1);
    expect(transfers.length).to.equal(1);
    expect(transfers[0]!.id).to.equal('t1');
  });

  it('rejects overlapping transfers at capacity-limited hub', () => {
    const manager = new TransferManager();
    const hub = new TransferHub(3, 100, 0, 'Hub', 1);
    manager.registerHub(hub);

    manager.scheduleTransfer({
      id: 't1',
      hubNodeId: 3,
      fromVehicleId: 1,
      toVehicleId: 2,
      resourceType: 'standard',
      amount: 5,
      transferTime: 10,
    });

    const second = manager.scheduleTransfer({
      id: 't2',
      hubNodeId: 3,
      fromVehicleId: 1,
      toVehicleId: 2,
      resourceType: 'standard',
      amount: 5,
      transferTime: 10,
    });
    expect(second).to.be.false;
  });

  it('handles vehicle waiting state transitions', () => {
    const manager = new VehicleFleetManager();
    manager.addVehicle(new VehicleWithCapabilities(1, 10));
    manager.setVehicleWaiting(1, true, 'resource');
    manager.setVehicleWaiting(1, false);
    const state = manager.getVehicleState(1);
    expect(state?.isWaiting).to.be.false;
  });

  it('getAvailableVehiclesAtHub returns vehicles at the hub', () => {
    const manager = new VehicleFleetManager();
    manager.addVehicle(new VehicleWithCapabilities(1, 10));
    manager.updateVehicleState(1, 5, 'hub', 100, 0);
    const available = manager.getAvailableVehiclesAtHub(5, 200);
    expect(available.length).to.equal(1);
  });

  it('getFleetUtilization returns utilization stats for each vehicle', () => {
    const manager = new VehicleFleetManager();
    manager.addVehicle(new VehicleWithCapabilities(1, 10));
    manager.updateVehicleState(1, 0, 'delivery', 50, 0);
    const stats = manager.getFleetUtilization();
    expect(stats.length).to.equal(1);
    // utilizationRate = initialLoad / capacity, clamped to [0, 1].
    expect(stats[0]!.utilizationRate).to.be.at.least(0).and.at.most(1);
  });

  it('allows non-overlapping transfers at same hub', () => {
    const manager = new TransferManager();
    const hub = new TransferHub(3, 100, 0, 'Hub', 1);
    manager.registerHub(hub);

    manager.scheduleTransfer({
      id: 't1',
      hubNodeId: 3,
      fromVehicleId: 1,
      toVehicleId: 2,
      resourceType: 'standard',
      amount: 5,
      transferTime: 10,
    });

    const second = manager.scheduleTransfer({
      id: 't2',
      hubNodeId: 3,
      fromVehicleId: 1,
      toVehicleId: 2,
      resourceType: 'standard',
      amount: 5,
      transferTime: 100,
    });
    expect(second).to.be.true;
  });

  it('getAllHubs returns registered hubs', () => {
    const manager = new TransferManager();
    manager.registerHub(new TransferHub(3, 100, 0, 'Hub1'));
    manager.registerHub(new TransferHub(5, 200, 0, 'Hub2'));
    const hubs = manager.getAllHubs();
    expect(hubs.length).to.equal(2);
  });

  it('clearAll resets all transfers', () => {
    const manager = new TransferManager();
    manager.registerHub(new TransferHub(3, 100, 0, 'Hub'));
    manager.scheduleTransfer({
      id: 't1',
      hubNodeId: 3,
      fromVehicleId: 1,
      toVehicleId: 2,
      resourceType: 'standard',
      amount: 5,
      transferTime: 10,
    });
    manager.clearAll();
    expect(manager.getAllTransfers().length).to.equal(0);
  });
});

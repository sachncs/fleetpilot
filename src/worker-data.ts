import {
  VrpProblem,
  LocationNode,
  Customer,
  CustomerWithTimeWindows,
  Vehicle,
} from './core/problem.js';
import {
  TrafficAwareProblem,
  TrafficModel,
  type TrafficSegment,
} from './core/traffic-aware-problem.js';
import type {
  WorkerData,
  WorkerCustomerData,
  WorkerTrafficSegmentData,
  WorkerVehicleData,
} from './worker-validation.js';

/** Metadata that pairs with a problem to form a `WorkerData` payload. */
export interface WorkerMeta {
  type: 'ALNS' | 'BRKGA' | 'island-brkga';
  options: object;
  islandId?: number;
}

/**
 * Serializes a problem into the worker-data payload.
 * @param problem - Problem instance to serialize
 * @param meta - Algorithm type, options, and island metadata
 * @returns Structured data safe for worker_threads structured clone
 */
export function serializeProblem(problem: VrpProblem, meta: WorkerMeta): WorkerData {
  const nodes: Record<number, { id: number; x: number; y: number; name: string }> = {};
  for (const [id, node] of Object.entries(problem.nodes)) {
    nodes[Number(id)] = { id: node.id, x: node.x, y: node.y, name: node.name };
  }

  const customers: WorkerCustomerData[] = problem.customers.map(c => {
    const base = {
      id: c.id,
      deliveryNodeId: c.deliveryNodeId,
      pickupNodeId: c.pickupNodeId,
      processingTime: c.processingTime,
    };
    if (c instanceof CustomerWithTimeWindows) {
      return {
        ...base,
        earliestDeliveryTime: c.earliestDeliveryTime,
        latestDeliveryTime: c.latestDeliveryTime,
        earliestPickupTime: c.earliestPickupTime,
        latestPickupTime: c.latestPickupTime,
      };
    }
    return base;
  });

  const vehicles: WorkerVehicleData[] = problem.vehicles.map(v => ({
    id: v.id,
    capacity: v.capacity,
    startDepotId: v.startDepotId,
    endDepotId: v.endDepotId,
    costPerKm: v.costPerKm,
    co2PerKm: v.co2PerKm,
  }));

  const isTraffic = problem instanceof TrafficAwareProblem;
  const data: WorkerData = {
    nodes,
    customers,
    vehicles,
    depotNodeId: problem.depotNodeId,
    problemKind: isTraffic ? 'traffic' : 'base',
    type: meta.type,
    options: meta.options as Record<string, unknown>,
  };

  if (problem instanceof TrafficAwareProblem) {
    data.trafficSegments = problem.trafficModel.getAllSegments().map(
      (s: TrafficSegment): WorkerTrafficSegmentData => ({
        fromId: s.fromId,
        toId: s.toId,
        baseTravelTime: s.baseTravelTime,
        currentTravelTime: s.currentTravelTime,
        congestionLevel: s.congestionLevel,
      }),
    );
    data.trafficTimeFactors = problem.trafficModel.getAllTimeFactors().map(entry => ({
      fromId: entry.fromId,
      toId: entry.toId,
      factors: entry.factors.map(f => ({ startTime: f.startTime, factor: f.factor })),
    }));
    data.defaultSpeed = problem.defaultSpeed;
  }

  if (meta.islandId !== undefined) {
    data.islandId = meta.islandId;
  }

  return data;
}

/**
 * Rebuilds a problem instance from serialized worker data.
 * @param data - Worker data produced by serializeProblem
 * @returns A problem instance preserving vehicles, time windows, and traffic
 */
export function deserializeProblem(data: WorkerData): VrpProblem {
  const nodes: Record<number, LocationNode> = {};
  for (const [id, node] of Object.entries(data.nodes)) {
    nodes[Number(id)] = new LocationNode(node.id, node.x, node.y, node.name);
  }

  const customers = data.customers.map(c => {
    if (c.earliestDeliveryTime !== undefined) {
      return new CustomerWithTimeWindows(
        c.id,
        c.deliveryNodeId,
        c.pickupNodeId,
        c.processingTime,
        c.earliestDeliveryTime,
        c.latestDeliveryTime ?? 0,
        c.earliestPickupTime ?? 0,
        c.latestPickupTime ?? 0,
      );
    }
    return new Customer(c.id, c.deliveryNodeId, c.pickupNodeId, c.processingTime);
  });

  const vehicles = data.vehicles.map(
    v =>
      new Vehicle(
        v.id,
        v.capacity,
        v.startDepotId ?? 0,
        v.endDepotId ?? 0,
        v.costPerKm ?? 1,
        v.co2PerKm ?? 1,
      ),
  );

  if (data.problemKind === 'traffic') {
    const model = TrafficModel.fromSerialized(
      data.trafficSegments ?? [],
      data.trafficTimeFactors ?? [],
    );
    return new TrafficAwareProblem(
      nodes,
      customers,
      vehicles,
      data.depotNodeId,
      model,
      data.defaultSpeed ?? 1,
    );
  }

  return new VrpProblem(nodes, customers, vehicles, data.depotNodeId);
}

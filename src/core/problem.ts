import { ValidationError } from '../errors/index.js';

/**
 * Represents a coordinate or location in the VRP problem.
 */
export class LocationNode {
  /**
   * @param id - Unique node identifier
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param name - Optional display name
   */
  constructor(
    public readonly id: number,
    public readonly x: number,
    public readonly y: number,
    public readonly name: string = '',
  ) {}
}

/**
 * Represents a customer with a delivery and a pickup requirement.
 * In FleetPilot, the resource is delivered to D_c, processed for p_c, and then picked up at P_c.
 */
export class Customer {
  /**
   * @param id - Unique customer identifier
   * @param deliveryNodeId - Node where delivery occurs
   * @param pickupNodeId - Node where pickup occurs
   * @param processingTime - Time required to process the resource between delivery and pickup
   */
  constructor(
    public readonly id: number,
    public readonly deliveryNodeId: number,
    public readonly pickupNodeId: number,
    public readonly processingTime: number,
  ) {}
}

/**
 * Represents a customer with time window constraints (VRPTW extension).
 */
export class CustomerWithTimeWindows extends Customer {
  /**
   * @param id - Unique customer identifier
   * @param deliveryNodeId - Node where delivery occurs
   * @param pickupNodeId - Node where pickup occurs
   * @param processingTime - Time required to process the resource
   * @param earliestDeliveryTime - Earliest allowed delivery time
   * @param latestDeliveryTime - Latest allowed delivery time
   * @param earliestPickupTime - Earliest allowed pickup time
   * @param latestPickupTime - Latest allowed pickup time
   */
  constructor(
    id: number,
    deliveryNodeId: number,
    pickupNodeId: number,
    processingTime: number,
    public readonly earliestDeliveryTime: number,
    public readonly latestDeliveryTime: number,
    public readonly earliestPickupTime: number,
    public readonly latestPickupTime: number,
  ) {
    super(id, deliveryNodeId, pickupNodeId, processingTime);
  }
}

/**
 * Represents a vehicle with a specific capacity.
 */
export class Vehicle {
  /**
   * @param id - Unique vehicle identifier
   * @param capacity - Maximum load the vehicle can carry
   * @param startDepotId - Depot where the route begins
   * @param endDepotId - Depot where the route ends
   * @param costPerKm - Cost per unit distance
   * @param co2PerKm - CO2 emissions per unit distance
   */
  constructor(
    public readonly id: number,
    public readonly capacity: number,
    public readonly startDepotId: number = 0,
    public readonly endDepotId: number = 0,
    public readonly costPerKm: number = 1,
    public readonly co2PerKm: number = 1,
  ) {}
}

import { validateProblemBase } from './validate-problem-base.js';

/**
 * Main problem instance.
 */
export class VrpProblem {
  readonly distanceMatrix: Readonly<Record<number, Readonly<Record<number, number>>>>;

  /**
   * @param nodes - Available nodes by ID (depots, customer D/P, hubs)
   * @param customers - Customers to serve (each with delivery and pickup node IDs)
   * @param vehicles - Fleet (each with capacity, optional start/end depot)
   * @param depotNodeId - Default depot for vehicles without explicit start/end
   * @throws `ValidationError` if the input violates invariants (shared nodes,
   *   TW ordering, non-integer IDs, missing customer references, etc.)
   */
  constructor(
    public readonly nodes: Readonly<Record<number, LocationNode>>,
    public readonly customers: ReadonlyArray<Customer>,
    public readonly vehicles: ReadonlyArray<Vehicle>,
    public readonly depotNodeId: number = 0,
  ) {
    validateProblemBase(nodes, customers, vehicles);
    if (!Number.isInteger(depotNodeId)) {
      throw new ValidationError(`Depot node ID must be an integer, got ${depotNodeId}`);
    }
    if (!nodes[depotNodeId]) {
      throw new ValidationError(`Depot node ${depotNodeId} does not exist in nodes`);
    }

    // Build O(1) lookup indexes
    const deliveryNodeMap = new Map<number, Customer>();
    const pickupNodeMap = new Map<number, Customer>();
    const nodeToCustomerIndex = new Map<number, number>();
    for (let i = 0; i < customers.length; i++) {
      const c = customers[i];
      if (!c) continue;
      deliveryNodeMap.set(c.deliveryNodeId, c);
      pickupNodeMap.set(c.pickupNodeId, c);
      nodeToCustomerIndex.set(c.deliveryNodeId, i);
      nodeToCustomerIndex.set(c.pickupNodeId, i);
    }
    this.deliveryNodeMap = deliveryNodeMap;
    this.pickupNodeMap = pickupNodeMap;
    this.nodeToCustomerIndex = nodeToCustomerIndex;

    const vehicleMap = new Map<number, Vehicle>();
    for (const v of vehicles) {
      vehicleMap.set(v.id, v);
    }
    this.vehicleMap = vehicleMap;

    this.distanceMatrix = this.calculateDistanceMatrix();
  }

  readonly deliveryNodeMap: ReadonlyMap<number, Customer>;
  readonly pickupNodeMap: ReadonlyMap<number, Customer>;
  readonly vehicleMap: ReadonlyMap<number, Vehicle>;
  readonly nodeToCustomerIndex: ReadonlyMap<number, number>;

  private calculateDistanceMatrix(): Record<number, Record<number, number>> {
    const matrix: Record<number, Record<number, number>> = {};
    const nodeIds = Object.keys(this.nodes).map(Number);

    for (const i of nodeIds) {
      matrix[i] = {};
      for (const j of nodeIds) {
        const n1 = this.nodes[i];
        const n2 = this.nodes[j];
        if (n1 && n2) {
          matrix[i][j] = Math.sqrt(Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2));
        } else {
          matrix[i][j] = 0;
        }
      }
    }

    return matrix;
  }

  /**
   * @param fromId - Origin node ID
   * @param toId - Destination node ID
   * @returns Euclidean distance between the two nodes
   */
  getDistance(fromId: number, toId: number): number {
    const distance = this.distanceMatrix[fromId]?.[toId];
    return distance ?? 0;
  }

  /**
   * @param fromId - Origin node ID
   * @param toId - Destination node ID
   * @param speed - Vehicle speed (default 1)
   * @returns Travel time between the two nodes
   */
  getTravelTime(fromId: number, toId: number, speed: number = 1): number {
    return this.getDistance(fromId, toId) / speed;
  }
}

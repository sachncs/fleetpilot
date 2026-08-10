/** Wire-serializable node (matches LocationNode's serialized fields). */
export interface WorkerNodeData {
  id: number;
  x: number;
  y: number;
  name: string;
}

/** Wire-serializable customer (plain Customer or CustomerWithTimeWindows). */
export interface WorkerCustomerData {
  id: number;
  deliveryNodeId: number;
  pickupNodeId: number;
  processingTime: number;
  earliestDeliveryTime?: number;
  latestDeliveryTime?: number;
  earliestPickupTime?: number;
  latestPickupTime?: number;
}

/** Wire-serializable vehicle. */
export interface WorkerVehicleData {
  id: number;
  capacity: number;
  startDepotId?: number;
  endDepotId?: number;
  costPerKm?: number;
  co2PerKm?: number;
}

/** Wire-serializable traffic segment (matches TrafficSegment). */
export interface WorkerTrafficSegmentData {
  fromId: number;
  toId: number;
  baseTravelTime: number;
  currentTravelTime: number;
  congestionLevel: 'low' | 'medium' | 'high' | 'severe';
}

/** Wire-serializable time-dependent factor (multiplier after `startTime`). */
export interface WorkerTimeFactorData {
  startTime: number;
  factor: number;
}

/** Payload sent into a worker thread via `workerData`. */
export interface WorkerData {
  nodes: Record<number, WorkerNodeData>;
  customers: WorkerCustomerData[];
  vehicles: WorkerVehicleData[];
  depotNodeId: number;
  problemKind: 'base' | 'traffic';
  trafficSegments?: WorkerTrafficSegmentData[];
  trafficTimeFactors?: Array<{
    fromId: number;
    toId: number;
    factors: WorkerTimeFactorData[];
  }>;
  defaultSpeed?: number;
  type: 'ALNS' | 'BRKGA' | 'island-brkga';
  options: Record<string, unknown>;
  islandId?: number;
}

/** Result posted back from the worker thread when solving completes. */
export interface WorkerResult {
  makespan: number;
  routes: Array<{ vehicleId: number; nodes: number[] }>;
  type: string;
}

/**
 * Structural type guard: does `value` have the shape of a `WorkerData`?
 * Use this before further validating with `validateWorkerData`.
 * @param value - Unknown payload (typically `workerData`)
 * @returns True if `value` has the required top-level fields and shapes
 */
export function isWorkerData(value: unknown): value is WorkerData {
  if (typeof value !== 'object' || value === null) return false;
  return (
    'nodes' in value && typeof value.nodes === 'object' && value.nodes !== null &&
    'customers' in value && Array.isArray(value.customers) &&
    'vehicles' in value && Array.isArray(value.vehicles) &&
    'depotNodeId' in value && typeof value.depotNodeId === 'number' &&
    'problemKind' in value &&
    (value.problemKind === 'base' || value.problemKind === 'traffic') &&
    'type' in value && typeof value.type === 'string' &&
    (value.type === 'ALNS' || value.type === 'BRKGA' || value.type === 'island-brkga') &&
    'options' in value && typeof value.options === 'object' && value.options !== null
  );
}

/**
 * Validates every field of a `WorkerData` after `isWorkerData` has accepted
 * the top-level shape. Returns the first error found, or null if valid.
 * @param data - Worker data that already passed `isWorkerData`
 * @returns A human-readable error message, or null if `data` is valid
 */
export function validateWorkerData(data: WorkerData): string | null {
  const nodeIds = Object.keys(data.nodes).map(Number);
  if (nodeIds.length === 0) return 'nodes cannot be empty';

  for (const id of nodeIds) {
    const node = data.nodes[id];
    if (!node) return `node ${id} is missing`;
    if (typeof node.id !== 'number') return `node ${id}: id must be a number`;
    if (typeof node.x !== 'number' || !Number.isFinite(node.x)) {
      return `node ${id}: x must be a finite number`;
    }
    if (typeof node.y !== 'number' || !Number.isFinite(node.y)) {
      return `node ${id}: y must be a finite number`;
    }
  }

  if (data.customers.length === 0) return 'customers cannot be empty';
  const customerIds = new Set<number>();
  for (const c of data.customers) {
    if (customerIds.has(c.id)) return `duplicate customer ID: ${c.id}`;
    customerIds.add(c.id);
    if (!data.nodes[c.deliveryNodeId]) {
      return `customer ${c.id}: deliveryNodeId ${c.deliveryNodeId} not found in nodes`;
    }
    if (!data.nodes[c.pickupNodeId]) {
      return `customer ${c.id}: pickupNodeId ${c.pickupNodeId} not found in nodes`;
    }
    if (typeof c.processingTime !== 'number' || c.processingTime < 0) {
      return `customer ${c.id}: processingTime must be >= 0`;
    }
    const twFields: Array<[string, number | undefined]> = [
      ['earliestDeliveryTime', c.earliestDeliveryTime],
      ['latestDeliveryTime', c.latestDeliveryTime],
      ['earliestPickupTime', c.earliestPickupTime],
      ['latestPickupTime', c.latestPickupTime],
    ];
    const hasTw = twFields.some(([, v]) => v !== undefined);
    if (hasTw) {
      for (const [name, v] of twFields) {
        if (v === undefined) {
          return `customer ${c.id}: ${name} must be provided when time windows are used`;
        }
        if (!Number.isFinite(v)) return `customer ${c.id}: ${name} must be finite`;
      }
      if (
        c.earliestDeliveryTime! > c.latestDeliveryTime! ||
        c.earliestPickupTime! > c.latestPickupTime!
      ) {
        return `customer ${c.id}: time window start must not exceed its end`;
      }
    }
  }

  if (data.vehicles.length === 0) return 'vehicles cannot be empty';
  const vehicleIds = new Set<number>();
  for (const v of data.vehicles) {
    if (vehicleIds.has(v.id)) return `duplicate vehicle ID: ${v.id}`;
    vehicleIds.add(v.id);
    if (typeof v.capacity !== 'number' || v.capacity <= 0) {
      return `vehicle ${v.id}: capacity must be > 0`;
    }
    if (v.startDepotId !== undefined && !data.nodes[v.startDepotId]) {
      return `vehicle ${v.id}: startDepotId ${v.startDepotId} not found in nodes`;
    }
    if (v.endDepotId !== undefined && !data.nodes[v.endDepotId]) {
      return `vehicle ${v.id}: endDepotId ${v.endDepotId} not found in nodes`;
    }
    if (v.costPerKm !== undefined && v.costPerKm < 0) {
      return `vehicle ${v.id}: costPerKm must be >= 0`;
    }
    if (v.co2PerKm !== undefined && v.co2PerKm < 0) {
      return `vehicle ${v.id}: co2PerKm must be >= 0`;
    }
  }

  if (!data.nodes[data.depotNodeId]) return `depotNodeId ${data.depotNodeId} not found in nodes`;

  if (data.problemKind === 'traffic') {
    for (const segment of data.trafficSegments ?? []) {
      if (!data.nodes[segment.fromId] || !data.nodes[segment.toId]) {
        return `traffic segment ${segment.fromId}->${segment.toId} references missing nodes`;
      }
      if (!Number.isFinite(segment.baseTravelTime) || segment.baseTravelTime < 0) {
        return `traffic segment ${segment.fromId}->${segment.toId}: baseTravelTime must be >= 0`;
      }
      if (!Number.isFinite(segment.currentTravelTime) || segment.currentTravelTime < 0) {
        return `traffic segment ${segment.fromId}->${segment.toId}: currentTravelTime must be >= 0`;
      }
    }
  }

  if (data.type === 'island-brkga') {
    if (
      typeof data.islandId !== 'number' || data.islandId < 0 ||
      !Number.isInteger(data.islandId)
    ) {
      return 'islandId must be a non-negative integer';
    }
    const islandPopulationSize = data.options['islandPopulationSize'];
    if (
      typeof islandPopulationSize !== 'number' || islandPopulationSize < 1 ||
      !Number.isInteger(islandPopulationSize)
    ) {
      return 'islandPopulationSize must be a positive integer';
    }
    const islandMaxGenerations = data.options['islandMaxGenerations'];
    if (
      typeof islandMaxGenerations !== 'number' || islandMaxGenerations < 1 ||
      !Number.isInteger(islandMaxGenerations)
    ) {
      return 'islandMaxGenerations must be a positive integer';
    }
    const migrationInterval = data.options['migrationInterval'];
    if (
      typeof migrationInterval !== 'number' || migrationInterval < 1 ||
      !Number.isInteger(migrationInterval)
    ) {
      return 'migrationInterval must be a positive integer';
    }
  }

  return null;
}

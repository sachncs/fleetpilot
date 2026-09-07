// Benchmark adapters — convert each instance family into a `Problem`.
// Each adapter exports a `parse<T>(filePath: string): T` and a `toProblem(parsed: T): Problem`.
// All paths use the project's ESM convention (`./src/...js`).

import { readFileSync } from 'node:fs';

import {
  Customer,
  CustomerWithTimeWindows,
  LocationNode,
  Vehicle,
  Problem,
} from '../../src/core/problem.js';

// ============================================================================
// Li & Lim PDPTW
// ============================================================================

export interface LiLimNode {
  id: number;
  x: number;
  y: number;
  demand: number;
  readyTime: number;
  dueTime: number;
  serviceTime: number;
  pairedNodeId: number;
}

export interface LiLimInstance {
  numVehicles: number;
  capacity: number;
  nodes: LiLimNode[];
}

export function parseLiLim(filePath: string): LiLimInstance {
  const lines = readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error(`Li & Lim file too short: ${filePath}`);
  }
  const header = lines[0]!.split(/\s+/).map(Number);
  const numVehicles = header[0]!;
  const capacity = header[1]!;
  const nodes = lines.slice(1).map((line) => {
    const parts = line.split(/\s+/).map(Number);
    return {
      id: parts[0]!,
      x: parts[1]!,
      y: parts[2]!,
      demand: parts[3]!,
      readyTime: parts[4]!,
      dueTime: parts[5]!,
      serviceTime: parts[6]!,
      pairedNodeId: parts[7]!,
    };
  });
  return { numVehicles, capacity, nodes };
}

export function liLimToProblem(parsed: LiLimInstance): Problem {
  const nodes: Record<number, LocationNode> = {};
  for (const n of parsed.nodes) {
    nodes[n.id] = new LocationNode(n.id, n.x, n.y, `L${n.id}`);
  }
  // Build request pairs: each customer has one pickup node (negative demand)
  // and one delivery node (positive demand). Vehicle visits D_c first, then P_c.
  const customers: Customer[] = [];
  let custId = 1;
  const seen = new Set<number>();
  for (const n of parsed.nodes) {
    if (n.demand === 0 || seen.has(n.id)) continue;
    if (n.demand < 0) {
      // n is pickup; find its delivery partner.
      const partner = parsed.nodes.find((m) => m.id === n.pairedNodeId);
      if (!partner) {
        throw new Error(`Li & Lim node ${n.id} has no paired delivery node ${n.pairedNodeId}`);
      }
      // FleetPilot swap: n is the FleetPilot delivery, partner is the FleetPilot pickup.
      customers.push(
        new Customer(
          custId++,
          n.id,
          partner.id,
          Math.max(n.serviceTime, partner.serviceTime),
        ),
      );
      seen.add(n.id);
      seen.add(partner.id);
    }
  }
  const vehicles: Vehicle[] = [];
  for (let v = 1; v <= parsed.numVehicles; v++) {
    vehicles.push(new Vehicle(v, parsed.capacity));
  }
  return new Problem(nodes, customers, vehicles, 0);
}

// ============================================================================
// Solomon / Gehring-Homberger VRPTW (degenerate P/D)
// ============================================================================

export interface SolomonNode {
  id: number;
  x: number;
  y: number;
  demand: number;
  readyTime: number;
  dueTime: number;
  serviceTime: number;
}

export interface SolomonInstance {
  name: string;
  numVehicles: number;
  capacity: number;
  nodes: SolomonNode[];
}

export function parseSolomon(filePath: string): SolomonInstance {
  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const name = lines[0]?.trim() ?? 'solomon-unknown';
  let numVehicles = 0;
  let capacity = 0;
  const nodes: SolomonNode[] = [];
  let inCustomer = false;
  let nextIsVehicleCount = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^VEHICLE/i.test(trimmed)) {
      nextIsVehicleCount = true;
      continue;
    }
    if (/^CUSTOMER/i.test(trimmed)) {
      inCustomer = true;
      nextIsVehicleCount = false;
      continue;
    }
    if (nextIsVehicleCount && /^\s*\d+/.test(line) && !inCustomer) {
      const parts = line.split(/\s+/).filter(Boolean);
      numVehicles = Number(parts[0]);
      capacity = Number(parts[1]);
      nextIsVehicleCount = false;
      continue;
    }
    if (inCustomer && /^\s*\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+/.test(line)) {
      const parts = line.split(/\s+/).filter(Boolean);
      nodes.push({
        id: Number(parts[0]),
        x: Number(parts[1]),
        y: Number(parts[2]),
        demand: Number(parts[3]),
        readyTime: Number(parts[4]),
        dueTime: Number(parts[5]),
        serviceTime: Number(parts[6]),
      });
    }
  }
  if (nodes.length === 0) {
    throw new Error(`Solomon file empty or unparseable: ${filePath}`);
  }
  return { name, numVehicles, capacity, nodes };
}

export function solomonToProblem(parsed: SolomonInstance): Problem {
  const nodes: Record<number, LocationNode> = {};
  for (const n of parsed.nodes) {
    nodes[n.id] = new LocationNode(n.id, n.x, n.y, `S${n.id}`);
  }
  const customers: Customer[] = [];
  let custId = 1;
  for (const n of parsed.nodes) {
    if (n.id === 0) continue;
    // Degenerate P/D: same node for both.
    if (n.readyTime > 0 || n.dueTime < 1_000_000) {
      customers.push(
        new CustomerWithTimeWindows(
          custId++,
          n.id,
          n.id,
          n.serviceTime,
          n.readyTime,
          n.dueTime,
          n.readyTime,
          n.dueTime,
        ),
      );
    } else {
      customers.push(new Customer(custId++, n.id, n.id, n.serviceTime));
    }
  }
  const vehicles: Vehicle[] = [];
  for (let v = 1; v <= parsed.numVehicles; v++) {
    vehicles.push(new Vehicle(v, parsed.capacity));
  }
  return new Problem(nodes, customers, vehicles, 0);
}

// ============================================================================
// FleetPilot native JSON (Cordeau, DARP, Salhi-Nagy, synthetic)
// ============================================================================

export interface FleetPilotJsonNode {
  id: number;
  x: number;
  y: number;
  name?: string;
}

export interface FleetPilotJsonShape {
  depotNodeId: number;
  nodes: Array<FleetPilotJsonNode> | Record<string, FleetPilotJsonNode>;
  customers: Array<{
    id: number;
    deliveryNodeId: number;
    pickupNodeId: number;
    processingTime: number;
    earliestDeliveryTime?: number;
    latestDeliveryTime?: number;
    earliestPickupTime?: number;
    latestPickupTime?: number;
  }>;
  vehicles: Array<{
    id: number;
    capacity: number;
    startDepotId?: number;
    endDepotId?: number;
  }>;
  depots?: Array<{ id: number; x: number; y: number; name?: string }>;
}

export function parseFleetPilotJson(filePath: string): FleetPilotJsonShape {
  const data = JSON.parse(readFileSync(filePath, 'utf8')) as FleetPilotJsonShape;
  return data;
}

export function fleetPilotJsonToProblem(parsed: FleetPilotJsonShape): Problem {
  const nodes: Record<number, LocationNode> = {};
  const nodeList = Array.isArray(parsed.nodes)
    ? parsed.nodes
    : Object.values(parsed.nodes);
  for (const n of nodeList) {
    nodes[n.id] = new LocationNode(n.id, n.x, n.y, n.name ?? '');
  }
  const customers: Customer[] = [];
  for (const c of parsed.customers) {
    if (
      c.earliestDeliveryTime !== undefined &&
      c.latestDeliveryTime !== undefined &&
      c.earliestPickupTime !== undefined &&
      c.latestPickupTime !== undefined
    ) {
      customers.push(
        new CustomerWithTimeWindows(
          c.id,
          c.deliveryNodeId,
          c.pickupNodeId,
          c.processingTime,
          c.earliestDeliveryTime,
          c.latestDeliveryTime,
          c.earliestPickupTime,
          c.latestPickupTime,
        ),
      );
    } else {
      customers.push(
        new Customer(c.id, c.deliveryNodeId, c.pickupNodeId, c.processingTime),
      );
    }
  }
  const vehicles: Vehicle[] = [];
  for (const v of parsed.vehicles) {
    vehicles.push(
      new Vehicle(
        v.id,
        v.capacity,
        v.startDepotId ?? parsed.depotNodeId,
        v.endDepotId ?? parsed.depotNodeId,
      ),
    );
  }
  return new Problem(nodes, customers, vehicles, parsed.depotNodeId);
}

// ============================================================================
// Adapter registry
// ============================================================================

export type Family = 'lilim' | 'solomon' | 'cordeau' | 'darp' | 'salhi-nagy' | 'synthetic';

export interface FamilyAdapter {
  parse: (filePath: string) => unknown;
  toProblem: (parsed: unknown) => Problem;
}

export const ADAPTERS: Record<Family, FamilyAdapter> = {
  'lilim': { parse: parseLiLim as FamilyAdapter['parse'], toProblem: liLimToProblem as FamilyAdapter['toProblem'] },
  'solomon': { parse: parseSolomon as FamilyAdapter['parse'], toProblem: solomonToProblem as FamilyAdapter['toProblem'] },
  'cordeau': { parse: parseFleetPilotJson as FamilyAdapter['parse'], toProblem: fleetPilotJsonToProblem as FamilyAdapter['toProblem'] },
  'darp': { parse: parseFleetPilotJson as FamilyAdapter['parse'], toProblem: fleetPilotJsonToProblem as FamilyAdapter['toProblem'] },
  'salhi-nagy': { parse: parseFleetPilotJson as FamilyAdapter['parse'], toProblem: fleetPilotJsonToProblem as FamilyAdapter['toProblem'] },
  'synthetic': { parse: parseFleetPilotJson as FamilyAdapter['parse'], toProblem: fleetPilotJsonToProblem as FamilyAdapter['toProblem'] },
};

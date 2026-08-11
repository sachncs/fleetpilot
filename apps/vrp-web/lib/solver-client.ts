'use client';

// Solver client: invokes VrpRpdSolver on the browser. The main thread
// implementation is plenty fast for the smoke-sized problems the UI targets.
// Runs in an async fire-and-forget so the UI stays responsive.

import {
  VrpRpdSolver,
  VrpProblem,
  LocationNode,
  Customer,
  CustomerWithTimeWindows,
  Vehicle,
} from 'vehicle-routing';

import type { Problem } from '@/lib/problem-schema';
import type { SolverSolution, SolverProgress, SolverSolveOptions } from '@/lib/problem-store';

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function buildVrpProblem(p: Problem): VrpProblem {
  const nodeList = Array.isArray(p.nodes) ? p.nodes : Object.values(p.nodes);
  const nodes: Record<number, LocationNode> = {};
  for (const n of nodeList) {
    nodes[n.id] = new LocationNode(n.id, n.x, n.y, n.name ?? '');
  }
  const customers: Customer[] = p.customers.map((c) => {
    if (isFiniteNumber(c.earliestDeliveryTime) && isFiniteNumber(c.latestDeliveryTime)
        && isFiniteNumber(c.earliestPickupTime) && isFiniteNumber(c.latestPickupTime)) {
      return new CustomerWithTimeWindows(
        c.id,
        c.deliveryNodeId,
        c.pickupNodeId,
        c.processingTime,
        c.earliestDeliveryTime,
        c.latestDeliveryTime,
        c.earliestPickupTime,
        c.latestPickupTime,
      );
    }
    return new Customer(c.id, c.deliveryNodeId, c.pickupNodeId, c.processingTime);
  });
  const vehicles: Vehicle[] = p.vehicles.map((v) => {
    return new Vehicle(
      v.id,
      v.capacity,
      v.startDepotId ?? p.depotNodeId,
      v.endDepotId ?? p.depotNodeId,
      v.costPerKm ?? 1,
      v.co2PerKm ?? 1,
    );
  });
  return new VrpProblem(nodes, customers, vehicles, p.depotNodeId);
}

export async function solveProblem(
  problem: Problem,
  options: SolverSolveOptions,
  onProgress?: (progress: SolverProgress) => void,
): Promise<SolverSolution> {
  const vrpProblem = buildVrpProblem(problem);
  const solver = new VrpRpdSolver(vrpProblem);
  const solution = await solver.solve({
    alnsIterations: options.alnsIterations,
    populationSize: options.populationSize,
    maxGenerations: options.maxGenerations,
    maxTimeMs: options.maxTimeMs,
    seed: options.seed,
    warmStart: options.warmStart,
    onProgress: onProgress
      ? (p) =>
          onProgress({
            stage: p.stage,
            iteration: p.iteration,
            maxGenerations: p.maxGenerations,
            bestMakespan: p.bestMakespan,
            elapsedMs: p.elapsedMs,
          })
      : undefined,
  });

  return {
    makespan: solution.makespan,
    totalDistance: solution.totalDistance,
    totalCost: solution.totalCost,
    totalCo2: solution.totalCo2,
    feasible: solution.isFeasible(),
    routes: solution.routes.map((r) => ({
      vehicleId: r.vehicleId,
      nodes: r.nodes,
    })),
    nodeTimes: solution.nodeTimes,
    nodeTimesEntries: Object.entries(solution.nodeTimes).map(
      ([k, v]) => [Number(k), v] as [number, number],
    ),
  };
}

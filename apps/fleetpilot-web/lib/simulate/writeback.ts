// Playback writeback contract: pure functions that turn simulator
// observations into registry-bound payloads. No IO here — callers own
// fetching and error handling, so the logic stays unit-testable.

import type { Problem } from '@/lib/problem-schema';

export interface WindowViolation {
  nodeId: number;
  kind: 'late' | 'early';
  /** Solver clock minutes at arrival. */
  arrival: number;
  windowStart: number | null;
  windowEnd: number | null;
}

interface CustomerWindowLike {
  deliveryNodeId: number;
  pickupNodeId: number;
  earliestDeliveryTime?: number;
  latestDeliveryTime?: number;
  earliestPickupTime?: number;
  latestPickupTime?: number;
}

function checkArrival(
  nodeId: number,
  arrival: number,
  earliest: number | undefined,
  latest: number | undefined,
  out: WindowViolation[],
): void {
  if (latest !== undefined && arrival > latest) {
    out.push({ nodeId, kind: 'late', arrival, windowStart: earliest ?? null, windowEnd: latest });
  } else if (earliest !== undefined && arrival < earliest) {
    out.push({ nodeId, kind: 'early', arrival, windowStart: earliest, windowEnd: latest ?? null });
  }
}

/**
 * Time-window violations implied by the solution's node arrival times.
 * Only customers that declare windows are checked — the engine does not
 * enforce windows itself, so this is an observation layer.
 */
export function detectWindowViolations(
  problem: Problem,
  nodeTimes: Record<string, number>,
): WindowViolation[] {
  const violations: WindowViolation[] = [];
  const customers = (problem.customers ?? []) as unknown as CustomerWindowLike[];

  for (const c of customers) {
    const deliveryArrival = nodeTimes[String(c.deliveryNodeId)];
    if (deliveryArrival !== undefined) {
      checkArrival(c.deliveryNodeId, deliveryArrival, c.earliestDeliveryTime, c.latestDeliveryTime, violations);
    }
    const pickupArrival = nodeTimes[String(c.pickupNodeId)];
    if (pickupArrival !== undefined) {
      checkArrival(c.pickupNodeId, pickupArrival, c.earliestPickupTime, c.latestPickupTime, violations);
    }
  }

  return violations;
}

export interface ExceptionPayload {
  orderId: string | null;
  nodeId: number;
  kind: 'late' | 'early';
  arrival: number;
  windowStart: number | null;
  windowEnd: number | null;
  reportedAt: string;
}

/** Map a playback violation to the payload accepted by the orders API. */
export function buildExceptionPayload(
  violation: WindowViolation,
  options: { orderId?: string | null; reportedAt?: Date } = {},
): ExceptionPayload {
  return {
    orderId: options.orderId ?? null,
    nodeId: violation.nodeId,
    kind: violation.kind,
    arrival: violation.arrival,
    windowStart: violation.windowStart,
    windowEnd: violation.windowEnd,
    reportedAt: (options.reportedAt ?? new Date()).toISOString(),
  };
}

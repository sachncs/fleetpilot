// Playback writeback contract: pure functions that turn simulator
// observations into registry-bound payloads. No IO here — callers own
// fetching and error handling, so the logic stays unit-testable.

import type { Problem } from '@/lib/problem-schema';

export interface WindowViolation {
  nodeId: number;
  orderId?: string;
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
  orderId?: string;
}

function checkArrival(
  nodeId: number,
  arrival: number,
  earliest: number | undefined,
  latest: number | undefined,
  out: WindowViolation[],
  orderId?: string,
): void {
  if (latest !== undefined && arrival > latest) {
    out.push({ nodeId, orderId, kind: 'late', arrival, windowStart: earliest ?? null, windowEnd: latest });
  } else if (earliest !== undefined && arrival < earliest) {
    out.push({ nodeId, orderId, kind: 'early', arrival, windowStart: earliest, windowEnd: latest ?? null });
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
      checkArrival(c.deliveryNodeId, deliveryArrival, c.earliestDeliveryTime, c.latestDeliveryTime, violations, c.orderId);
    }
    const pickupArrival = nodeTimes[String(c.pickupNodeId)];
    if (pickupArrival !== undefined) {
      checkArrival(c.pickupNodeId, pickupArrival, c.earliestPickupTime, c.latestPickupTime, violations, c.orderId);
    }
  }

  return violations;
}

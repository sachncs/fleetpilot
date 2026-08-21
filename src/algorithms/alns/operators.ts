import type { Customer, Problem } from '../../core/problem.js';
import type { Solution } from '../../core/solution.js';
import { isCustomerWithTimeWindows } from '../../core/solution.js';

function removeCustomerFromRoutes(solution: Solution, customer: Customer): boolean {
  let removedAny = false;
  for (const route of solution.routes) {
    const dIndex = route.nodes.indexOf(customer.deliveryNodeId);
    const pIndex = route.nodes.indexOf(customer.pickupNodeId);

    if (dIndex !== -1 && pIndex !== -1) {
      // Remove higher index first to avoid shifting
      if (dIndex > pIndex) {
        route.nodes.splice(dIndex, 1);
        route.nodes.splice(pIndex, 1);
      } else {
        route.nodes.splice(pIndex, 1);
        route.nodes.splice(dIndex, 1);
      }
      removedAny = true;
    } else if (dIndex !== -1) {
      route.nodes.splice(dIndex, 1);
      removedAny = true;
    } else if (pIndex !== -1) {
      route.nodes.splice(pIndex, 1);
      removedAny = true;
    }
  }
  return removedAny;
}

/**
 * Removal operators for ALNS.
 * Paper specifies 6 destroy operators.
 */
export const RemovalOperators = {
  /**
   * Random removal - removes k random customers from the solution.
   */
  random: (
    solution: Solution,
    k: number,
    random: () => number,
  ): { solution: Solution; removed: Customer[] } => {
    const newSolution = solution.clone();
    const removed: Customer[] = [];
    const allCustomers = [...solution.problem.customers];

    for (let i = 0; i < k && allCustomers.length > 0; i++) {
      const randomIndex = Math.floor(random() * allCustomers.length);
      const customer = allCustomers.splice(randomIndex, 1)[0]!;

      if (removeCustomerFromRoutes(newSolution, customer)) {
        removed.push(customer);
      }
    }

    return { solution: newSolution, removed };
  },

  /**
   * Worst removal (Critical Path) - removes k customers that contribute most to the makespan.
   * Also known as Critical Path Removal in the paper.
   */
  worst: (solution: Solution, k: number): { solution: Solution; removed: Customer[] } => {
    const newSolution = solution.clone();
    const removed: Customer[] = [];

    const customerCosts: Array<{ customer: Customer; cost: number }> = [];

    for (const customer of solution.problem.customers) {
      const deliveryTime = solution.nodeTimes[customer.deliveryNodeId] ?? 0;
      const pickupTime = solution.nodeTimes[customer.pickupNodeId] ?? 0;
      const cost = pickupTime - deliveryTime;
      customerCosts.push({ customer, cost });
    }

    customerCosts.sort((a, b) => b.cost - a.cost);

    for (let i = 0; i < k && i < customerCosts.length; i++) {
      const customer = customerCosts[i]!.customer;

      if (removeCustomerFromRoutes(newSolution, customer)) {
        removed.push(customer);
      }
    }

    return { solution: newSolution, removed };
  },

  /**
   * Shaw removal - removes k customers that are related (close in distance and time).
   * Uses a relatedness measure combining spatial and temporal proximity.
   */
  shaw: (
    solution: Solution,
    k: number,
    random: () => number,
  ): { solution: Solution; removed: Customer[] } => {
    const newSolution = solution.clone();
    const removed: Customer[] = [];

    if (k <= 0 || solution.problem.customers.length === 0) {
      return { solution: newSolution, removed };
    }

    // Start with a random customer
    const seedIndex = Math.floor(random() * solution.problem.customers.length);
    const seed = solution.problem.customers[seedIndex]!;
    const removedSet = new Set<number>([seed.id]);
    removed.push(seed);

    removeCustomerFromRoutes(newSolution, seed);

    // Find related customers to remove
    while (removed.length < k) {
      let bestCustomer: Customer | null = null;
      let bestRelatedness = Infinity;

      for (const customer of solution.problem.customers) {
        if (removedSet.has(customer.id)) continue;

        const relatedness = calculateRelatedness(
          seed,
          customer,
          solution.problem,
          solution.nodeTimes,
        );

        if (relatedness < bestRelatedness) {
          bestRelatedness = relatedness;
          bestCustomer = customer;
        }
      }

      if (!bestCustomer) break;

      removedSet.add(bestCustomer.id);
      removed.push(bestCustomer);

      removeCustomerFromRoutes(newSolution, bestCustomer);
    }

    return { solution: newSolution, removed };
  },

  /**
   * Cluster removal - removes k customers that are geographically close.
   */
  cluster: (
    solution: Solution,
    k: number,
    random: () => number,
  ): { solution: Solution; removed: Customer[] } => {
    const newSolution = solution.clone();
    const removed: Customer[] = [];

    // Pick a random seed customer
    const seedIndex = Math.floor(random() * solution.problem.customers.length);
    const seed = solution.problem.customers[seedIndex];
    if (!seed) {
      return { solution: newSolution, removed };
    }

    // Sort customers by distance to seed via the precomputed distance matrix
    const sortedCustomers = [...solution.problem.customers].sort(
      (a, b) =>
        solution.problem.getDistance(a.deliveryNodeId, seed.deliveryNodeId) -
        solution.problem.getDistance(b.deliveryNodeId, seed.deliveryNodeId),
    );

    // Remove k closest customers
    for (let i = 0; i < k && i < sortedCustomers.length; i++) {
      const customer = sortedCustomers[i]!;

      if (removeCustomerFromRoutes(newSolution, customer)) {
        removed.push(customer);
      }
    }

    return { solution: newSolution, removed };
  },

  /**
   * Proximity removal - removes customers close to each other geographically.
   * Focuses purely on spatial proximity.
   */
  proximity: (
    solution: Solution,
    k: number,
    random: () => number,
  ): { solution: Solution; removed: Customer[] } => {
    const newSolution = solution.clone();
    const removed: Customer[] = [];

    if (solution.problem.customers.length === 0) {
      return { solution: newSolution, removed };
    }

    // Pick random seed
    const seedIndex = Math.floor(random() * solution.problem.customers.length);
    const seed = solution.problem.customers[seedIndex]!;

    // Sort by pure distance via the precomputed distance matrix
    const sortedCustomers = [...solution.problem.customers].sort(
      (a, b) =>
        solution.problem.getDistance(a.deliveryNodeId, seed.deliveryNodeId) -
        solution.problem.getDistance(b.deliveryNodeId, seed.deliveryNodeId),
    );

    for (let i = 0; i < k && i < sortedCustomers.length; i++) {
      const customer = sortedCustomers[i]!;

      if (removeCustomerFromRoutes(newSolution, customer)) {
        removed.push(customer);
      }
    }

    return { solution: newSolution, removed };
  },

  /**
   * Temporal removal - removes customers based on time window tightness.
   * Targets customers with the most restrictive timing constraints.
   */
  temporal: (solution: Solution, k: number): { solution: Solution; removed: Customer[] } => {
    const newSolution = solution.clone();
    const removed: Customer[] = [];

    // Calculate time tightness for each customer
    const tightnessScores: Array<{ customer: Customer; score: number }> = [];

    for (const customer of solution.problem.customers) {
      const deliveryTime = solution.nodeTimes[customer.deliveryNodeId] ?? 0;
      const pickupTime = solution.nodeTimes[customer.pickupNodeId] ?? 0;

      // Higher score = more critical (longer wait or tighter constraint)
      let score = 0;

      // Check if time window constrained
      if (isCustomerWithTimeWindows(customer)) {
        const deliverySlack = Math.max(0, customer.earliestDeliveryTime - deliveryTime);
        const pickupSlack = Math.max(0, customer.earliestPickupTime - pickupTime);
        score = deliverySlack + pickupSlack;
      }

      // Add waiting time component
      const waitTime = pickupTime - deliveryTime - customer.processingTime;
      score += Math.max(0, waitTime);

      tightnessScores.push({ customer, score });
    }

    // Sort by tightness (highest first)
    tightnessScores.sort((a, b) => b.score - a.score);

    // Remove k most critical customers
    for (let i = 0; i < k && i < tightnessScores.length; i++) {
      const customer = tightnessScores[i]!.customer;

      if (removeCustomerFromRoutes(newSolution, customer)) {
        removed.push(customer);
      }
    }

    return { solution: newSolution, removed };
  },
};

/**
 * Calculate relatedness between two customers.
 * Lower value = more related (should be removed together).
 */
function calculateRelatedness(
  c1: Customer,
  c2: Customer,
  problem: Problem,
  nodeTimes: Record<number, number>,
): number {
  // Spatial component: use the precomputed distance matrix instead of
  // recomputing Euclidean distance inline.
  const dist = problem.getDistance(c1.deliveryNodeId, c2.deliveryNodeId);

  // Temporal component
  const t1 = nodeTimes[c1.deliveryNodeId] ?? 0;
  const t2 = nodeTimes[c2.deliveryNodeId] ?? 0;
  const timeDiff = Math.abs(t1 - t2);

  // Combined relatedness (weighted sum)
  return dist + timeDiff;
}

/**
 * Insertion operators for ALNS.
 * Paper specifies 4 repair operators.
 */
export const InsertionOperators = {
  /**
   * Greedy insertion - inserts customers at the best position.
   */
  greedyInsertion: (solution: Solution, customers: readonly Customer[]): Solution => {
    const newSolution = solution.clone();

    for (const customer of customers) {
      let bestCost = Infinity;
      let bestRouteIndex = 0;
      let bestDeliveryPos = 0;
      let bestPickupPos = 0;

      // Try inserting in each route
      for (let rIdx = 0; rIdx < newSolution.routes.length; rIdx++) {
        const costs = newSolution.evaluateInsertionCosts(
          rIdx,
          customer.deliveryNodeId,
          customer.pickupNodeId,
          customer.processingTime,
        );
        for (let dPos = 0; dPos < costs.length; dPos++) {
          const row = costs[dPos]!;
          for (let p = 0; p < row.length; p++) {
            const makespan = row[p]!;
            if (makespan < bestCost) {
              bestCost = makespan;
              bestRouteIndex = rIdx;
              bestDeliveryPos = dPos;
              bestPickupPos = dPos + p;
            }
          }
        }
      }

      // Insert at best position
      const bestRoute = newSolution.routes[bestRouteIndex];
      if (bestRoute) {
        bestRoute.nodes.splice(bestDeliveryPos, 0, customer.deliveryNodeId);
        bestRoute.nodes.splice(bestPickupPos + 1, 0, customer.pickupNodeId);
      }
    }

    newSolution.calculateSchedule();
    return newSolution;
  },

  /**
   * Regret-2 insertion - inserts customers based on regret cost.
   * Regret = difference between best and second-best insertion cost.
   */
  regret2Insertion: (solution: Solution, customers: readonly Customer[]): Solution => {
    return regretInsertion(solution, customers, 2);
  },

  /**
   * Regret-3 insertion - uses difference between best and third-best.
   * Paper specifies this as one of the 4 repair operators.
   */
  regret3Insertion: (solution: Solution, customers: readonly Customer[]): Solution => {
    return regretInsertion(solution, customers, 3);
  },

  /**
   * Regret-4 insertion - uses difference between best and fourth-best.
   * Paper specifies this as one of the 4 repair operators.
   */
  regret4Insertion: (solution: Solution, customers: readonly Customer[]): Solution => {
    return regretInsertion(solution, customers, 4);
  },
};

/**
 * General regret-k insertion.
 * @param k - Which best insertion to compare against (2 = second-best, 3 = third-best, etc.)
 */
function regretInsertion(solution: Solution, customers: readonly Customer[], k: number): Solution {
  const newSolution = solution.clone();
  const remaining = [...customers];

  while (remaining.length > 0) {
    let bestRegret = -Infinity;
    let bestCustomer: Customer | null = null;
    let bestRouteIndex = 0;
    let bestDeliveryPos = 0;
    let bestPickupPos = 0;

    for (const customer of remaining) {
      const costs: Array<{ cost: number; routeIndex: number; dPos: number; pPos: number }> = [];

      // Find best positions in each route
      for (let rIdx = 0; rIdx < newSolution.routes.length; rIdx++) {
        const route = newSolution.routes[rIdx]!;

        let bestRouteCost = Infinity;
        let bestDPos = 0;
        let bestPPos = 0;

        for (let dPos = 0; dPos <= route.nodes.length; dPos++) {
          for (let pPos = dPos; pPos <= route.nodes.length; pPos++) {
            const testRoute = route.clone();
            testRoute.nodes.splice(dPos, 0, customer.deliveryNodeId);
            testRoute.nodes.splice(pPos + (dPos <= pPos ? 1 : 0), 0, customer.pickupNodeId);

            const testMakespan = newSolution.evaluateMakespanWithRoute(rIdx, testRoute);
            if (testMakespan < bestRouteCost) {
              bestRouteCost = testMakespan;
              bestDPos = dPos;
              bestPPos = pPos;
            }
          }
        }

        costs.push({ cost: bestRouteCost, routeIndex: rIdx, dPos: bestDPos, pPos: bestPPos });
      }

      costs.sort((a, b) => a.cost - b.cost);

      // Calculate regret (difference between k-th best and best)
      const best = costs[0]!;

      if (costs.length >= k) {
        const kth = costs[k - 1]!;
        const regret = kth.cost - best.cost;
        if (regret > bestRegret) {
          bestRegret = regret;
          bestCustomer = customer;
          bestRouteIndex = best.routeIndex;
          bestDeliveryPos = best.dPos;
          bestPickupPos = best.pPos;
        }
      } else if (costs.length >= 2 && k > costs.length) {
        // Fallback to available regret
        const worst = costs[costs.length - 1]!;
        const regret = worst.cost - best.cost;
        if (regret > bestRegret) {
          bestRegret = regret;
          bestCustomer = customer;
          bestRouteIndex = best.routeIndex;
          bestDeliveryPos = best.dPos;
          bestPickupPos = best.pPos;
        }
      } else if (costs.length >= 1) {
        // Only one viable route exists; use it with zero regret
        if (0 >= bestRegret) {
          bestRegret = 0;
          bestCustomer = customer;
          bestRouteIndex = best.routeIndex;
          bestDeliveryPos = best.dPos;
          bestPickupPos = best.pPos;
        }
      }
    }

    if (bestCustomer) {
      const route = newSolution.routes[bestRouteIndex]!;
      route.nodes.splice(bestDeliveryPos, 0, bestCustomer.deliveryNodeId);
      route.nodes.splice(bestPickupPos + 1, 0, bestCustomer.pickupNodeId);
      const index = remaining.indexOf(bestCustomer);
      remaining.splice(index, 1);
    } else if (remaining.length > 0) {
      // Safety break to prevent infinite loop
      break;
    }
  }

  newSolution.calculateSchedule();
  return newSolution;
}

/** Valid keys for the removal operators exposed by `RemovalOperators`. */
export type RemovalOperatorKey = keyof typeof RemovalOperators;
/** Valid keys for the insertion operators exposed by `InsertionOperators`. */
export type InsertionOperatorKey = keyof typeof InsertionOperators;

/**
 * All removal-operator keys in the order they appear in `RemovalOperators`.
 * Used by `ALNS` to drive weighted roulette selection of destroy operators.
 */
export const REMOVAL_OPERATOR_KEYS: RemovalOperatorKey[] = [
  'random',
  'worst',
  'shaw',
  'cluster',
  'proximity',
  'temporal',
];

/**
 * All insertion-operator keys in the order they appear in `InsertionOperators`.
 * Used by `ALNS` to drive weighted roulette selection of repair operators.
 */
export const INSERTION_OPERATOR_KEYS: InsertionOperatorKey[] = [
  'greedyInsertion',
  'regret2Insertion',
  'regret3Insertion',
  'regret4Insertion',
];

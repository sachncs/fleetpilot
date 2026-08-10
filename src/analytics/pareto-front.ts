/** Pareto-optimal solution indices and their objective vectors. */
export interface ParetoFront {
  solutions: number[];
  objectives: Array<{ makespan: number; distance: number; cost: number; co2: number }>;
}
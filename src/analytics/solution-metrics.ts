/** Aggregate metrics describing a single solution. */
export interface SolutionMetrics {
  makespan: number;
  totalDistance: number;
  totalCost: number;
  totalCo2: number;
  avgVehicleUtilization: number;
  totalWaitTime: number;
  feasibilityScore: number;
}
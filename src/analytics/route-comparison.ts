/** Per-route scalar metrics for a single solution. */
export interface RouteComparison {
  routeId: number;
  vehicleId: number;
  makespan: number;
  totalDistance: number;
  totalCost: number;
  totalCo2: number;
  efficiency: number;
}
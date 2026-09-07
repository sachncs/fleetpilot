/** Per-vehicle load and time utilisation for a single route. */
export interface VehicleUtilization {
  vehicleId: number;
  capacity: number;
  maxLoad: number;
  utilizationRate: number;
  totalDistance: number;
  totalTime: number;
  customerCount: number;
}

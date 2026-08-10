import type { ResourceType } from './resource-type.js';

/**
 * Mutable per-vehicle state during route execution. Updated by
 * `VehicleFleetManager.updateVehicleState()` after each node visit.
 */
export interface VehicleState {
  vehicleId: number;
  currentLocation: number | null;
  currentNodeType: 'depot' | 'delivery' | 'pickup' | 'hub' | null;
  currentLoad: number;
  loadByType: Map<ResourceType, number>;
  arrivedAtTime: number;
  isWaiting: boolean;
  waitReason: 'resource' | 'transfer' | 'timeWindow' | 'none';
}
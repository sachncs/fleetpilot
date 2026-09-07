import type { ResourceTransfer } from './resource-transfer-types.js';
import type { TransferHub } from './transfer-hub.js';

export type { ResourceTransfer } from './resource-transfer-types.js';
export { TransferHub } from './transfer-hub.js';

/**
 * Manages resource transfers between vehicles.
 */
export class TransferManager {
  private readonly transfers: Map<string, ResourceTransfer> = new Map();
  private readonly hubs: Map<number, TransferHub> = new Map();
  private readonly vehicleSchedules: Map<
    number,
    Array<{ startTime: number; endTime: number; hubId: number }>
  > = new Map();

  /**
   * Registers a transfer hub with this manager.
   * @param hub - The hub to register
   */
  registerHub(hub: TransferHub): void {
    this.hubs.set(hub.id, hub);
  }

  /**
   * @param hubId - Hub ID to look up
   * @returns The hub, or undefined if not registered
   */
  getHub(hubId: number): TransferHub | undefined {
    return this.hubs.get(hubId);
  }

  /**
   * @param transfer - Transfer event to schedule
   * @returns True if the transfer was successfully scheduled without conflicts
   */
  scheduleTransfer(transfer: ResourceTransfer): boolean {
    const hub = this.hubs.get(transfer.hubNodeId);
    if (!hub) return false;

    // Calculate transfer duration
    const transferDuration = transfer.amount * hub.transferTimePerUnit;

    // Check for scheduling conflicts
    const fromVehicleSchedule = this.vehicleSchedules.get(transfer.fromVehicleId) || [];
    const toVehicleSchedule = this.vehicleSchedules.get(transfer.toVehicleId) || [];

    const endTime = transfer.transferTime + transferDuration;

    // Check if either vehicle is busy
    const fromVehicleBusy = fromVehicleSchedule.some(
      (s) => transfer.transferTime < s.endTime && endTime > s.startTime,
    );
    const toVehicleBusy = toVehicleSchedule.some(
      (s) => transfer.transferTime < s.endTime && endTime > s.startTime,
    );

    if (fromVehicleBusy || toVehicleBusy) {
      return false; // Conflict detected
    }

    // Check hub concurrency limit
    const concurrentAtHub = Array.from(this.transfers.values()).filter((t) => {
      const tEndTime = t.transferTime + t.amount * hub.transferTimePerUnit;
      return (
        t.hubNodeId === transfer.hubNodeId &&
        t.transferTime < endTime &&
        tEndTime > transfer.transferTime
      );
    });

    if (concurrentAtHub.length >= hub.maxConcurrentTransfers) {
      return false; // Hub capacity exceeded
    }

    // Schedule the transfer
    this.transfers.set(transfer.id, transfer);
    this.vehicleSchedules.set(transfer.fromVehicleId, [
      ...fromVehicleSchedule,
      {
        startTime: transfer.transferTime,
        endTime,
        hubId: transfer.hubNodeId,
      },
    ]);
    this.vehicleSchedules.set(transfer.toVehicleId, [
      ...toVehicleSchedule,
      {
        startTime: transfer.transferTime,
        endTime,
        hubId: transfer.hubNodeId,
      },
    ]);

    return true;
  }

  /**
   * @param hubId - Hub to filter transfers by
   * @returns All registered transfers whose hub is `hubId`
   */
  getTransfersForHub(hubId: number): ResourceTransfer[] {
    return Array.from(this.transfers.values()).filter((t) => t.hubNodeId === hubId);
  }

  /**
   * @param vehicleId - Vehicle to filter transfers by
   * @returns All registered transfers where the vehicle is sender or receiver
   */
  getTransfersForVehicle(vehicleId: number): ResourceTransfer[] {
    return Array.from(this.transfers.values()).filter(
      (t) => t.fromVehicleId === vehicleId || t.toVehicleId === vehicleId,
    );
  }

  /**
   * @param vehicleId - Vehicle to calculate balance for
   * @param resourceType - Optional resource type filter
   * @returns Net resource balance; positive means received, negative means given
   */
  getVehicleNetBalance(vehicleId: number, resourceType?: string): number {
    let balance = 0;
    for (const transfer of this.transfers.values()) {
      if (resourceType && transfer.resourceType !== resourceType) continue;

      if (transfer.fromVehicleId === vehicleId) {
        balance -= transfer.amount;
      } else if (transfer.toVehicleId === vehicleId) {
        balance += transfer.amount;
      }
    }
    return balance;
  }

  /**
   * @param vehicleId - Vehicle to check
   * @param hubId - Hub to check
   * @param time - Time at which to check presence
   * @returns True if the vehicle is scheduled at `hubId` at `time`
   */
  isVehicleAtHub(vehicleId: number, hubId: number, time: number): boolean {
    const schedule = this.vehicleSchedules.get(vehicleId) || [];
    return schedule.some((s) => s.hubId === hubId && s.startTime <= time && s.endTime >= time);
  }

  /** Removes all transfers and vehicle schedules from this manager. */
  clearAll(): void {
    this.transfers.clear();
    this.vehicleSchedules.clear();
  }

  /** @returns All currently registered transfers. */
  getAllTransfers(): readonly ResourceTransfer[] {
    return Array.from(this.transfers.values());
  }

  /** @returns All hubs registered with this manager. */
  getAllHubs(): readonly TransferHub[] {
    return Array.from(this.hubs.values());
  }
}

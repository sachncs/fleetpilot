import { VrpProblem } from './problem.js';
import type { Customer, LocationNode } from './problem.js';
import type { ResourceTransfer } from './resource-transfer-types.js';
import { VrpSolution } from './solution.js';
import type { Route } from './solution.js';
import type { TransferHub } from './transfer-hub.js';
import { TransferManager } from './transfer-manager.js';
import { VehicleWithCapabilities, VehicleFleetManager } from './vehicle-with-capabilities.js';

/**
 * Extended solution with inter-vehicle resource transfers.
 */
export class SolutionWithTransfers extends VrpSolution {
  readonly transferManager: TransferManager;
  readonly fleetManager: VehicleFleetManager;
  transfers: ResourceTransfer[] = [];

  /**
   * @param problem - Base problem instance
   * @param routes - Initial vehicle routes
   * @param transferHubs - Hubs where vehicles can exchange resources
   * @param vehicles - Fleet vehicles with transfer capabilities
   */
  constructor(
    problem: VrpProblem,
    routes: Route[] = [],
    transferHubs: TransferHub[] = [],
    vehicles: VehicleWithCapabilities[] = [],
  ) {
    super(problem, routes);

    this.transferManager = new TransferManager();
    const fleetVehicles =
      vehicles.length > 0
        ? vehicles
        : problem.vehicles.filter(
            (v): v is VehicleWithCapabilities => v instanceof VehicleWithCapabilities,
          );
    this.fleetManager = new VehicleFleetManager(fleetVehicles);

    // Register transfer hubs
    for (const hub of transferHubs) {
      this.transferManager.registerHub(hub);
    }
  }

  /**
   * @param hubNodeId - Hub where the transfer occurs
   * @param fromVehicleId - Vehicle giving resources
   * @param toVehicleId - Vehicle receiving resources
   * @param amount - Quantity to transfer
   * @param transferTime - Scheduled start time
   * @param resourceType - Optional resource category
   * @param customerIds - Optional customer IDs whose pickup this transfer
   *   enables. When provided, transfer-aware ALNS operators use this to
   *   drop orphaned transfers when a customer is removed.
   * @returns True if the transfer was successfully scheduled
   */
  scheduleTransfer(
    hubNodeId: number,
    fromVehicleId: number,
    toVehicleId: number,
    amount: number,
    transferTime: number,
    resourceType?: string,
    customerIds?: readonly number[],
  ): boolean {
    const transfer: ResourceTransfer = {
      id: `transfer-${fromVehicleId}-${toVehicleId}-${hubNodeId}-${transferTime}`,
      hubNodeId,
      transferTime,
      fromVehicleId,
      toVehicleId,
      amount,
      resourceType,
      customerIds: customerIds ? [...customerIds] : undefined,
    };

    const success = this.transferManager.scheduleTransfer(transfer);
    if (success) {
      this.transfers.push(transfer);
    }
    return success;
  }

  /**
   * @returns Validation result with any feasibility errors
   */
  validateTransfers(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const transfer of this.transfers) {
      // Check if hub exists
      const hub = this.transferManager.getHub(transfer.hubNodeId);
      if (!hub) {
        errors.push(`Transfer ${transfer.id}: Hub ${transfer.hubNodeId} not found`);
        continue;
      }

      // Check if vehicles exist
      const fromVehicle = this.fleetManager.getVehicle(transfer.fromVehicleId);
      const toVehicle = this.fleetManager.getVehicle(transfer.toVehicleId);

      if (!fromVehicle) {
        errors.push(`Transfer ${transfer.id}: From vehicle ${transfer.fromVehicleId} not found`);
        continue;
      }

      if (!toVehicle) {
        errors.push(`Transfer ${transfer.id}: To vehicle ${transfer.toVehicleId} not found`);
        continue;
      }

      // Check vehicle compatibility
      if (
        fromVehicle instanceof VehicleWithCapabilities &&
        toVehicle instanceof VehicleWithCapabilities
      ) {
        if (!fromVehicle.canTransferWith(toVehicle)) {
          errors.push(
            `Transfer ${transfer.id}: Vehicles ` +
              `${transfer.fromVehicleId} and ${transfer.toVehicleId} cannot transfer`,
          );
        }
      }

      // Check transfer amount
      if (
        fromVehicle instanceof VehicleWithCapabilities &&
        transfer.amount > fromVehicle.maxTransferAmount
      ) {
        errors.push(
          `Transfer ${transfer.id}: Amount ${transfer.amount} ` +
            `exceeds max transfer ${fromVehicle.maxTransferAmount}`,
        );
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * @returns Total schedule duration including transfer delays
   */
  calculateTotalTimeWithTransfers(): number {
    let maxTime = this.makespan;

    for (const transfer of this.transfers) {
      const hub = this.transferManager.getHub(transfer.hubNodeId);
      if (hub) {
        const transferDuration = transfer.amount * hub.transferTimePerUnit;
        const endTime = transfer.transferTime + transferDuration;
        if (endTime > maxTime) {
          maxTime = endTime;
        }
      }
    }

    return maxTime;
  }

  /**
   * @returns Net resource balance per vehicle from all transfers
   */
  getVehicleResourceBalances(): Array<{
    vehicleId: number;
    netBalance: number;
    receivedFrom: number[];
    givenTo: number[];
  }> {
    const balances: Array<{
      vehicleId: number;
      netBalance: number;
      receivedFrom: number[];
      givenTo: number[];
    }> = [];

    const vehicleIds = new Set<number>();
    for (const transfer of this.transfers) {
      vehicleIds.add(transfer.fromVehicleId);
      vehicleIds.add(transfer.toVehicleId);
    }

    for (const vehicleId of vehicleIds) {
      const receivedFrom: number[] = [];
      const givenTo: number[] = [];
      let netBalance = 0;

      for (const transfer of this.transfers) {
        if (transfer.fromVehicleId === vehicleId) {
          netBalance -= transfer.amount;
          givenTo.push(transfer.toVehicleId);
        } else if (transfer.toVehicleId === vehicleId) {
          netBalance += transfer.amount;
          receivedFrom.push(transfer.fromVehicleId);
        }
      }

      balances.push({
        vehicleId,
        netBalance,
        receivedFrom: [...new Set(receivedFrom)],
        givenTo: [...new Set(givenTo)],
      });
    }

    return balances;
  }

  /**
   * Checks whether a transfer can be scheduled without mutating this solution.
   * Creates a temporary TransferManager with existing transfers and tests the new one.
   */
  canScheduleTransfer(
    hubNodeId: number,
    fromVehicleId: number,
    toVehicleId: number,
    amount: number,
    transferTime: number,
    resourceType?: string,
    customerIds?: readonly number[],
  ): boolean {
    const tempManager = new TransferManager();
    const hub = this.transferManager.getHub(hubNodeId);
    if (hub) tempManager.registerHub(hub);

    for (const t of this.transfers) {
      tempManager.scheduleTransfer(t);
    }

    const transfer: ResourceTransfer = {
      id: `transfer-${fromVehicleId}-${toVehicleId}-${hubNodeId}-${transferTime}`,
      hubNodeId,
      transferTime,
      fromVehicleId,
      toVehicleId,
      amount,
      resourceType,
      customerIds: customerIds ? [...customerIds] : undefined,
    };
    return tempManager.scheduleTransfer(transfer);
  }

  /**
   * @returns True if the base feasibility checks pass AND all transfers
   * are valid (vehicle was at the hub at transfer time, etc.)
   */
  override isFeasible(): boolean {
    const baseFeasible = super.isFeasible();
    const transfersValid = this.validateTransfers();
    return baseFeasible && transfersValid.valid;
  }

  /**
   * @returns Aggregated statistics for all scheduled transfers
   */
  getTransferSummary(): {
    totalTransfers: number;
    totalAmountTransferred: number;
    uniqueHubsUsed: number;
    uniqueVehiclePairs: number;
    totalTransferTime: number;
  } {
    const hubsUsed = new Set<number>();
    const vehiclePairs = new Set<string>();
    let totalAmount = 0;
    let totalTransferTime = 0;

    for (const transfer of this.transfers) {
      hubsUsed.add(transfer.hubNodeId);
      vehiclePairs.add(`${transfer.fromVehicleId}-${transfer.toVehicleId}`);
      totalAmount += transfer.amount;

      const hub = this.transferManager.getHub(transfer.hubNodeId);
      if (hub) {
        totalTransferTime += transfer.amount * hub.transferTimePerUnit;
      }
    }

    return {
      totalTransfers: this.transfers.length,
      totalAmountTransferred: totalAmount,
      uniqueHubsUsed: hubsUsed.size,
      uniqueVehiclePairs: vehiclePairs.size,
      totalTransferTime,
    };
  }

  /**
   * @returns Deep copy with cloned routes, hubs, vehicles, and transfers
   */
  override clone(): SolutionWithTransfers {
    const cloned = new SolutionWithTransfers(
      this.problem,
      this.routes.map((r) => r.clone()),
      [...this.transferManager.getAllHubs()],
      [...this.fleetManager.getAllVehicles()],
    );

    cloned.makespan = this.makespan;
    cloned.nodeTimes = { ...this.nodeTimes };
    cloned.resourceReadyTimes = { ...this.resourceReadyTimes };
    cloned.totalDistance = this.totalDistance;
    cloned.totalCost = this.totalCost;
    cloned.totalCo2 = this.totalCo2;
    cloned.transfers = [...this.transfers];

    return cloned;
  }
}

/**
 * Problem instance with transfer hub support.
 */
export class ProblemWithTransfers extends VrpProblem {
  /**
   * @param nodes - Available nodes by ID
   * @param customers - Customers to serve
   * @param vehicles - Fleet with transfer capabilities
   * @param depotNodeId - Default depot node
   * @param transferHubs - Hubs where vehicles exchange resources
   */
  constructor(
    nodes: Readonly<Record<number, LocationNode>>,
    customers: ReadonlyArray<Customer>,
    vehicles: ReadonlyArray<VehicleWithCapabilities>,
    depotNodeId: number = 0,
    public readonly transferHubs: ReadonlyArray<TransferHub> = [],
  ) {
    super(nodes, customers, vehicles, depotNodeId);
  }

  /**
   * @param nodeId - Node ID to check
   * @returns True if `nodeId` is registered as a transfer hub on this problem
   */
  isTransferHub(nodeId: number): boolean {
    return this.transferHubs.some((h) => h.id === nodeId);
  }

  /**
   * @param nodeId - Hub node ID to look up
   * @returns The hub, or undefined if not registered
   */
  getTransferHub(nodeId: number): TransferHub | undefined {
    return this.transferHubs.find((h) => h.id === nodeId);
  }
}

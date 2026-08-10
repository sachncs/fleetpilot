/**
 * Represents a transfer of resources between vehicles at a hub node.
 */
export interface ResourceTransfer {
  /** ID of the transfer event */
  id: string;
  /** Hub node where transfer occurs */
  hubNodeId: number;
  /** Time when transfer occurs */
  transferTime: number;
  /** Vehicle giving resources */
  fromVehicleId: number;
  /** Vehicle receiving resources */
  toVehicleId: number;
  /** Amount of resources transferred */
  amount: number;
  /** Resource type (optional, for multi-resource scenarios) */
  resourceType?: string;
}

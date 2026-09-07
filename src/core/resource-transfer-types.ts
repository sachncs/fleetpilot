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
  /**
   * Customer IDs whose pickup is enabled by this transfer. Used by transfer-
   * aware ALNS operators to associate each transfer with the customer(s) it
   * serves, so removal operators can drop orphaned transfers when a
   * customer is removed. Optional for backwards compatibility with callers
   * that did not supply it.
   */
  customerIds?: readonly number[];
}

/**
 * Hub node where vehicles can exchange resources.
 */
export class TransferHub {
  /**
   * @param id - Unique hub identifier
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param name - Optional display name
   * @param maxConcurrentTransfers - Maximum simultaneous transfers allowed
   * @param transferTimePerUnit - Time required to transfer one unit of resource
   */
  constructor(
    public readonly id: number,
    public readonly x: number,
    public readonly y: number,
    public readonly name: string = '',
    public readonly maxConcurrentTransfers: number = 1,
    public readonly transferTimePerUnit: number = 1,
  ) {}
}
/** Base error for all VRP-RPD library errors. */
export class VrpError extends Error {
  /**
   * TODO(6.3): document TODO
   */
  constructor(message: string) {
    super(message);
    this.name = 'VrpError';
    Object.setPrototypeOf(this, VrpError.prototype);
  }
}
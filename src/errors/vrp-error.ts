/** Base error for all VRP-RPD library errors. Catch this to handle any solver/problem error. */
export class VrpError extends Error {
  /**
   * @param message - Human-readable error description
   */
  constructor(message: string) {
    super(message);
    this.name = 'VrpError';
    Object.setPrototypeOf(this, VrpError.prototype);
  }
}
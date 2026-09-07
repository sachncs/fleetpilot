/** Base error for all FleetPilot library errors. Catch this to handle any solver/problem error. */
export class Error extends globalThis.Error {
  /**
   * @param message - Human-readable error description
   */
  constructor(message: string) {
    super(message);
    this.name = 'Error';
    Object.setPrototypeOf(this, Error.prototype);
  }
}

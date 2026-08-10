import { VrpError } from './vrp-error.js';

/** Thrown when an operation is aborted via an `AbortSignal`. */
export class AbortError extends VrpError {
  /**
   * @param message - Description of the abort
   */
  constructor(message = 'Operation aborted') {
    super(message);
    this.name = 'AbortError';
    Object.setPrototypeOf(this, AbortError.prototype);
  }
}

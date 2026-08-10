import { VrpError } from './vrp-error.js';

/** Thrown when a problem instance or solver option fails validation. */
export class ValidationError extends VrpError {
  /**
   * @param message - Description of the validation failure
   */
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
import { VrpError } from './vrp-error.js';

/** Thrown when problem or solver options fail validation. */
export class ValidationError extends VrpError {
  /**
   * TODO(6.3): document TODO
   */
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
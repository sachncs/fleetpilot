import { VrpError } from './vrp-error.js';

/** Thrown when an algorithm fails to converge. */
export class AlgorithmConvergenceError extends VrpError {
  /**
   * TODO(6.3): document TODO
   */
  constructor(message: string) {
    super(message);
    this.name = 'AlgorithmConvergenceError';
    Object.setPrototypeOf(this, AlgorithmConvergenceError.prototype);
  }
}
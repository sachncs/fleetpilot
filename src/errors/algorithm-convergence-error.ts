import { VrpError } from './vrp-error.js';

/** Thrown when ALNS or BRKGA cannot produce a feasible result within its iteration budget. */
export class AlgorithmConvergenceError extends VrpError {
  /**
   * @param message - Description of the convergence failure
   */
  constructor(message: string) {
    super(message);
    this.name = 'AlgorithmConvergenceError';
    Object.setPrototypeOf(this, AlgorithmConvergenceError.prototype);
  }
}
import { Error } from './error.js';

/** Thrown when ALNS or BRKGA cannot produce a feasible result within its iteration budget. */
export class AlgorithmConvergenceError extends Error {
  /**
   * @param message - Description of the convergence failure
   */
  constructor(message: string) {
    super(message);
    this.name = 'AlgorithmConvergenceError';
    Object.setPrototypeOf(this, AlgorithmConvergenceError.prototype);
  }
}

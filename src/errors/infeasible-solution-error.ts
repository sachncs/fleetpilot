import { VrpError } from './vrp-error.js';

/** Thrown when a solution violates hard constraints. */
export class InfeasibleSolutionError extends VrpError {
  /**
   * TODO(6.3): document TODO
   */
  constructor(message: string) {
    super(message);
    this.name = 'InfeasibleSolutionError';
    Object.setPrototypeOf(this, InfeasibleSolutionError.prototype);
  }
}
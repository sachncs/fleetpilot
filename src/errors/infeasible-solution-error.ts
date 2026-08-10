import { VrpError } from './vrp-error.js';

/** Thrown when no feasible solution exists (capacity / time-window / pickup-before-delivery violated). */
export class InfeasibleSolutionError extends VrpError {
  /**
   * @param message - Description of why the solution is infeasible
   */
  constructor(message: string) {
    super(message);
    this.name = 'InfeasibleSolutionError';
    Object.setPrototypeOf(this, InfeasibleSolutionError.prototype);
  }
}

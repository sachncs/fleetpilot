// Core (new names)
export {
  Problem,
  LocationNode,
  Customer,
  CustomerWithTimeWindows,
  Vehicle,
} from './core/problem.js';
export { Solution, Route } from './core/solution.js';
export type { SerializedRoute, SerializedSolution } from './core/solution.js';

// Errors
export {
  VrpError,
  ValidationError,
  InfeasibleSolutionError,
  AlgorithmConvergenceError,
  AbortError,
} from './errors/index.js';

// Logger
export { defaultLogger, type Logger } from './logger.js';

// Multi-depot support
export { MultiDepotProblem, Depot } from './core/multi-depot-problem.js';

// Traffic-aware routing
export {
  TrafficAwareProblem,
  TrafficModel,
  type TrafficSegment,
} from './core/traffic-aware-problem.js';

// Inter-vehicle resource transfer
export { TransferManager } from './core/transfer-manager.js';
export { TransferHub } from './core/transfer-hub.js';
export type { ResourceTransfer } from './core/resource-transfer-types.js';
export {
  VehicleWithCapabilities,
  VehicleFleetManager,
  type ResourceType,
  type VehicleState,
} from './core/vehicle-with-capabilities.js';
export { SolutionWithTransfers, ProblemWithTransfers } from './core/solution-with-transfers.js';

// Algorithms
export { ALNS } from './algorithms/alns/alns.js';
export type { ALNSOptions } from './algorithms/alns/alns.js';
export { BRKGA } from './algorithms/brkga/brkga.js';
export type { BRKGAOptions, Individual } from './algorithms/brkga/brkga.js';
export type { Chromosome } from './algorithms/brkga/decoder.js';
export {
  TransferAwareInsertionOperators,
  TransferAwareRemovalOperators,
} from './algorithms/alns/transfer-aware-operators.js';

// Analytics
export { RouteAnalytics } from './analytics/route-analytics.js';
export { SolutionComparator } from './analytics/solution-comparator.js';
export type {
  VehicleUtilization,
  WaitTimeAnalysis,
  LoadOverTime,
  RouteComparison,
} from './analytics/route-analytics.js';
export type {
  SolutionMetrics,
  ComparisonResult,
  ParetoFront,
} from './analytics/solution-comparator.js';

// Export
export { GISExporter } from './export/index.js';
export type { GeoJson, GeoJsonFeature, KmlPlacemark } from './export/index.js';

// Main solver class
import type { ALNSOptions, ALNSProgress } from './algorithms/alns/alns.js';
import { ALNS } from './algorithms/alns/alns.js';
import { BRKGA } from './algorithms/brkga/brkga.js';
import type { BRKGAOptions, BRKGAProgress } from './algorithms/brkga/brkga.js';
import type { Problem } from './core/problem.js';
import { Solution, Route } from './core/solution.js';
import { AlgorithmConvergenceError, InfeasibleSolutionError } from './errors/index.js';
import type { Logger } from './logger.js';
import { defaultLogger } from './logger.js';
import { serializeProblem } from './worker-data.js';
import { spawnWorker } from './worker-spawn.js';

function isWorkerResult(msg: object): msg is WorkerResult {
  return 'makespan' in msg && 'routes' in msg && 'type' in msg;
}

/**
 * Options accepted by `FleetPilotSolver.solve()`. All fields are optional; the
 * solver falls back to library defaults tuned for paper-quality results.
 */
export interface SolveOptions {
  alnsIterations?: number;
  populationSize?: number;
  maxGenerations?: number;
  initialTemp?: number;
  coolingRate?: number;
  parallel?: boolean;
  warmStart?: boolean; // Enable ALNS→BRKGA warm-start
  logger?: Logger;
  /** Maximum time in milliseconds before aborting */
  maxTimeMs?: number;
  /** Target makespan for early stopping (forwarded to ALNS and BRKGA). */
  targetMakespan?: number;
  /** Called with progress updates. `bestMakespan` is `Infinity` until the first feasible solution. */
  onProgress?: (progress: SolverProgress) => void;
  /** BRKGA island count (default: 1 = single-island). Forwarded to BRKGA. */
  islands?: number;
  /** Generations between BRKGA elite migrations (default: 50). Forwarded to BRKGA. */
  migrationInterval?: number;
  /** Fraction of each island that emigrates (default: 0.05). Forwarded to BRKGA. */
  migrantFraction?: number;
  /** Deterministic RNG seed forwarded to ALNS and BRKGA. */
  seed?: number;
  /** Optional `AbortSignal`; throws `AbortError` when triggered. */
  signal?: AbortSignal;
}

/**
 * One progress event passed to the `onProgress` callback. `stage` tells
 * which phase is reporting; `iteration`/`maxIterations` are stage-local;
 * `elapsedMs` is wall-clock since `solve()` started.
 * `bestMakespan` is `Infinity` until the first feasible solution is decoded.
 * JSON consumers should treat `Infinity` as "no feasible yet".
 */
export interface SolverProgress {
  stage: 'ALNS' | 'BRKGA' | 'parallel';
  iteration: number;
  maxGenerations: number;
  bestMakespan: number;
  elapsedMs: number;
}

/**
 * Result returned from a worker thread when `parallel: true` is used.
 * Equivalent to the in-process `Solution.serialize()` output.
 */
export interface WorkerResult {
  makespan: number;
  routes: Array<{ vehicleId: number; nodes: number[] }>;
  type: string;
}

/**
 * Two-stage metaheuristic solver for FleetPilot.
 *
 * Stage 1: ALNS (Adaptive Large Neighborhood Search)
 * Stage 2: BRKGA (Biased Random-Key Genetic Algorithm)
 *
 * Paper: arXiv:2602.23685v2
 */
export class FleetPilotSolver {
  private readonly logger: Logger;

  /**
   * @param problem - FleetPilot problem instance to solve
   */
  constructor(
    protected readonly problem: Problem,
    options?: { logger?: Logger },
  ) {
    this.logger = options?.logger ?? defaultLogger;
  }

  /**
   * @param options - Solver configuration
   * @returns Best solution found across both stages
   */
  async solve(options: SolveOptions = {}): Promise<Solution> {
    if (options.parallel) {
      return this.solveParallel(options);
    }

    const startTime = Date.now();
    const targetMakespan = options.targetMakespan ?? 0;

    // Stage 1: ALNS
    this.logger.log('Starting Stage 1: ALNS...');
    const reportAlns = options.onProgress;
    const alns = new ALNS(this.problem, {
      maxIterations: options.alnsIterations ?? 500,
      initialTemp: options.initialTemp ?? 100,
      coolingRate: options.coolingRate ?? 0.9998,
      maxTimeMs: options.maxTimeMs ?? 0,
      seed: options.seed,
      signal: options.signal,
      onProgress: reportAlns
        ? (progress: ALNSProgress) => {
            reportAlns({
              stage: 'ALNS',
              iteration: progress.iteration,
              maxGenerations: progress.maxGenerations,
              bestMakespan: progress.bestMakespan,
              elapsedMs: Date.now() - startTime,
            });
          }
        : undefined,
    });
    const alnsSolution = alns.solve();
    this.logger.log(`ALNS completed. Best makespan: ${alnsSolution.makespan.toFixed(2)}`);

    // Early stop if target reached
    if (targetMakespan > 0 && alnsSolution.makespan <= targetMakespan) {
      if (!alnsSolution.isFeasible()) {
        throw new InfeasibleSolutionError('ALNS reached target but solution is infeasible');
      }
      this.logger.log(`Target makespan ${targetMakespan.toFixed(2)} reached after ALNS.`);
      return alnsSolution;
    }

    // Stage 2: BRKGA with warm-start from ALNS
    this.logger.log('Starting Stage 2: BRKGA with warm-start...');
    const warmStart = options.warmStart ?? true;
    const reportBrkga = options.onProgress;
    const brkga = new BRKGA(this.problem, {
      populationSize: options.populationSize ?? 30000,
      maxGenerations: options.maxGenerations ?? 20000,
      warmStartSolution: warmStart ? alnsSolution : undefined,
      warmStartProportion: 0.15,
      maxTimeMs: options.maxTimeMs ?? 0,
      islands: options.islands,
      migrationInterval: options.migrationInterval,
      migrantFraction: options.migrantFraction,
      seed: options.seed,
      targetMakespan: options.targetMakespan,
      signal: options.signal,
      onProgress: reportBrkga
        ? (progress: BRKGAProgress) => {
            reportBrkga({
              stage: 'BRKGA',
              iteration: progress.generation,
              maxGenerations: progress.maxGenerations,
              bestMakespan: progress.bestMakespan,
              elapsedMs: Date.now() - startTime,
            });
          }
        : undefined,
    });
    const brkgaSolution = await brkga.solve();
    this.logger.log(`BRKGA completed. Best makespan: ${brkgaSolution.makespan.toFixed(2)}`);

    // Return best of both stages
    const best = alnsSolution.makespan < brkgaSolution.makespan ? alnsSolution : brkgaSolution;
    if (!best.isFeasible()) {
      throw new InfeasibleSolutionError(
        `No feasible solution found (best makespan ${best.makespan.toFixed(2)} is infeasible)`,
      );
    }
    return best;
  }

  protected async solveParallel(options: SolveOptions = {}): Promise<Solution> {
    this.logger.log('Starting Parallel Solving (ALNS + BRKGA)...');

    const workerPromises = [
      this.runWorker('ALNS', {
        maxIterations: options.alnsIterations ?? 500,
        initialTemp: options.initialTemp,
        coolingRate: options.coolingRate ?? 0.9998,
        maxTimeMs: options.maxTimeMs ?? 0,
        seed: options.seed,
        targetMakespan: options.targetMakespan,
      }),
      this.runWorker('BRKGA', {
        populationSize: options.populationSize ?? 30000,
        maxGenerations: options.maxGenerations ?? 20000,
        maxTimeMs: options.maxTimeMs ?? 0,
        seed: options.seed,
        targetMakespan: options.targetMakespan,
      }),
    ];

    const results = await Promise.all(workerPromises);
    results.sort((a, b) => a.makespan - b.makespan);

    this.logger.log(
      `Parallel Solving completed. Best makespan: ` +
        `${results[0]!.makespan.toFixed(2)} (${results[0]!.type})`,
    );

    const best = results[0];
    if (!best) {
      throw new AlgorithmConvergenceError('No solution returned from workers');
    }
    const solution = new Solution(
      this.problem,
      best.routes.map((r) => new Route(r.vehicleId, r.nodes)),
    );
    solution.calculateSchedule();
    if (!solution.isFeasible()) {
      throw new InfeasibleSolutionError(
        `No feasible solution found in parallel workers (best makespan ${solution.makespan.toFixed(2)} is infeasible)`,
      );
    }
    return solution;
  }

  protected async runWorker(
    type: 'ALNS' | 'BRKGA',
    options: ALNSOptions | BRKGAOptions,
  ): Promise<WorkerResult> {
    const worker = await spawnWorker();
    const payload = serializeProblem(this.problem, { type, options });
    return new Promise((resolveResult, reject) => {
      let settled = false;
      let ready = false;

      const trySettle = (msg: unknown): void => {
        if (settled) return;
        if (!ready) return;
        if (typeof msg !== 'object' || msg === null) {
          settled = true;
          void worker.terminate();
          reject(new AlgorithmConvergenceError(`Worker ${type} returned non-object result`));
          return;
        }
        if ('error' in msg) {
          settled = true;
          void worker.terminate();
          const errMsg = typeof msg.error === 'string' ? msg.error : 'Unknown error';
          reject(new AlgorithmConvergenceError(`Worker ${type} failed: ${errMsg}`));
          return;
        }
        if (isWorkerResult(msg)) {
          settled = true;
          void worker.terminate();
          resolveResult(msg);
          return;
        }
        settled = true;
        void worker.terminate();
        reject(new AlgorithmConvergenceError(`Worker ${type} returned unexpected result`));
      };

      worker.onMessage((msg) => {
        if (!ready) {
          if (typeof msg === 'object' && msg !== null && 'type' in msg && msg.type === 'ready') {
            ready = true;
            worker.postMessage(payload);
            return;
          }
          trySettle(msg);
          return;
        }
        trySettle(msg);
      });
      worker.onError((err) => {
        if (settled) return;
        settled = true;
        void worker.terminate();
        reject(new AlgorithmConvergenceError(`Worker ${type} error: ${err.message}`));
      });
      worker.onExit((code) => {
        if (settled) return;
        settled = true;
        void worker.terminate();
        if (code !== 0) {
          reject(new AlgorithmConvergenceError(`Worker stopped with exit code ${code}`));
        } else {
          reject(new AlgorithmConvergenceError('Worker exited without producing a result'));
        }
      });
    });
  }
}

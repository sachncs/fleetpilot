import { ALNS } from './algorithms/alns/alns.js';
import { BRKGA } from './algorithms/brkga/brkga.js';
import type { Chromosome } from './algorithms/brkga/decoder.js';
import type { WireIndividual } from './algorithms/brkga/island-messenger.js';
import type { VrpSolution } from './core/solution.js';
import { deserializeProblem } from './worker-data.js';
import type { WorkerData, WorkerResult } from './worker-validation.js';

const toWire = (ind: { chromosome: Chromosome; fitness: number | null }): WireIndividual => ({
  chromosome: ind.chromosome,
  fitness: ind.fitness,
});

/**
 * Message channel abstraction used by the worker task.
 * In production this is backed by worker_threads parentPort; in tests it is
 * backed by an in-memory stub, which allows the worker logic to be exercised
 * without spawning a process.
 */
export interface WorkerIO {
  postMessage(msg: unknown): void;
  onMessage(handler: (msg: unknown) => void): void;
  offMessage(handler: (msg: unknown) => void): void;
}

/**
 * Runs a single worker task (ALNS, BRKGA, or island-BRKGA) against serialized
 * problem data, reporting results and errors over the provided channel.
 * @param data - Serialized problem and algorithm configuration
 * @param io - Message channel used to communicate with the orchestrator
 */
export async function runWorkerTask(data: WorkerData, io: WorkerIO): Promise<void> {
  const problem = deserializeProblem(data);

  try {
    let solution: VrpSolution;

    if (data.type === 'island-brkga') {
      const brkga = new BRKGA(problem, data.options);
      const islandMaxGenerations =
        typeof data.options['islandMaxGenerations'] === 'number'
          ? data.options['islandMaxGenerations']
          : 100;
      const migrationInterval =
        typeof data.options['migrationInterval'] === 'number'
          ? data.options['migrationInterval']
          : 50;

      let population = brkga.initializePopulation();
      let generation = 0;

      const evaluate = () => {
        for (const ind of population) {
          if (ind.fitness === null) {
            const sol = brkga.decoder.decode(ind.chromosome);
            ind.fitness = sol.isFeasible() ? sol.makespan : Infinity;
            ind.solution = sol;
          }
        }
        population.sort((a, b) => (a.fitness ?? Infinity) - (b.fitness ?? Infinity));
      };

      evaluate();

      function isChromosome(value: unknown): value is Chromosome {
        if (typeof value !== 'object' || value === null) return false;
        return (
          'priorities' in value && Array.isArray(value.priorities) &&
          'assignments' in value && Array.isArray(value.assignments) &&
          'dependencies' in value && Array.isArray(value.dependencies) &&
          'transfers' in value && Array.isArray(value.transfers)
        );
      }

      const messageHandler = (msg: unknown) => {
        if (
          typeof msg !== 'object' || msg === null ||
          !('type' in msg) || typeof msg.type !== 'string'
        ) {
          return;
        }
        if (msg.type === 'evolve') {
          const gens =
            'generations' in msg && typeof msg.generations === 'number'
              ? msg.generations
              : migrationInterval;
          for (let g = 0; g < gens && generation < islandMaxGenerations; g++, generation++) {
            population = brkga.evolvePopulation(population);
            evaluate();
          }
          io.postMessage({
            type: 'checkpoint',
            islandId: data.islandId,
            generation,
            population: population.map(toWire),
          });
        } else if (msg.type === 'inject') {
          const rawMigrants = 'migrants' in msg ? msg.migrants : undefined;
          const migrants = Array.isArray(rawMigrants) ? rawMigrants : [];
          const replaceCount = Math.min(migrants.length, population.length);
          for (let i = 0; i < replaceCount; i++) {
            const targetIdx = population.length - 1 - i;
            if (i >= migrants.length) continue;
            const migrantRaw: unknown = migrants[i];
            if (
              typeof migrantRaw !== 'object' || migrantRaw === null ||
              !isChromosome(migrantRaw)
            ) {
              continue;
            }
            population[targetIdx] = {
              chromosome: {
                priorities: migrantRaw.priorities,
                assignments: migrantRaw.assignments,
                dependencies: migrantRaw.dependencies,
                transfers: migrantRaw.transfers,
              },
              fitness: null,
              solution: null,
            };
          }
          io.postMessage({
            type: 'checkpoint',
            islandId: data.islandId,
            generation,
            population: population.map(toWire),
          });
        } else if (msg.type === 'finish') {
          evaluate();
          const best = population[0];
          io.postMessage({
            type: 'finish',
            islandId: data.islandId,
            bestIndividual: best ? toWire(best) : null,
          });
          io.offMessage(messageHandler);
        }
      };

      io.onMessage(messageHandler);
      io.postMessage({
        type: 'checkpoint',
        islandId: data.islandId,
        generation,
        population: population.map(toWire),
      });
      return;
    }

    if (data.type === 'ALNS') {
      const alns = new ALNS(problem, data.options);
      solution = alns.solve();
    } else {
      const brkga = new BRKGA(problem, data.options);
      solution = await brkga.solve();
    }

    const result: WorkerResult = {
      makespan: solution.makespan,
      routes: solution.routes.map(r => ({ vehicleId: r.vehicleId, nodes: r.nodes })),
      type: data.type,
    };

    io.postMessage(result);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    io.postMessage({ error: errorMessage, type: data.type });
  }
}

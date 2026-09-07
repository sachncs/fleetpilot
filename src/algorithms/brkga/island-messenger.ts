import type { Worker } from 'worker_threads';

import type { Chromosome } from './decoder.js';

/**
 * Individual as transferred over the wire. Solutions are not included: they
 * do not survive structured clone, and the orchestrator rebuilds them from
 * the chromosome through its own decoder.
 */
export interface WireIndividual {
  chromosome: Chromosome;
  fitness: number | null;
}

/**
 * Periodic checkpoint message sent by an island worker, reporting the
 * current population so the orchestrator can decide on migration.
 */
export interface IslandCheckpointMessage {
  type: 'checkpoint';
  islandId: number;
  generation: number;
  population: WireIndividual[];
}

/**
 * Terminal message sent by an island worker when the orchestrator
 * asks it to stop; carries the best individual found.
 */
export interface IslandFinishMessage {
  type: 'finish';
  islandId: number;
  bestIndividual: WireIndividual | null;
}

/** All message types an island worker can send back to the orchestrator. */
export type IslandWorkerMessage = IslandCheckpointMessage | IslandFinishMessage;

/** Tell an island worker to evolve for `generations` generations and report a checkpoint. */
export interface EvolveCommand {
  type: 'evolve';
  generations: number;
}

/** Replace the lowest-fitness individuals in an island with these migrants. */
export interface InjectCommand {
  type: 'inject';
  migrants: Chromosome[];
}

/** Tell an island worker to stop evolving and report its best individual. */
export interface FinishCommand {
  type: 'finish';
}

/** All command types the orchestrator can send to an island worker. */
export type IslandCommand = EvolveCommand | InjectCommand | FinishCommand;

function isIslandWorkerMessage(msg: unknown): msg is IslandWorkerMessage {
  if (typeof msg !== 'object' || msg === null || !('type' in msg)) return false;
  if (typeof msg.type !== 'string') return false;
  if (msg.type === 'checkpoint') {
    return 'islandId' in msg && 'generation' in msg && 'population' in msg;
  }
  if (msg.type === 'finish') return 'islandId' in msg && 'bestIndividual' in msg;
  return false;
}

/**
 * Sends a command to a worker and awaits its response.
 */
export function sendCommand(worker: Worker, cmd: IslandCommand): Promise<IslandWorkerMessage> {
  return new Promise((resolve, reject) => {
    const onMessage = (msg: unknown) => {
      worker.off('message', onMessage);
      worker.off('error', onError);
      worker.off('exit', onExit);
      if (isIslandWorkerMessage(msg)) {
        resolve(msg);
      } else {
        reject(new Error('Invalid worker message'));
      }
    };
    const onError = (err: Error) => {
      worker.off('message', onMessage);
      worker.off('error', onError);
      worker.off('exit', onExit);
      reject(err);
    };
    const onExit = (code: number) => {
      worker.off('message', onMessage);
      worker.off('error', onError);
      worker.off('exit', onExit);
      reject(new Error(`Worker exited with code ${code}`));
    };
    worker.on('message', onMessage);
    worker.on('error', onError);
    worker.on('exit', onExit);
    worker.postMessage(cmd);
  });
}

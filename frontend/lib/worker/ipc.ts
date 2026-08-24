export interface SolveJobPayload {
  jobId: string;
  problemJson: string;
  solverOptions: {
    alnsIterations: number;
    populationSize: number;
    maxGenerations: number;
    maxTimeMs: number;
    seed: number;
    warmStart: boolean;
  };
}

export interface ProgressMessage {
  type: 'progress';
  jobId: string;
  stage: 'ALNS' | 'BRKGA' | 'parallel';
  iteration: number;
  maxGenerations: number;
  bestMakespan: number;
  elapsedMs: number;
}

export interface SolutionMessage {
  type: 'solution';
  jobId: string;
  solutionJson: string;
  makespan: number;
  totalDistance: number;
  totalCost: number;
  totalCo2: number;
  feasible: boolean;
}

export interface ErrorMessage {
  type: 'error';
  jobId: string;
  error: string;
}

export type WorkerMessage = ProgressMessage | SolutionMessage | ErrorMessage;

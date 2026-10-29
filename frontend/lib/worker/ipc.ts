interface ProgressMessage {
  type: 'progress';
  jobId: string;
  stage: 'ALNS' | 'BRKGA' | 'parallel';
  iteration: number;
  maxGenerations: number;
  bestMakespan: number;
  elapsedMs: number;
}

interface SolutionMessage {
  type: 'solution';
  jobId: string;
  solutionJson: string;
  makespan: number;
  totalDistance: number;
  totalCost: number;
  totalCo2: number;
  feasible: boolean;
  solutionId: string;
}

interface ErrorMessage {
  type: 'error';
  jobId: string;
  error: string;
}

export type WorkerMessage = ProgressMessage | SolutionMessage | ErrorMessage;

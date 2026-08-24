'use client';

// Solver client: submits solve jobs to the FleetPilot API and streams
// progress via WebSocket. Runs on the server-side worker process.

import type { Problem } from '@/lib/problem-schema';
import type { SolverSolution, SolverProgress, SolverSolveOptions } from '@/lib/problem-store';

function getApiKey(): string | null {
  try {
    return localStorage.getItem('fleetpilot_api_key');
  } catch {
    return null;
  }
}

export async function solveProblem(
  problem: Problem,
  options: SolverSolveOptions,
  onProgress?: (progress: SolverProgress) => void,
  existing?: { problemId?: string; name?: string },
): Promise<SolverSolution> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('No API key found. Go to Settings to create one.');
  }

  const authHeaders = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  let problemId = existing?.problemId;
  if (!problemId) {
    const createRes = await fetch('/api/problems', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: existing?.name ?? 'UI Problem', problemJson: problem }),
    });
    if (!createRes.ok) {
      const data = (await createRes.json()) as { error?: string };
      throw new Error(data.error ?? 'Failed to create problem');
    }
    const created = (await createRes.json()) as { id: string };
    problemId = created.id;
  }

  const jobRes = await fetch('/api/jobs', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      problemId,
      solverOptions: {
        alnsIterations: options.alnsIterations,
        populationSize: options.populationSize,
        maxGenerations: options.maxGenerations,
        maxTimeMs: options.maxTimeMs,
        seed: options.seed,
        warmStart: options.warmStart,
      },
    }),
  });
  if (!jobRes.ok) {
    const data = (await jobRes.json()) as { error?: string };
    throw new Error(data.error ?? 'Failed to submit job');
  }
  const job = (await jobRes.json()) as { id: string };

  return new Promise<SolverSolution>((resolve, reject) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/progress/${job.id}`);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string) as
        | { type: 'progress'; stage: string; iteration: number; maxGenerations: number; bestMakespan: number; elapsedMs: number }
        | { type: 'solution'; solutionJson: string; makespan: number; totalDistance: number; totalCost: number; totalCo2: number; feasible: boolean }
        | { type: 'error'; error: string };

      if (msg.type === 'progress' && onProgress) {
        onProgress({
          stage: msg.stage as SolverProgress['stage'],
          iteration: msg.iteration,
          maxGenerations: msg.maxGenerations,
          bestMakespan: msg.bestMakespan,
          elapsedMs: msg.elapsedMs,
        });
      } else if (msg.type === 'solution') {
        const solData = JSON.parse(msg.solutionJson) as {
          routes?: Array<{ vehicleId: number; nodes: number[] }>;
          nodeTimes?: Record<string, number>;
        };
        resolve({
          makespan: msg.makespan,
          totalDistance: msg.totalDistance,
          totalCost: msg.totalCost,
          totalCo2: msg.totalCo2,
          feasible: msg.feasible,
          routes: solData.routes ?? [],
          nodeTimes: solData.nodeTimes ?? {},
          nodeTimesEntries: Object.entries(solData.nodeTimes ?? {}).map(
            ([k, v]) => [Number(k), v] as [number, number],
          ),
        });
        ws.close();
      } else if (msg.type === 'error') {
        reject(new Error(msg.error));
        ws.close();
      }
    };

    ws.onerror = () => {
      reject(new Error('WebSocket connection failed'));
    };
  });
}

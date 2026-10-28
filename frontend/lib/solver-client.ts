'use client';

// Solver client: submits solve jobs to the FleetPilot API and streams
// progress via WebSocket. Runs on the server-side worker process.

import type { Problem } from '@/lib/problem-schema';
import type { SolverSolution, SolverProgress, SolverSolveOptions } from '@/lib/problem-store';

interface PersistedJob {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  solutionId: string | null;
  error: string | null;
}

interface PersistedSolution {
  id: string;
  solutionJson: string;
}

function parseSolution(id: string, solutionJson: string): SolverSolution {
  const data = JSON.parse(solutionJson) as {
    makespan?: number;
    totalDistance?: number;
    totalCost?: number;
    totalCo2?: number;
    feasible?: boolean;
    routes?: Array<{ vehicleId: number; nodes: number[] }>;
    nodeTimes?: Record<string, number>;
  };
  const nodeTimes = data.nodeTimes ?? {};

  return {
    id,
    makespan: data.makespan ?? 0,
    totalDistance: data.totalDistance ?? 0,
    totalCost: data.totalCost ?? 0,
    totalCo2: data.totalCo2 ?? 0,
    feasible: data.feasible ?? false,
    routes: data.routes ?? [],
    nodeTimes,
    nodeTimesEntries: Object.entries(nodeTimes).map(([key, value]) => [Number(key), value]),
  };
}

function getApiKey(): string | null {
  try {
    return localStorage.getItem('fleetpilot_api_key') ?? 'fp_public_console';
  } catch {
    return null;
  }
}

export async function solveProblem(
  problem: Problem,
  options: SolverSolveOptions,
  onProgress?: (progress: SolverProgress) => void,
  existing?: { problemId?: string; name?: string },
  lifecycle?: { signal?: AbortSignal; onJobCreated?: (jobId: string) => void },
): Promise<SolverSolution> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Console storage is unavailable in this browser.');

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
  lifecycle?.onJobCreated?.(job.id);

  return new Promise<SolverSolution>((resolve, reject) => {
    let settled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/ws/progress/${job.id}?key=${encodeURIComponent(apiKey)}`,
    );

    const finish = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      if (pollTimer) clearTimeout(pollTimer);
      lifecycle?.signal?.removeEventListener('abort', abort);
      callback();
      ws.close();
    };

    const abort = (): void => {
      if (settled) return;
      settled = true;
      if (pollTimer) clearTimeout(pollTimer);
      ws.close();
      void fetch(`/api/jobs/${job.id}`, { method: 'DELETE', headers: authHeaders });
      reject(new DOMException('Optimization cancelled', 'AbortError'));
    };
    if (lifecycle?.signal?.aborted) {
      abort();
      return;
    }
    lifecycle?.signal?.addEventListener('abort', abort, { once: true });

    const poll = async (): Promise<void> => {
      if (settled) return;
      try {
        const statusRes = await fetch(`/api/jobs/${job.id}`, { headers: authHeaders });
        if (!statusRes.ok) throw new Error(`Job status failed (${statusRes.status})`);
        const persistedJob = (await statusRes.json()) as PersistedJob;

        if (persistedJob.status === 'completed' && persistedJob.solutionId) {
          const solutionRes = await fetch(`/api/solutions/${persistedJob.solutionId}`, { headers: authHeaders });
          if (!solutionRes.ok) throw new Error(`Solution load failed (${solutionRes.status})`);
          const persistedSolution = (await solutionRes.json()) as PersistedSolution;
          finish(() => resolve(parseSolution(persistedSolution.id, persistedSolution.solutionJson)));
          return;
        }
        if (persistedJob.status === 'failed' || persistedJob.status === 'cancelled') {
          finish(() => reject(new Error(persistedJob.error ?? `Optimization ${persistedJob.status}`)));
          return;
        }
      } catch {
        // The WebSocket remains the primary path. Polling is a recovery path for
        // very fast jobs and brief reconnects, so transient read failures retry.
      }
      if (!settled) pollTimer = setTimeout(() => void poll(), 400);
    };

    // A small scenario can finish before the WebSocket upgrade subscribes. Poll
    // persisted job state as a race-safe completion path.
    void poll();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string) as
        | { type: 'progress'; stage: string; iteration: number; maxGenerations: number; bestMakespan: number; elapsedMs: number }
        | { type: 'solution'; solutionId: string; solutionJson: string; makespan: number; totalDistance: number; totalCost: number; totalCo2: number; feasible: boolean }
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
        finish(() => resolve(parseSolution(msg.solutionId, msg.solutionJson)));
      } else if (msg.type === 'error') {
        finish(() => reject(new Error(msg.error)));
      }
    };

    ws.onerror = () => {
      // Persisted-state polling can still recover a completed job if the live
      // progress channel fails or connects after a very short solve.
    };
  });
}

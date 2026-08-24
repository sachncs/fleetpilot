'use client';

import * as React from 'react';

export interface SolveProgress {
  stage: 'ALNS' | 'BRKGA' | 'parallel';
  iteration: number;
  maxGenerations: number;
  bestMakespan: number;
  elapsedMs: number;
}

export interface SolveResult {
  solutionId: string;
  makespan: number;
  feasible: boolean;
}

export function useSolveJob(apiKey: string) {
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<SolveProgress | null>(null);
  const [status, setStatus] = React.useState<'idle' | 'submitting' | 'solving' | 'done' | 'error'>('idle');
  const [result, setResult] = React.useState<SolveResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);

  const submit = React.useCallback(
    async (problemId: string, solverOptions?: Record<string, unknown>): Promise<void> => {
      setStatus('submitting');
      setError(null);
      setProgress(null);
      setResult(null);

      try {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ problemId, solverOptions }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? 'Failed to submit job');
        }

        const job = (await res.json()) as { id: string };
        setJobId(job.id);
        setStatus('solving');

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/ws/progress/${job.id}`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data as string) as
            | { type: 'progress'; stage: string; iteration: number; maxGenerations: number; bestMakespan: number; elapsedMs: number }
            | { type: 'solution'; solutionJson: string; makespan: number; feasible: boolean }
            | { type: 'error'; error: string };

          if (msg.type === 'progress') {
            setProgress({
              stage: msg.stage as SolveProgress['stage'],
              iteration: msg.iteration,
              maxGenerations: msg.maxGenerations,
              bestMakespan: msg.bestMakespan,
              elapsedMs: msg.elapsedMs,
            });
          } else if (msg.type === 'solution') {
            const solData = JSON.parse(msg.solutionJson) as { makespan: number };
            setResult({ solutionId: `sol_${job.id.replace('job_', '')}`, makespan: solData.makespan, feasible: msg.feasible });
            setStatus('done');
            setProgress(null);
            ws.close();
          } else if (msg.type === 'error') {
            setError(msg.error);
            setStatus('error');
            setProgress(null);
            ws.close();
          }
        };

        ws.onerror = () => {
          setError('WebSocket connection failed');
          setStatus('error');
        };

        ws.onclose = () => {
          wsRef.current = null;
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    },
    [apiKey],
  );

  const cancel = React.useCallback(async (): Promise<void> => {
    if (!jobId) return;
    await fetch(`/api/jobs/${jobId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    wsRef.current?.close();
    setStatus('idle');
    setJobId(null);
    setProgress(null);
  }, [jobId, apiKey]);

  React.useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { jobId, progress, status, result, error, submit, cancel };
}

'use client';

import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RotateCcw } from 'lucide-react';

import { useProblemStore } from '@/lib/problem-store';
import { solveProblem } from '@/lib/solver-client';

export function SolveButton(): React.ReactElement {
  const problem = useProblemStore((s) => s.problem);
  const options = useProblemStore((s) => s.options);
  const setOptions = useProblemStore((s) => s.setOptions);
  const status = useProblemStore((s) => s.status);
  const setStatus = useProblemStore((s) => s.setStatus);
  const setSolution = useProblemStore((s) => s.setSolution);
  const setProgress = useProblemStore((s) => s.setProgress);
  const setError = useProblemStore((s) => s.setError);
  const progress = useProblemStore((s) => s.progress);

  const onSolve = async (): Promise<void> => {
    if (!problem) return;
    setStatus('solving');
    setError(null);
    setProgress(null);
    try {
      const solution = await solveProblem(problem, options, (p) => setProgress(p));
      setSolution(solution);
      setStatus('success');
      setProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
      setProgress(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Solver</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">ALNS iters</label>
            <input
              type="number"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              value={options.alnsIterations}
              onChange={(e) => setOptions({ alnsIterations: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Pop size</label>
            <input
              type="number"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              value={options.populationSize}
              onChange={(e) => setOptions({ populationSize: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Max gens</label>
            <input
              type="number"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              value={options.maxGenerations}
              onChange={(e) => setOptions({ maxGenerations: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Max time (ms)</label>
            <input
              type="number"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              value={options.maxTimeMs}
              onChange={(e) => setOptions({ maxTimeMs: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Seed</label>
            <input
              type="number"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              value={options.seed}
              onChange={(e) => setOptions({ seed: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={options.warmStart}
                onChange={(e) => setOptions({ warmStart: e.target.checked })}
              />
              Warm start
            </label>
          </div>
        </div>
        <Button
          className="w-full"
          onClick={() => void onSolve()}
          disabled={status === 'solving' || !problem}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {status === 'solving' ? 'Solving...' : 'Solve'}
        </Button>
        {status === 'solving' && progress && (
          <div className="text-xs text-muted-foreground">
            [{progress.stage}] gen {progress.iteration}/{progress.maxGenerations} · best{' '}
            {Number.isFinite(progress.bestMakespan) ? progress.bestMakespan.toFixed(1) : '—'} min
          </div>
        )}
        {status === 'success' && (
          <div className="text-xs text-emerald-600">Solution ready — open the simulator.</div>
        )}
        {status === 'error' && (
          <div className="text-xs text-destructive">Solver error — see the JSON panel.</div>
        )}
      </CardContent>
    </Card>
  );
}

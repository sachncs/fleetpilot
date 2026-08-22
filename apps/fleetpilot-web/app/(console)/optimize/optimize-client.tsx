'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Play, Sparkles, TriangleAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { EmptyState } from '@/components/shared/empty-state';

import { useProblemStore, type SolverSolution } from '@/lib/problem-store';
import { solveProblem } from '@/lib/solver-client';

interface ScenarioDetail {
  id: string;
  name: string;
  problemJson: string;
  solutions: Array<{
    id: string;
    makespan: number;
    totalDistance: number;
    totalCost: number;
    feasible: boolean;
    createdAt: string;
  }>;
}

interface Caps {
  maxTimeMs: number;
  maxGenerations: number;
  maxConcurrentSolves: number;
}

const DEFAULTS = {
  alnsIterations: 200,
  populationSize: 1000,
  maxGenerations: 500,
  maxTimeMs: 10_000,
  seed: 1,
  warmStart: true,
};

const formSchema = z.object({
  alnsIterations: z.number().int().min(1).max(1_000_000),
  populationSize: z.number().int().min(1).max(1_000_000),
  maxGenerations: z.number().int().min(1).max(1_000_000),
  maxTimeMs: z.number().int().min(100).max(3_600_000),
  seed: z.number().int().min(0),
  warmStart: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function OptimizeClient(): React.ReactElement {
  const searchParams = useSearchParams();
  const problemId = searchParams.get('problem');

  const problem = useProblemStore((s) => s.problem);
  const setProblem = useProblemStore((s) => s.setProblem);
  const solution = useProblemStore((s) => s.solution);
  const setSolution = useProblemStore((s) => s.setSolution);
  const status = useProblemStore((s) => s.status);
  const setStatus = useProblemStore((s) => s.setStatus);
  const setError = useProblemStore((s) => s.setError);
  const progress = useProblemStore((s) => s.progress);
  const setProgress = useProblemStore((s) => s.setProgress);

  const [scenario, setScenario] = React.useState<ScenarioDetail | null>(null);
  const [caps, setCaps] = React.useState<Caps | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Best previous run for this scenario, for the compare view.
  const previousBest = React.useMemo<SolverSolution['makespan'] | null>(() => {
    if (!scenario || scenario.solutions.length === 0) return null;
    return Math.min(...scenario.solutions.map((s) => s.makespan));
  }, [scenario]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULTS,
  });

  const authHeaders = React.useCallback(
    (): HeadersInit => ({
      Authorization: `Bearer ${localStorage.getItem('fleetpilot_api_key') ?? ''}`,
    }),
    [],
  );

  React.useEffect(() => {
    (async () => {
      try {
        const capsRes = await fetch('/api/caps', { headers: authHeaders() });
        if (capsRes.ok) setCaps((await capsRes.json()) as Caps);
      } catch {
        // caps are advisory; schema falls back to defaults
      }
    })();
  }, [authHeaders]);

  React.useEffect(() => {
    if (!problemId) return;
    (async () => {
      try {
        const res = await fetch(`/api/problems/${problemId}`, { headers: authHeaders() });
        if (!res.ok) throw new Error(`Scenario load failed (${res.status})`);
        const data = (await res.json()) as ScenarioDetail;
        setScenario(data);
        setProblem(JSON.parse(data.problemJson));
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Scenario load failed');
      }
    })();
  }, [problemId, setProblem, authHeaders]);

  const run = form.handleSubmit(async (raw) => {
    if (!problem) return;
    // Clamp to server caps before submitting — the server enforces them too.
    const values: FormValues = {
      ...raw,
      maxGenerations: caps ? Math.min(raw.maxGenerations, caps.maxGenerations) : raw.maxGenerations,
      maxTimeMs: caps ? Math.min(raw.maxTimeMs, caps.maxTimeMs) : raw.maxTimeMs,
    };
    setStatus('solving');
    setError(null);
    setProgress(null);
    try {
      const sol = await solveProblem(
        problem,
        values,
        (p) => setProgress(p),
        { problemId: problemId ?? undefined, name: scenario?.name },
      );
      setSolution(sol);
      setStatus('success');
      setProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
      setProgress(null);
    }
  });

  if (!problemId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <EmptyState
          icon={Sparkles}
          title="No scenario selected"
          description="Open a scenario from Planning and save it, then launch the optimizer."
          actionLabel="Open planner"
          actionHref="/build"
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <TriangleAlert className="text-destructive size-6" />
            <p className="text-muted-foreground max-w-md text-sm">{loadError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const solving = status === 'solving';
  const delta =
    solution && previousBest !== null && previousBest > 0
      ? ((solution.makespan - previousBest) / previousBest) * 100
      : null;

  return (
    <div className="space-y-6 overflow-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Optimize</h1>
        <p className="text-muted-foreground text-sm">
          {scenario ? scenario.name : 'Loading scenario…'}
        </p>
      </div>

      {status === 'idle' && problem && (
        <Card className="border-amber-500/40">
          <CardContent className="flex items-center gap-3 py-4">
            <TriangleAlert className="size-5 shrink-0 text-amber-500" />
            <p className="text-sm">The scenario loaded from the server. Unsaved map edits are not part of this run.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Solver configuration</CardTitle>
            <CardDescription>
              Limits are clamped to server caps{caps ? ` (${caps.maxGenerations} gens · ${Math.round(caps.maxTimeMs / 1000)}s)` : ''}.
              Runs cannot be cancelled once started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={run} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <NumField name="alnsIterations" label="ALNS iterations" />
                  <NumField name="populationSize" label="Population size" />
                  <NumField name="maxGenerations" label="Max generations" />
                  <NumField name="maxTimeMs" label="Max time (ms)" />
                  <NumField name="seed" label="Seed" />
                  <FormField
                    control={form.control}
                    name="warmStart"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-end gap-2 pb-1">
                        <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} id="warm-start" />
                        <Label htmlFor="warm-start">Warm start</Label>
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={solving || !problem}>
                  {solving ? <Loader2 className="animate-spin" /> : <Play />}
                  {solving ? 'Running…' : 'Run optimization'}
                </Button>
              </form>
            </Form>

            {solving && progress && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>[{progress.stage}] generation {progress.iteration}/{progress.maxGenerations}</span>
                  <span>{(progress.elapsedMs / 1000).toFixed(1)}s</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="bg-primary h-full transition-all"
                    style={{
                      width:
                        progress.maxGenerations > 0
                          ? `${Math.min(100, (progress.iteration / progress.maxGenerations) * 100)}%`
                          : '0%',
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Best makespan so far:{' '}
                  {Number.isFinite(progress.bestMakespan) ? progress.bestMakespan.toFixed(1) : '—'} min
                </p>
              </div>
            )}

            {status === 'error' && (
              <p className="text-destructive mt-4 text-sm">
                Run failed — check that the scenario has at least one customer and vehicle.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>Latest run compared with this scenario&apos;s best.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!solution && !solving && (
              <p className="text-muted-foreground text-sm">
                No result yet — configure the solver and start a run.
              </p>
            )}
            {solution && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="Makespan" value={solution.makespan.toFixed(1)} unit="min" />
                  <Metric label="Distance" value={(solution.totalDistance / 100).toFixed(2)} unit="km" />
                  <Metric label="Cost" value={(solution.totalCost / 100).toFixed(2)} />
                  <Metric label="CO₂e" value={(solution.totalCo2 / 100).toFixed(2)} unit="kg" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={solution.feasible ? 'success' : 'destructive'}>
                    {solution.feasible ? 'Feasible' : 'Infeasible'}
                  </Badge>
                  {delta !== null && (
                    <Badge variant={delta <= 0 ? 'default' : 'secondary'}>
                      {delta <= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% vs best ({previousBest!.toFixed(1)} min)
                    </Badge>
                  )}
                  {solution.feasible && (
                    <Button asChild size="sm" variant="outline" className="ml-auto">
                      <Link href="/simulate">Open simulator</Link>
                    </Button>
                  )}
                </div>
              </>
            )}
            {solving && (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" /> Optimizing…
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NumField({ name, label }: { name: keyof Omit<FormValues, 'warmStart'>; label: string }): React.ReactElement {
  return (
    <FormField
      control={useFormContext<FormValues>().control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <Label className="text-xs">{label}</Label>
          <FormControl>
            <Input
              type="number"
              value={Number.isFinite(field.value) ? String(field.value) : ''}
              onChange={(e) => field.onChange(e.target.valueAsNumber)}
              onBlur={field.onBlur}
            />
          </FormControl>
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }): React.ReactElement {
  return (
    <div className="rounded-md border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {value}
        {unit ? <span className="text-muted-foreground ml-1 text-xs font-normal">{unit}</span> : null}
      </p>
    </div>
  );
}

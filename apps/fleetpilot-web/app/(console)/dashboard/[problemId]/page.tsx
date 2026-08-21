'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SolutionCard } from '@/components/dashboard/solution-card';
import { JobList } from '@/components/dashboard/job-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { useSolveJob } from '@/lib/use-solve-job';

interface Problem {
  id: string;
  name: string;
  nodeCount: number;
  customerCount: number;
  vehicleCount: number;
  createdAt: string;
  solutions: Array<{ id: string; makespan: number; totalDistance: number; feasible: boolean; createdAt: string }>;
  jobs: Array<{ id: string; problemId: string; status: string; createdAt: string; startedAt: string | null; completedAt: string | null; error: string | null }>;
}

export default function ProblemDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const [problem, setProblem] = React.useState<Problem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [maxTimeMs, setMaxTimeMs] = React.useState(30000);

  const apiKey = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('fleetpilot_api_key') ?? '';
  }, []);

  const { progress, status, result, error: solveError, submit, cancel } = useSolveJob(apiKey);

  React.useEffect(() => {
    if (!apiKey || !params.id) return;
    fetch(`/api/problems/${params.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
      .then((r) => r.json())
      .then((data) => { setProblem(data as Problem); setLoading(false); })
      .catch(() => setLoading(false));
  }, [apiKey, params.id, result]);

  const handleSolve = async (): Promise<void> => {
    if (!params.id) return;
    await submit(params.id, { maxTimeMs, seed: 1 });
  };

  return (
    <div className="overflow-auto p-6">
        <div className="mb-6 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> Dashboard</Link>
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !problem ? (
          <Card><CardContent className="py-6 text-center text-muted-foreground">Problem not found.</CardContent></Card>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{problem.name}</h1>
                <div className="mt-1 flex gap-2">
                  <Badge variant="outline">{problem.nodeCount} nodes</Badge>
                  <Badge variant="outline">{problem.customerCount} customers</Badge>
                  <Badge variant="outline">{problem.vehicleCount} vehicles</Badge>
                </div>
              </div>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Solve</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Max time (ms)</label>
                    <Input
                      type="number"
                      value={maxTimeMs}
                      onChange={(e) => setMaxTimeMs(Number(e.target.value))}
                      max={600000}
                    />
                  </div>
                  <Button onClick={() => void handleSolve()} disabled={status === 'solving' || status === 'submitting'}>
                    <Sparkles className="mr-1 h-4 w-4" />
                    {status === 'solving' ? 'Solving...' : status === 'submitting' ? 'Submitting...' : 'Solve'}
                  </Button>
                  {status === 'solving' && (
                    <Button variant="outline" onClick={() => void cancel()}>Cancel</Button>
                  )}
                </div>
                {progress && (
                  <div className="text-sm text-muted-foreground">
                    <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                    [{progress.stage}] gen {progress.iteration}/{progress.maxGenerations} · best{' '}
                    {Number.isFinite(progress.bestMakespan) ? progress.bestMakespan.toFixed(1) : '—'}
                  </div>
                )}
                {result && (
                  <div className="text-sm text-emerald-600">
                    Solution ready! Feasible: {result.feasible ? 'Yes' : 'No'}.
                  </div>
                )}
                {solveError && (
                  <div className="text-sm text-destructive">{solveError}</div>
                )}
              </CardContent>
            </Card>

            {problem.solutions.length > 0 && (
              <div className="mb-6">
                <h2 className="mb-3 text-lg font-semibold">Solutions ({problem.solutions.length})</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {problem.solutions.map((s) => (
                    <SolutionCard key={s.id} {...s} />
                  ))}
                </div>
              </div>
            )}

            {problem.jobs.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Job History</CardTitle></CardHeader>
                <CardContent><JobList jobs={problem.jobs} /></CardContent>
              </Card>
            )}
          </>
        )}
      </div>
  );
}

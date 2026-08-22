'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  MapPinned,
  PackageX,
  Play,
  Truck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePolling } from '@/hooks/use-polling';

interface ProblemRow {
  id: string;
  name: string;
  customerCount: number;
  vehicleCount: number;
  updatedAt: string;
}

interface JobRow {
  id: string;
  problemId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

const POLL_MS = 30_000;

function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('fleetpilot_api_key') ?? '';
}

async function fetchJson<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return (await res.json()) as T;
}

function duration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return '—';
  const end = completedAt ? Date.parse(completedAt) : Date.now();
  const secs = Math.max(0, Math.round((end - Date.parse(startedAt)) / 1000));
  return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function statusVariant(status: JobRow['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'running':
      return 'default';
    case 'completed':
      return 'outline';
    case 'failed':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export default function OverviewPage(): React.ReactElement {
  const [state, setState] = React.useState<{
    loading: boolean;
    error: string | null;
    problems: ProblemRow[];
    jobs: JobRow[];
    exceptionCount: number;
    maintenanceCount: number;
  }>({ loading: true, error: null, problems: [], jobs: [], exceptionCount: 0, maintenanceCount: 0 });

  const refresh = React.useCallback(async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setState((s) => ({ ...s, loading: false, error: null, problems: [], jobs: [] }));
      return;
    }
    try {
      const [problemsRes, jobsRes, exceptionsRes, fleetRes] = await Promise.all([
        fetchJson<{ problems: ProblemRow[] }>('/api/problems?limit=100', apiKey),
        fetchJson<{ jobs: JobRow[] }>('/api/jobs?limit=50', apiKey),
        fetchJson<{ orders: unknown[] }>('/api/orders?status=exception&limit=200', apiKey),
        fetchJson<{ fleet: unknown[] }>('/api/fleet?status=maintenance&limit=200', apiKey),
      ]);
      setState({
        loading: false,
        error: null,
        problems: problemsRes.problems,
        jobs: jobsRes.jobs,
        exceptionCount: exceptionsRes.orders.length,
        maintenanceCount: fleetRes.fleet.length,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load overview',
      }));
    }
  }, []);

  usePolling(refresh, { intervalMs: POLL_MS });

  if (!getApiKey()) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <EmptyState
          icon={Boxes}
          title="API key required"
          description="The console reads solver data through the local API. Add an API key in Settings to activate this page."
          actionLabel="Open settings"
          actionHref="/settings"
        />
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="space-y-6 p-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle className="text-destructive size-6" />
            <p className="text-muted-foreground max-w-md text-sm">{state.error}</p>
            <Button variant="outline" size="sm" onClick={refresh}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeJobs = state.jobs.filter((j) => j.status === 'pending' || j.status === 'running');
  const failedJobs = state.jobs.filter((j) => j.status === 'failed');
  const problemName = (id: string) => state.problems.find((p) => p.id === id)?.name ?? id.slice(0, 12);

  return (
    <div className="space-y-6 overflow-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm">Current state of scenarios, runs and registries.</p>
      </div>

      {(failedJobs.length > 0 || state.exceptionCount > 0) && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="text-destructive size-5 shrink-0" />
            <p className="text-sm">
              {failedJobs.length > 0 && (
                <>
                  <strong>{failedJobs.length}</strong> failed run{failedJobs.length === 1 ? '' : 's'} ·{' '}
                </>
              )}
              <strong>{state.exceptionCount}</strong> order exception{state.exceptionCount === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Scenarios" value={String(state.problems.length)} hint={`${activeJobs.length} run(s) active`} />
        <KpiCard title="Active runs" value={String(activeJobs.length)} hint="pending + running" />
        <KpiCard
          title="Order exceptions"
          value={String(state.exceptionCount)}
          icon={<PackageX className="size-4 text-muted-foreground" />}
          tone={state.exceptionCount > 0 ? 'alert' : undefined}
        />
        <KpiCard
          title="Vehicles in maintenance"
          value={String(state.maintenanceCount)}
          icon={<Truck className="size-4 text-muted-foreground" />}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>Solver queue</CardTitle>
              <CardDescription>Most recent optimization runs. Refreshes every 30 seconds.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/build">
                Plan a route
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {state.jobs.length === 0 ? (
            <EmptyState
              icon={Play}
              title="No runs yet"
              description="Optimization runs you start will appear here with live status."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scenario</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.jobs.slice(0, 10).map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{problemName(job.problemId)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                      {job.error ? (
                        <span className="text-muted-foreground ml-2 text-xs">{job.error.slice(0, 60)}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{duration(job.startedAt, job.completedAt)}</TableCell>
                    <TableCell className="text-muted-foreground text-right">
                      {job.startedAt ? new Date(job.startedAt).toLocaleTimeString() : 'queued'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent scenarios</CardTitle>
          <CardDescription>Latest planning scenarios by last update.</CardDescription>
        </CardHeader>
        <CardContent>
          {state.problems.length === 0 ? (
            <EmptyState
              icon={MapPinned}
              title="No scenarios yet"
              description="Create your first scenario from the Planning workspace."
              actionLabel="Open planner"
              actionHref="/build"
            />
          ) : (
            <ul className="divide-y">
              {state.problems.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {p.customerCount} customers · {p.vehicleCount} vehicles
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  value,
  hint,
  icon,
  tone,
}: {
  title: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: 'alert';
}): React.ReactElement {
  return (
    <Card className={tone === 'alert' ? 'border-destructive/40' : undefined}>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          {icon}
          {title}
        </CardDescription>
        <CardTitle className={`text-3xl ${tone === 'alert' ? 'text-destructive' : ''}`}>{value}</CardTitle>
      </CardHeader>
      <CardContent>{hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}</CardContent>
    </Card>
  );
}

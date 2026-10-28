'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  MapPinned,
  PackageX,
  Play,
  Route,
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
import {
  OperationsMap,
  type OperationsDepot,
  type OperationsOrder,
  type OperationsVehicle,
} from '@/components/overview/operations-map';

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
  return localStorage.getItem('fleetpilot_api_key') ?? 'fp_public_console';
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
    orders: OperationsOrder[];
    vehicles: OperationsVehicle[];
    depots: OperationsDepot[];
  }>({ loading: true, error: null, problems: [], jobs: [], orders: [], vehicles: [], depots: [] });

  const refresh = React.useCallback(async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setState((s) => ({ ...s, loading: false, error: null, problems: [], jobs: [] }));
      return;
    }
    try {
      const [problemsRes, jobsRes, ordersRes, fleetRes, depotsRes] = await Promise.all([
        fetchJson<{ problems: ProblemRow[] }>('/api/problems?limit=100', apiKey),
        fetchJson<{ jobs: JobRow[] }>('/api/jobs?limit=50', apiKey),
        fetchJson<{ orders: OperationsOrder[] }>('/api/orders?limit=200', apiKey),
        fetchJson<{ fleet: OperationsVehicle[] }>('/api/fleet?limit=200', apiKey),
        fetchJson<{ depots: OperationsDepot[] }>('/api/depots?limit=200', apiKey),
      ]);
      setState({
        loading: false,
        error: null,
        problems: problemsRes.problems,
        jobs: jobsRes.jobs,
        orders: ordersRes.orders,
        vehicles: fleetRes.fleet,
        depots: depotsRes.depots,
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
  const unplannedOrders = state.orders.filter((order) => order.status === 'unassigned');
  const exceptionOrders = state.orders.filter((order) => order.status === 'exception');
  const activeVehicles = state.vehicles.filter((vehicle) => vehicle.status === 'active');
  const problemName = (id: string) => state.problems.find((p) => p.id === id)?.name ?? id.slice(0, 12);

  return (
    <div className="space-y-8 overflow-auto p-5 md:p-8">
      <div className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground mb-2 flex items-center gap-2 text-xs"><CalendarDays className="size-3.5" /> Operations workspace</p>
          <h1 className="text-3xl font-medium tracking-[-0.04em]">Today</h1>
          <p className="text-muted-foreground mt-2 text-sm">See the demand, organize the fleet, and turn today’s work into routes.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/fleet"><Truck /> Manage fleet</Link></Button>
          <Button asChild><Link href="/orders"><Route /> Plan deliveries</Link></Button>
        </div>
      </div>

      {(failedJobs.length > 0 || exceptionOrders.length > 0) && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="text-destructive size-5 shrink-0" />
            <p className="text-sm">
              {failedJobs.length > 0 && (
                <>
                  <strong>{failedJobs.length}</strong> failed run{failedJobs.length === 1 ? '' : 's'} ·{' '}
                </>
              )}
              <strong>{exceptionOrders.length}</strong> delivery exception{exceptionOrders.length === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid border-l border-t sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Unplanned deliveries" value={String(unplannedOrders.length)} hint={`${state.orders.length} total today`} />
        <KpiCard title="Available vehicles" value={String(activeVehicles.length)} hint={`${state.depots.length} dispatch depot${state.depots.length === 1 ? '' : 's'}`} />
        <KpiCard title="Saved plans" value={String(state.problems.length)} hint={`${activeJobs.length} optimization run${activeJobs.length === 1 ? '' : 's'} active`} />
        <KpiCard
          title="Exceptions"
          value={String(exceptionOrders.length)}
          icon={<PackageX className="size-4 text-muted-foreground" />}
          tone={exceptionOrders.length > 0 ? 'alert' : undefined}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium tracking-[-0.025em]">Operating picture</h2>
            <p className="text-muted-foreground mt-1 text-sm">Depots, available vehicles, and delivery demand on one map.</p>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-foreground" /> Refreshes every 30 seconds</div>
        </div>
        <OperationsMap depots={state.depots} orders={state.orders} vehicles={state.vehicles} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <CardTitle>Route activity</CardTitle>
                <CardDescription>Recent optimization work and its operational status.</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/history">View activity <ArrowUpRight /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
          {state.jobs.length === 0 ? (
            <EmptyState
              icon={Play}
              title="No runs yet"
              description="Select deliveries and create a plan to begin."
              actionLabel="Open deliveries"
              actionHref="/orders"
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
            <CardTitle>Recent plans</CardTitle>
            <CardDescription>Saved route scenarios ready to review or run again.</CardDescription>
          </CardHeader>
          <CardContent>
          {state.problems.length === 0 ? (
            <EmptyState
              icon={MapPinned}
              title="No plans yet"
              description="Start with deliveries, choose the available fleet, and create your first dispatch plan."
              actionLabel="Open deliveries"
              actionHref="/orders"
            />
          ) : (
            <ul className="divide-y">
              {state.problems.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {p.customerCount} deliveries · {p.vehicleCount} vehicles
                    </p>
                  </div>
                  <Button asChild size="sm" variant="ghost"><Link href={`/optimize?problem=${p.id}`}>Open <ArrowUpRight /></Link></Button>
                </li>
              ))}
            </ul>
          )}
          </CardContent>
        </Card>
      </div>
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
    <Card className={`rounded-none border-l-0 border-t-0 ${tone === 'alert' ? 'border-destructive/40' : ''}`}>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          {icon}
          {title}
        </CardDescription>
        <CardTitle className={`text-3xl font-medium tracking-[-0.04em] ${tone === 'alert' ? 'text-destructive' : ''}`}>{value}</CardTitle>
      </CardHeader>
      <CardContent>{hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}</CardContent>
    </Card>
  );
}

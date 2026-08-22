'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Loader2, Play, Pause, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useProblemStore, type SolverSolution } from '@/lib/problem-store';
import { formatDuration, formatDistance, formatCost, formatCo2 } from '@/lib/utils';
import {
  detectWindowViolations,
  type WindowViolation,
} from '@/lib/simulate/writeback';

const DynamicSimulateMap = dynamic(
  () => import('@/components/map/simulate-map').then((m) => m.SimulateMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-xl border bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

const REALTIME_MS_PER_MIN = 200; // 1 wall-clock minute = 200 ms of playback

interface SolutionRow {
  id: string;
  problemId: string;
  solutionJson: string;
}

export default function SimulatePage(): React.ReactElement {
  const searchParams = useSearchParams();
  const deepLinkSolutionId = searchParams.get('solution');

  const problem = useProblemStore((s) => s.problem);
  const setProblem = useProblemStore((s) => s.setProblem);
  const solution = useProblemStore((s) => s.solution);
  const setSolution = useProblemStore((s) => s.setSolution);
  const status = useProblemStore((s) => s.status);
  const reset = useProblemStore((s) => s.reset);

  const [loadingLink, setLoadingLink] = React.useState(false);
  const [linkError, setLinkError] = React.useState<string | null>(null);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(1);
  const [hoveredVehicleId, setHoveredVehicleId] = React.useState<number | null>(null);

  /** Deep link: ?solution=<id> hydrates the store from the server. */
  React.useEffect(() => {
    if (!deepLinkSolutionId) return;
    let cancelled = false;
    setLoadingLink(true);
    setLinkError(null);
    (async () => {
      try {
        const apiKey = localStorage.getItem('fleetpilot_api_key') ?? '';
        const headers = { Authorization: `Bearer ${apiKey}` };
        const solRes = await fetch(`/api/solutions/${deepLinkSolutionId}`, { headers });
        if (!solRes.ok) throw new Error(`Solution load failed (${solRes.status})`);
        const row = (await solRes.json()) as SolutionRow;

        const parsed = JSON.parse(row.solutionJson) as SolverSolution & {
          nodeTimesEntries?: Array<[number, number]>;
        };
        const normalized: SolverSolution = {
          ...parsed,
          routes: parsed.routes ?? [],
          nodeTimes: parsed.nodeTimes ?? {},
          nodeTimesEntries:
            parsed.nodeTimesEntries ??
            Object.entries(parsed.nodeTimes ?? {}).map(([k, v]) => [Number(k), v] as [number, number]),
        };

        if (!useProblemStore.getState().problem && row.problemId) {
          const probRes = await fetch(`/api/problems/${row.problemId}`, { headers });
          if (probRes.ok) {
            const detail = (await probRes.json()) as { problemJson: string };
            setProblem(JSON.parse(detail.problemJson));
          }
        }
        if (!cancelled) {
          setSolution(normalized);
          setPlaying(true);
        }
      } catch (err) {
        if (!cancelled) setLinkError(err instanceof Error ? err.message : 'Deep link failed');
      } finally {
        if (!cancelled) setLoadingLink(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deepLinkSolutionId]);

  const makespan = solution?.makespan ?? 0;

  // Use requestAnimationFrame for smooth playback. Each frame advances
  // currentTime by the wall-clock delta scaled by speed. Ensure playback
  // runs on the same tick regardless of refresh rate, but cap at ~60 fps.
  const rafRef = React.useRef<number | null>(null);
  const lastTickRef = React.useRef<number>(0);
  const stateRef = React.useRef({ playing, speed, makespan });
  React.useEffect(() => {
    stateRef.current = { playing, speed, makespan };
  }, [playing, speed, makespan]);

  React.useEffect(() => {
    if (!playing || makespan <= 0) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    lastTickRef.current = performance.now();
    const tick = (now: number): void => {
      const last = lastTickRef.current;
      const dtMs = now - last;
      lastTickRef.current = now;
      // Cap dt to 100ms so a tab-switch doesn't teleport the head.
      const dtMin = Math.min(dtMs, 100) / REALTIME_MS_PER_MIN;
      const { speed: curSpeed, makespan: curMakespan } = stateRef.current;
      setCurrentTime((t) => {
        const next = t + dtMin * curSpeed;
        if (next >= curMakespan) {
          setPlaying(false);
          return curMakespan;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [playing, makespan]);

  // Reset currentTime to 0 when a new solution arrives.
  React.useEffect(() => {
    if (solution && currentTime !== 0) {
      setCurrentTime(0);
    }
  }, [solution]);

  // Keyboard transport: space play/pause, arrows step ±1 min, r reset.
  // Suppressed while typing in form fields.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentTime((t) => Math.min(makespan, t + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTime((t) => Math.max(0, t - 1));
      } else if (e.key.toLowerCase() === 'r') {
        setCurrentTime(0);
        setPlaying(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [makespan]);

  /** Node arrival times keyed by node id, for window checks and ETAs. */
  const arrivalByNodeId = React.useMemo(() => {
    const m = new Map<number, number>();
    for (const [k, v] of solution?.nodeTimesEntries ?? []) m.set(Number(k), v);
    return m;
  }, [solution]);

  const violations = React.useMemo<WindowViolation[]>(
    () =>
      problem && solution
        ? detectWindowViolations(
            problem,
            Object.fromEntries([...arrivalByNodeId.entries()].map(([k, v]) => [String(k), v])),
          )
        : [],
    [problem, solution, arrivalByNodeId],
  );

  const violationNodeIds = React.useMemo(
    () => [...new Set(violations.map((v) => v.nodeId))],
    [violations],
  );

  if (!problem || !solution) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-center justify-between border-b bg-background px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Simulate</h1>
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center p-8">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>
                {loadingLink ? 'Loading run…' : linkError ? 'Run failed to load' : 'No solution yet'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                {loadingLink
                  ? 'Fetching the shared run…'
                  : linkError
                    ? linkError
                    : status === 'error'
                      ? 'The last solve failed.'
                      : 'Build a problem and solve it first.'}
              </p>
              {!loadingLink && (
                <div className="flex gap-2">
                  <Button asChild>
                    <Link href="/build">Go to planner</Link>
                  </Button>
                  {!linkError && (
                    <Button variant="outline" onClick={reset}>
                      Clear state
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Simulate</h1>
          <Badge variant={solution.feasible ? 'success' : 'destructive'}>
            {solution.feasible ? 'Feasible' : 'Infeasible'}
          </Badge>
          {violations.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="size-3" /> {violations.length} window violation{violations.length === 1 ? '' : 's'}
            </Badge>
          )}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/build">Edit plan →</Link>
        </Button>
      </header>
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1fr_360px]">
        <div className="relative min-h-[400px]">
          <DynamicSimulateMap
            referenceOrigin={problem.referenceOrigin ?? null}
            currentTime={currentTime}
            hoveredVehicleId={hoveredVehicleId}
            violationNodeIds={violationNodeIds}
          />
        </div>
        <div className="overflow-y-auto pr-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Playback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">
                t = {formatDuration(currentTime)} / {formatDuration(makespan)}
              </div>
              <input
                type="range"
                min={0}
                max={makespan}
                step={0.1}
                value={currentTime}
                onChange={(e) => setCurrentTime(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={playing ? 'secondary' : 'default'}
                  onClick={() => setPlaying((p) => !p)}
                  disabled={currentTime >= makespan}
                >
                  {playing ? <Pause className="mr-1 h-3 w-3" /> : <Play className="mr-1 h-3 w-3" />}
                  {playing ? 'Pause' : 'Play'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCurrentTime(0);
                    setPlaying(false);
                  }}
                >
                  <RotateCcw className="mr-1 h-3 w-3" /> Reset
                </Button>
                <select
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                >
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1×</option>
                  <option value={2}>2×</option>
                  <option value={5}>5×</option>
                  <option value={10}>10×</option>
                </select>
              </div>
            </CardContent>
          </Card>
          <Separator />
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">KPIs</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Makespan</div>
                <div className="font-semibold">{formatDuration(solution.makespan)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Distance</div>
                <div className="font-semibold">{formatDistance(solution.totalDistance)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cost</div>
                <div className="font-semibold">{formatCost(solution.totalCost)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">CO₂</div>
                <div className="font-semibold">{formatCo2(solution.totalCo2)}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Routes ({solution.routes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Stops</TableHead>
                    <TableHead className="text-right">ETA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solution.routes.map((r) => {
                    const arrivals = r.nodes.map((n) => arrivalByNodeId.get(n) ?? 0);
                    const eta = arrivals.length > 0 ? Math.max(...arrivals) : 0;
                    return (
                      <TableRow
                        key={r.vehicleId}
                        onMouseEnter={() => setHoveredVehicleId(r.vehicleId)}
                        onMouseLeave={() => setHoveredVehicleId(null)}
                      >
                        <TableCell>
                          <Badge variant="secondary">Vehicle {r.vehicleId}</Badge>
                        </TableCell>
                        <TableCell className="max-w-40 truncate font-mono text-[10px] text-muted-foreground">
                          {r.nodes.join(' → ')}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatDuration(eta)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {violations.length > 0 && (
            <Card className="border-destructive/40 mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Window violations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {violations.map((v, i) => (
                  <button
                    key={`${v.nodeId}-${v.kind}-${i}`}
                    type="button"
                    onClick={() => setCurrentTime(v.arrival)}
                    className="hover:bg-muted flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs"
                  >
                    <span>
                      Node {v.nodeId} ·{' '}
                      <span className={v.kind === 'late' ? 'text-destructive' : 'text-amber-600'}>
                        {v.kind}
                      </span>
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      arrived {formatDuration(v.arrival)} / window{' '}
                      {v.windowStart !== null ? formatDuration(v.windowStart) : '—'}–
                      {v.windowEnd !== null ? formatDuration(v.windowEnd) : '—'}
                    </span>
                  </button>
                ))}
                <p className="text-muted-foreground pt-1 text-[11px]">
                  The engine does not enforce time windows — these are playback observations.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

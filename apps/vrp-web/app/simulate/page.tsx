'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Loader2, Play, Pause, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { useProblemStore } from '@/lib/problem-store';
import { formatDuration, formatDistance, formatCost, formatCo2 } from '@/lib/utils';

const SimulateMap = dynamic(
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

export default function SimulatePage(): React.ReactElement {
  const problem = useProblemStore((s) => s.problem);
  const solution = useProblemStore((s) => s.solution);
  const status = useProblemStore((s) => s.status);
  const reset = useProblemStore((s) => s.reset);

  const [currentTime, setCurrentTime] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(1);
  const [hoveredVehicleId, setHoveredVehicleId] = React.useState<number | null>(null);

  const makespan = solution?.makespan ?? 0;

  React.useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setCurrentTime((t) => {
        const next = t + 0.5 * speed;
        if (next >= makespan) {
          setPlaying(false);
          return makespan;
        }
        return next;
      });
    }, 50);
    return () => window.clearInterval(id);
  }, [playing, makespan, speed]);

  React.useEffect(() => {
    if (solution && currentTime === 0) {
      setCurrentTime(0);
    }
  }, [solution, currentTime]);

  if (!problem || !solution) {
    return (
      <div className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b bg-background px-4 py-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Home
              </Link>
            </Button>
            <h1 className="text-lg font-semibold">Simulate</h1>
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center p-8">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>No solution yet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                {status === 'error'
                  ? 'The last solve failed.'
                  : 'Build a problem and solve it first.'}
              </p>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href="/build">Go to builder</Link>
                </Button>
                <Button variant="outline" onClick={reset}>
                  Clear state
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Home
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Simulate</h1>
          <Badge variant={solution.feasible ? 'success' : 'destructive'}>
            {solution.feasible ? 'Feasible' : 'Infeasible'}
          </Badge>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/build">Edit problem →</Link>
        </Button>
      </header>
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1fr_360px]">
        <div className="relative min-h-[400px]">
          <SimulateMap
            referenceOrigin={problem.referenceOrigin ?? null}
            currentTime={currentTime}
            hoveredVehicleId={hoveredVehicleId}
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
                step={0.5}
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
            <CardContent className="space-y-2">
              {solution.routes.map((r, idx) => (
                <div
                  key={r.vehicleId}
                  className="rounded-md border p-2 text-xs hover:bg-muted"
                  onMouseEnter={() => setHoveredVehicleId(r.vehicleId)}
                  onMouseLeave={() => setHoveredVehicleId(null)}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">Vehicle {r.vehicleId}</Badge>
                    <span className="text-muted-foreground">{r.nodes.length} stops</span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {r.nodes.join(' → ')}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

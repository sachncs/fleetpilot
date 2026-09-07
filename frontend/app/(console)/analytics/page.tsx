'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Activity } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { EmptyState } from '@/components/shared/empty-state';
import { SkeletonCard } from '@/components/shared/skeleton-card';

interface SolutionKpi {
  id: string;
  problemId: string;
  name: string | null;
  makespan: number;
  totalDistance: number;
  totalCost: number;
  totalCo2: number;
  feasible: boolean;
  createdAt: string;
}

const distanceConfig = {
  distance: { label: 'Distance (m)', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const costConfig = {
  cost: { label: 'Cost', color: 'var(--chart-2)' },
  co2: { label: 'CO₂e (kg)', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const POLL_MS = 60_000;

function shortLabel(row: SolutionKpi, index: number): string {
  const base = row.name ?? row.problemId.slice(0, 8);
  const truncated = base.length > 14 ? `${base.slice(0, 13)}…` : base;
  return `${truncated} #${index + 1}`;
}

export default function AnalyticsPage(): React.ReactElement {
  const [hasKey, setHasKey] = React.useState<boolean | null>(null);
  const [rows, setRows] = React.useState<SolutionKpi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const apiKey = localStorage.getItem('fleetpilot_api_key');
    if (!apiKey) {
      setHasKey(false);
      setLoading(false);
      return;
    }
    setHasKey(true);
    try {
      const res = await fetch('/api/solutions?limit=30', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error('Analytics load failed');
      const data = (await res.json()) as { solutions: SolutionKpi[] };
      // oldest → newest so trends read left to right
      setRows([...data.solutions].reverse());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analytics load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (hasKey === false) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <EmptyState
          icon={Activity}
          title="API key required"
          description="Analytics reads run metrics behind the local API. Add an API key in Settings."
          actionLabel="Open settings"
          actionHref="/settings"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const chartData = rows.map((row, i) => ({
    label: shortLabel(row, i),
    distance: row.totalDistance,
    cost: row.totalCost,
    co2: row.totalCo2,
    feasible: row.feasible,
  }));

  const totals = rows.reduce(
    (acc, r) => ({
      distance: acc.distance + r.totalDistance,
      cost: acc.cost + r.totalCost,
      co2: acc.co2 + r.totalCo2,
    }),
    { distance: 0, cost: 0, co2: 0 },
  );

  return (
    <div className="space-y-4 overflow-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          KPIs across the last {rows.length || 30} completed runs, oldest to newest.
        </p>
      </div>

      {error && <Card className="border-destructive/40"><CardContent className="py-3 text-destructive text-sm">{error}</CardContent></Card>}

      {rows.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No runs yet"
          description="Solve a scenario and its distance, cost and CO₂e will chart here."
          actionLabel="Open optimize"
          actionHref="/optimize"
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-1"><CardDescription>Total distance</CardDescription></CardHeader>
              <CardContent className="text-xl font-semibold tabular-nums">{(totals.distance / 1000).toFixed(1)} km</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardDescription>Total cost</CardDescription></CardHeader>
              <CardContent className="text-xl font-semibold tabular-nums">{totals.cost.toLocaleString()}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardDescription>Total CO₂e</CardDescription></CardHeader>
              <CardContent className="text-xl font-semibold tabular-nums">{(totals.co2 / 1000).toFixed(1)} kg</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distance per run</CardTitle>
              <CardDescription>Metres travelled by all vehicles.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={distanceConfig} className="h-64 w-full">
                <BarChart data={chartData} margin={{ left: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="distance" fill="var(--color-distance)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cost & CO₂e per run</CardTitle>
              <CardDescription>Monetary and emissions estimates side by side.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={costConfig} className="h-64 w-full">
                <BarChart data={chartData} margin={{ left: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} width={56} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="cost" fill="var(--color-cost)" radius={4} />
                  <Bar dataKey="co2" fill="var(--color-co2)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

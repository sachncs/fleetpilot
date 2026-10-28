'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SystemInfo {
  database: {
    file: string;
    counts: {
      scenarios: number;
      solutions: number;
      orders: number;
      vehicles: number;
      stations: number;
      auditEntries: number;
    };
  };
  solverLimits: {
    maxTimeMs: number;
    maxGenerations: number;
    maxConcurrentSolves: number;
  };
}

function SystemCard(): React.ReactElement {
  const [info, setInfo] = React.useState<SystemInfo | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/system', {
          headers: { Authorization: `Bearer ${localStorage.getItem('fleetpilot_api_key') ?? 'fp_public_console'}` },
        });
        if (!res.ok) throw new Error(`System info unavailable (${res.status})`);
        setInfo((await res.json()) as SystemInfo);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'System info unavailable');
      }
    })();
  }, []);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Local system</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!info) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Local system</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardContent>
      </Card>
    );
  }

  const rows: Array<[string, number]> = [
    ['Scenarios', info.database.counts.scenarios],
    ['Solutions', info.database.counts.solutions],
    ['Deliveries', info.database.counts.orders],
    ['Vehicles', info.database.counts.vehicles],
    ['Depots', info.database.counts.stations],
    ['Audit entries', info.database.counts.auditEntries],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Local system</CardTitle>
        <CardDescription>
          SQLite file <code className="font-mono text-xs">{info.database.file}</code> · solver caps{' '}
          {info.solverLimits.maxConcurrentSolves} concurrent / {info.solverLimits.maxGenerations} generations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-2 border-b py-1">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="tabular-nums font-medium">{value.toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage(): React.ReactElement {
  return (
    <div className="overflow-auto p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="max-w-2xl space-y-6">
        <SystemCard />

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Built-in services this console talks to.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span>Solver engine</span>
              <span className="text-muted-foreground text-xs">in-process worker queue</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Geocoding</span>
              <span className="text-muted-foreground text-xs">OpenStreetMap Nominatim · rate-limited · 30-day cache</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Map tiles</span>
              <span className="text-muted-foreground text-xs">CARTO basemaps / OpenStreetMap</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import { ApiKeyManager } from '@/components/settings/api-key-manager';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

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
          headers: { Authorization: `Bearer ${localStorage.getItem('fleetpilot_api_key') ?? ''}` },
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
    ['Orders', info.database.counts.orders],
    ['Vehicles', info.database.counts.vehicles],
    ['Stations', info.database.counts.stations],
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
  const [apiKey, setApiKey] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem('fleetpilot_api_key') ?? '';
    setApiKey(stored);
    setSaved(!!stored);
  }, []);

  const saveKey = (): void => {
    localStorage.setItem('fleetpilot_api_key', apiKey);
    setSaved(true);
    toast.success('API key saved');
  };

  return (
    <div className="overflow-auto p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="max-w-2xl space-y-6">
        <SystemCard />

        <Card>
          <CardHeader>
            <CardTitle>API access</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={saved ? 'success' : 'secondary'}>{saved ? 'connected' : 'not set'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Console pages call the local API with this key. Create and revoke keys below.
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="fp_..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setSaved(false);
                }}
                className="font-mono"
              />
              <Button onClick={saveKey} disabled={!apiKey}>
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        {apiKey && <ApiKeyManager apiKey={apiKey} />}

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
              <span className="text-muted-foreground text-xs">Stadia Maps / OpenStreetMap</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

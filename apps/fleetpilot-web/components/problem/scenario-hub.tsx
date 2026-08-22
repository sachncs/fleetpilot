'use client';

import * as React from 'react';
import { CloudUpload, Copy, FolderOpen, Loader2, Trash2 } from 'lucide-react';

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

import { useProblemStore } from '@/lib/problem-store';
import type { Problem } from '@/lib/problem-schema';

interface ScenarioRow {
  id: string;
  name: string;
  customerCount: number;
  vehicleCount: number;
  updatedAt: string;
}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${localStorage.getItem('fleetpilot_api_key') ?? ''}`,
    'content-type': 'application/json',
  };
}

/** Save / load / duplicate / delete scenarios against the local API. */
export function ScenarioHub(): React.ReactElement {
  const problem = useProblemStore((s) => s.problem);
  const setProblem = useProblemStore((s) => s.setProblem);

  const [name, setName] = React.useState('');
  const [scenarios, setScenarios] = React.useState<ScenarioRow[]>([]);
  const [busy, setBusy] = React.useState<'save' | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [hasKey, setHasKey] = React.useState(true);

  const refreshList = React.useCallback(async () => {
    if (!localStorage.getItem('fleetpilot_api_key')) {
      setHasKey(false);
      return;
    }
    setHasKey(true);
    try {
      const res = await fetch('/api/problems?limit=20', { headers: authHeaders() });
      if (!res.ok) return;
      const data = (await res.json()) as { problems: ScenarioRow[] };
      setScenarios(data.problems);
    } catch {
      // listing is best-effort; the workspace works offline
    }
  }, []);

  React.useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const save = async (): Promise<void> => {
    if (!problem) return;
    setBusy('save');
    setMessage(null);
    try {
      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: name.trim() || `Scenario ${new Date().toLocaleString()}`,
          problemJson: problem,
        }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const created = (await res.json()) as { id: string };
      localStorage.setItem('fleetpilot:last-scenario', created.id);
      setMessage('Scenario saved.');
      await refreshList();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(null);
    }
  };

  const load = async (id: string): Promise<void> => {
    try {
      const res = await fetch(`/api/problems/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const row = (await res.json()) as { name: string; problemJson: string };
      const parsed = JSON.parse(row.problemJson) as Problem;
      setProblem(parsed);
      setName(row.name);
      setMessage(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Load failed');
    }
  };

  const remove = async (id: string): Promise<void> => {
    try {
      const res = await fetch(`/api/problems/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      await refreshList();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const duplicate = async (id: string): Promise<void> => {
    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ duplicateFrom: id }),
      });
      if (!res.ok) throw new Error(`Duplicate failed (${res.status})`);
      await refreshList();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Duplicate failed');
    }
  };

  if (!hasKey) return <></>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Scenario</CardTitle>
        <CardDescription>Save the current plan to the server, or load an earlier one.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Scenario name"
            aria-label="Scenario name"
          />
          <Button size="sm" onClick={save} disabled={!problem || busy === 'save'}>
            {busy === 'save' ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CloudUpload />
            )}
            Save
          </Button>
        </div>

        {message && <p className="text-muted-foreground text-xs">{message}</p>}

        {scenarios.length > 0 && (
          <ul className="divide-y rounded-md border">
            {scenarios.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 px-2 py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{s.name}</p>
                  <p className="text-muted-foreground text-[11px]">
                    {s.customerCount} customers · {s.vehicleCount} vehicles
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    title="Load"
                    onClick={() => void load(s.id)}
                  >
                    <FolderOpen />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    title="Duplicate as version"
                    onClick={() => void duplicate(s.id)}
                  >
                    <Copy />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive size-7"
                    title="Delete"
                    onClick={() => void remove(s.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!problem && (
          <Badge variant="secondary">Empty canvas — place your first stop on the map</Badge>
        )}
      </CardContent>
    </Card>
  );
}

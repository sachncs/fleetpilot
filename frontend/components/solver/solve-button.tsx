'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { useProblemStore } from '@/lib/problem-store';

const LAST_SCENARIO_KEY = 'fleetpilot:last-scenario';

export function getLastScenarioId(): string | null {
  try {
    return localStorage.getItem(LAST_SCENARIO_KEY);
  } catch {
    return null;
  }
}

/**
 * Launch point for the optimizer console. Runs live on /optimize; the
 * scenario must be saved first so the server owns the run.
 */
export function SolveButton(): React.ReactElement {
  const solution = useProblemStore((s) => s.solution);
  const status = useProblemStore((s) => s.status);

  const [savedId, setSavedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSavedId(getLastScenarioId());
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Optimization</CardTitle>
        <CardDescription>
          Save the scenario, then configure and start runs in the optimizer console.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {solution && (
          <p className="text-xs text-emerald-600">
            Latest result: {solution.feasible ? 'feasible' : 'infeasible'} · makespan{' '}
            {solution.makespan.toFixed(1)} min
          </p>
        )}
        {status === 'error' && (
          <p className="text-destructive text-xs">The last run failed — see the optimizer console.</p>
        )}
        {savedId ? (
          <Button asChild className="w-full">
            <Link href={`/optimize?problem=${encodeURIComponent(savedId)}`}>
              <Sparkles className="mr-2 h-4 w-4" /> Open optimizer
            </Link>
          </Button>
        ) : (
          <p className="text-muted-foreground text-xs">
            Save the scenario (panel above) to unlock runs — the server owns every optimization run.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

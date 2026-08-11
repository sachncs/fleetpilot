'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp } from 'lucide-react';

import { useProblemStore } from '@/lib/problem-store';
import { ProblemSchema, type Problem } from '@/lib/problem-schema';

const SAMPLES: Array<{ name: string; description: string }> = [
  { name: 'basic', description: 'Simple 3-node problem (1 depot, 1 customer)' },
  { name: 'delhi-10', description: 'Delhi 10-customer real coordinates' },
  { name: 'mumbai-20', description: 'Mumbai 20-customer real coordinates' },
  { name: 'time-windows', description: '2-customer with tight time windows' },
  { name: 'multi-depot', description: 'Multi-depot variant' },
];

/**
 * The shipped samples use lat/lng-shaped coordinates (e.g. 28.61, 77.23 for
 * Delhi). The backend solver works in metres, so we need a reference origin
 * to anchor the local-tangent-plane projection. If the JSON doesn't include
 * one, derive it from the depot node — the first node in the array is the
 * depot by convention.
 */
function ensureReferenceOrigin(p: Problem): Problem {
  if (p.referenceOrigin) return p;
  const nodeList = Array.isArray(p.nodes) ? p.nodes : Object.values(p.nodes);
  const depot = nodeList.find((n) => n.id === p.depotNodeId) ?? nodeList[0];
  if (!depot) return p;
  return { ...p, referenceOrigin: { lat: depot.x, lng: depot.y } };
}

export function LoadSample(): React.ReactElement {
  const setProblem = useProblemStore((s) => s.setProblem);
  const [loading, setLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const onLoad = async (name: string): Promise<void> => {
    setLoading(name);
    setError(null);
    try {
      const res = await fetch(`/samples/${name}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const result = ProblemSchema.safeParse(raw);
      if (!result.success) {
        throw new Error(result.error.issues.map((i) => i.message).join('; '));
      }
      setProblem(ensureReferenceOrigin(result.data));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileUp className="h-4 w-4" /> Load sample
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {SAMPLES.map((s) => (
          <Button
            key={s.name}
            variant="outline"
            className="w-full justify-between"
            onClick={() => void onLoad(s.name)}
            disabled={loading !== null}
          >
            <span className="font-mono text-xs">{s.name}</span>
            <span className="text-xs text-muted-foreground">{loading === s.name ? '...' : s.description}</span>
          </Button>
        ))}
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, FileJson } from 'lucide-react';

import { useProblemStore } from '@/lib/problem-store';
import { ProblemSchema } from '@/lib/problem-schema';

export function ProblemJson(): React.ReactElement {
  const problem = useProblemStore((s) => s.problem);
  const setProblem = useProblemStore((s) => s.setProblem);
  const [error, setError] = React.useState<string | null>(null);

  const json = React.useMemo(() => JSON.stringify(problem, null, 2), [problem]);

  const onPaste = (raw: string): void => {
    try {
      const parsed = JSON.parse(raw);
      const result = ProblemSchema.safeParse(parsed);
      if (!result.success) {
        setError(result.error.issues.map((i) => i.message).join('; '));
        return;
      }
      setProblem(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  const onCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(json);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileJson className="h-4 w-4" /> JSON
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => void onCopy()}>
          <Copy className="mr-1 h-3 w-3" /> Copy
        </Button>
      </CardHeader>
      <CardContent>
        <Textarea
          rows={15}
          className="font-mono text-xs"
          value={json}
          onChange={(e) => onPaste(e.target.value)}
        />
        {error && (
          <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        )}
        {problem && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{(Array.isArray(problem.nodes) ? problem.nodes : Object.values(problem.nodes)).length} nodes</Badge>
            <Badge variant="outline">{problem.customers.length} customers</Badge>
            <Badge variant="outline">{problem.vehicles.length} vehicles</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { History as HistoryIcon, GitBranch } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/empty-state';
import { SkeletonCard } from '@/components/shared/skeleton-card';

interface AuditEntry {
  id: number;
  createdAt: string;
  actor: string;
  entity: string;
  entityId: string;
  action: string;
  payloadJson: string | null;
}

const PAGE_SIZE = 50;

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${localStorage.getItem('fleetpilot_api_key') ?? ''}`,
    'content-type': 'application/json',
  };
}

const ENTITY_TABS = ['all', 'problem', 'solution', 'vehicle', 'depot', 'order'] as const;

export default function HistoryPage(): React.ReactElement {
  const [hasKey, setHasKey] = React.useState<boolean | null>(null);
  const [entries, setEntries] = React.useState<AuditEntry[]>([]);
  const [cursor, setCursor] = React.useState<number | null>(null);
  const [entity, setEntity] = React.useState<(typeof ENTITY_TABS)[number]>('all');
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [problemId, setProblemId] = React.useState('');
  const [lineage, setLineage] = React.useState<{
    ancestors: Array<{ id: string; name: string; versionLabel: string | null; customerCount: number; createdAt: string }>;
    children: Array<{ id: string; name: string; versionLabel: string | null; customerCount: number; createdAt: string }>;
  } | null>(null);
  const [lineageLoading, setLineageLoading] = React.useState(false);
  const [lineageError, setLineageError] = React.useState<string | null>(null);

  const loadLineage = async (): Promise<void> => {
    if (!problemId.trim()) return;
    setLineageLoading(true);
    setLineageError(null);
    try {
      const res = await fetch(`/api/problems/${encodeURIComponent(problemId.trim())}/lineage`, {
        headers: authHeaders(),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ancestors?: unknown; children?: unknown };
      if (!res.ok) throw new Error(data.error ?? `Trace failed (${res.status})`);
      setLineage(data as NonNullable<typeof lineage>);
    } catch (err) {
      setLineage(null);
      setLineageError(err instanceof Error ? err.message : 'Trace failed');
    } finally {
      setLineageLoading(false);
    }
  };

  const load = React.useCallback(
    async (mode: 'reset' | 'more', whichEntity: (typeof ENTITY_TABS)[number]) => {
      if (!localStorage.getItem('fleetpilot_api_key')) {
        setHasKey(false);
        setLoading(false);
        return;
      }
      setHasKey(true);
      try {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
        if (whichEntity !== 'all') params.set('entity', whichEntity);
        if (mode === 'more' && cursor !== null) params.set('cursor', String(cursor));
        else setCursor(null);
        const res = await fetch(`/api/history?${params}`, { headers: authHeaders() });
        if (!res.ok) throw new Error('History load failed');
        const data = (await res.json()) as { entries: AuditEntry[]; nextCursor: number | null };
        setEntries((prev) => (mode === 'more' ? [...prev, ...data.entries] : data.entries));
        setCursor(data.nextCursor);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'History load failed');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [cursor],
  );

  React.useEffect(() => {
    void load('reset', 'all');
    // Initial load only; tab switches call load('reset', entity) directly.
  }, []);

  const switchTab = (value: (typeof ENTITY_TABS)[number]): void => {
    setEntity(value);
    setLoading(true);
    void load('reset', value);
  };

  if (hasKey === false) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <EmptyState
          icon={HistoryIcon}
          title="API key required"
          description="The audit trail is stored behind the local API. Add an API key in Settings."
          actionLabel="Open settings"
          actionHref="/settings"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-muted-foreground text-sm">
          Append-only audit trail. Every registry change and run event lands here.
        </p>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="text-destructive py-3 text-sm">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Scenario lineage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Scenario id (prob_…)"
              value={problemId}
              onChange={(e) => {
                setProblemId(e.target.value);
                setLineage(null);
                setLineageError(null);
              }}
              className="max-w-sm"
            />
            <Button
              variant="outline"
              disabled={!problemId.trim() || lineageLoading}
              onClick={() => void loadLineage()}
            >
              Trace
            </Button>
          </div>
          {lineageError && <p className="text-destructive text-sm">{lineageError}</p>}
          {lineage && (
            <div className="space-y-2 text-sm">
              {lineage.ancestors.length > 1 && (
                <p className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
                  {lineage.ancestors.map((a, i) => (
                    <React.Fragment key={a.id}>
                      {i > 0 && <span>→</span>}
                      <Link href={`/optimize?problem=${a.id}`} className="hover:underline">
                        {a.name}
                        {a.versionLabel && <span className="ml-1 opacity-60">({a.versionLabel})</span>}
                      </Link>
                    </React.Fragment>
                  ))}
                </p>
              )}
              {lineage.children.length === 0 ? (
                <p className="text-muted-foreground text-xs">No derived versions yet.</p>
              ) : (
                <ul className="space-y-1">
                  {lineage.children.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-xs">
                      <GitBranch className="text-muted-foreground size-3" />
                      <Link href={`/optimize?problem=${c.id}`} className="hover:underline">
                        {c.name}
                        {c.versionLabel && <span className="ml-1 opacity-60">({c.versionLabel})</span>}
                      </Link>
                      <span className="text-muted-foreground">
                        {c.customerCount} customers · {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={entity}>
        <TabsList>
          {ENTITY_TABS.map((t) => (
            <TabsTrigger key={t} value={t} onClick={() => switchTab(t)}>
              {t === 'all' ? 'All' : t === 'problem' ? 'Scenarios' : t === 'solution' ? 'Runs' : t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <SkeletonCard />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No activity yet"
          description="Create a vehicle, run a solve — actions will appear here."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap tabular-nums">
                    {new Date(e.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{e.actor}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{e.entity}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{e.action}</TableCell>
                  <TableCell className="text-muted-foreground max-w-md truncate text-xs">
                    {e.payloadJson ?? e.entityId}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {cursor !== null && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={loadingMore}
                onClick={() => {
                  setLoadingMore(true);
                  void load('more', entity);
                }}
              >
                Load older
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

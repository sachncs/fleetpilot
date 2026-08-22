'use client';

import * as React from 'react';
import { ClipboardList } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/empty-state';
import { SkeletonCard } from '@/components/shared/skeleton-card';

import { OrderDialog } from '@/components/registry/order-dialog';

type OrderStatus = 'unassigned' | 'planned' | 'exception';

interface OrderRow {
  id: string;
  ref: string;
  kind: 'delivery' | 'pickup' | 'pair';
  pairRefId?: string | null;
  priority: number;
  status: OrderStatus;
  quantity: number | null;
  windowStart: string | null;
  windowEnd: string | null;
  lat: number | null;
  lng: number | null;
  region: string | null;
}

const POLL_MS = 30_000;

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${localStorage.getItem('fleetpilot_api_key') ?? ''}`,
    'content-type': 'application/json',
  };
}

const statusVariant: Record<OrderStatus, 'default' | 'secondary' | 'destructive'> = {
  unassigned: 'secondary',
  planned: 'default',
  exception: 'destructive',
};

export default function OrdersPage(): React.ReactElement {
  const [hasKey, setHasKey] = React.useState<boolean | null>(null);
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    const apiKey = localStorage.getItem('fleetpilot_api_key');
    if (!apiKey) {
      setHasKey(false);
      setLoading(false);
      return;
    }
    setHasKey(true);
    try {
      const res = await fetch('/api/orders?limit=200', { headers: authHeaders() });
      if (!res.ok) throw new Error('Orders load failed');
      const data = (await res.json()) as { orders: OrderRow[] };
      setOrders(data.orders);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Orders load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const submitOrder = async (values: Parameters<React.ComponentProps<typeof OrderDialog>['onSubmit']>[0]) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `Save failed (${res.status})`);
    }
    await load();
  };

  const markPlanned = async (id: string): Promise<void> => {
    setActionError(null);
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: 'planned' }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setActionError(data.error ?? `Update failed (${res.status})`);
      return;
    }
    await load();
  };

  const deleteOrder = async (id: string): Promise<void> => {
    setActionError(null);
    const res = await fetch(`/api/orders/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setActionError(data.error ?? `Delete failed (${res.status})`);
      return;
    }
    await load();
  };

  if (hasKey === false) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <EmptyState
          icon={ClipboardList}
          title="API key required"
          description="The orders registry lives behind the local API. Add an API key in Settings to manage orders."
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

  const filtered = (status: OrderStatus | 'all'): OrderRow[] =>
    status === 'all' ? orders : orders.filter((o) => o.status === status);

  const renderTable = (rows: OrderRow[]): React.ReactElement =>
    rows.length === 0 ? (
      <EmptyState
        icon={ClipboardList}
        title="No orders here"
        description={
          rows === orders
            ? 'Add customer stops so plans can be built against real demand.'
            : 'Nothing matches this filter right now.'
        }
      />
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ref</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Priority</TableHead>
            <TableHead className="text-right">Window</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead>Location</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium">
                {o.ref}
                {o.region && <span className="text-muted-foreground ml-2 text-xs">{o.region}</span>}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{o.kind}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[o.status]}>{o.status}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{o.priority}</TableCell>
              <TableCell className="text-right tabular-nums">
                {o.windowStart === null && o.windowEnd === null
                  ? '—'
                  : `${o.windowStart ?? '—'}–${o.windowEnd ?? '—'}`}
              </TableCell>
              <TableCell className="text-right tabular-nums">{o.quantity ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground max-w-40 truncate text-sm">
                {o.lat !== null && o.lng !== null ? `${o.lat.toFixed(4)}, ${o.lng.toFixed(4)}` : 'no location'}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {o.status === 'exception' && (
                  <Button size="sm" variant="ghost" onClick={() => void markPlanned(o.id)}>
                    Mark planned
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => void deleteOrder(o.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

  return (
    <div className="space-y-4 overflow-auto p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-muted-foreground text-sm">
            Customer stops and pickups with service windows. Exceptions are written back by simulate.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>New order</Button>
      </div>

      {(error || actionError) && (
        <Card className="border-destructive/40">
          <CardContent className="py-3 text-destructive text-sm">{error ?? actionError}</CardContent>
        </Card>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
          <TabsTrigger value="unassigned">Unassigned ({filtered('unassigned').length})</TabsTrigger>
          <TabsTrigger value="planned">Planned ({filtered('planned').length})</TabsTrigger>
          <TabsTrigger value="exception">Exceptions ({filtered('exception').length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">{renderTable(orders)}</TabsContent>
        <TabsContent value="unassigned" className="mt-4">{renderTable(filtered('unassigned'))}</TabsContent>
        <TabsContent value="planned" className="mt-4">{renderTable(filtered('planned'))}</TabsContent>
        <TabsContent value="exception" className="mt-4">{renderTable(filtered('exception'))}</TabsContent>
      </Tabs>

      <OrderDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={submitOrder} />
    </div>
  );
}

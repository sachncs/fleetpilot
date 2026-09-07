'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import type { WindowViolation } from '@/lib/simulate/writeback';

interface OrderOption {
  id: string;
  ref: string;
  status: string;
}

export interface ReportExceptionDialogProps {
  violation: WindowViolation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReported: () => void;
}

/** Pick which registry order a playback violation belongs to, then write it back. */
export function ReportExceptionDialog({
  violation,
  open,
  onOpenChange,
  onReported,
}: ReportExceptionDialogProps): React.ReactElement {
  const [orders, setOrders] = React.useState<OrderOption[] | null>(null);
  const [filter, setFilter] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setOrders(null);
    setSelectedId(null);
    setFilter('');
    setError(null);
    void (async () => {
      try {
        const res = await fetch('/api/orders?limit=200', {
          headers: { Authorization: `Bearer ${localStorage.getItem('fleetpilot_api_key') ?? ''}` },
        });
        if (!res.ok) throw new Error('Could not load orders');
        const data = (await res.json()) as { orders: OrderOption[] };
        setOrders(data.orders);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load orders');
      }
    })();
  }, [open]);

  const submit = async (): Promise<void> => {
    if (!violation || !selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${selectedId}/exceptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('fleetpilot_api_key') ?? ''}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          nodeId: violation.nodeId,
          kind: violation.kind,
          arrival: violation.arrival,
          windowStart: violation.windowStart,
          windowEnd: violation.windowEnd,
          reportedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Writeback failed (${res.status})`);
      }
      onOpenChange(false);
      onReported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Writeback failed');
    } finally {
      setBusy(false);
    }
  };

  const visible = (orders ?? []).filter((o) => o.ref.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Report exception</DialogTitle>
          <DialogDescription>
            Choose the order this {violation?.kind ?? ''} arrival at node {violation?.nodeId ?? '—'} applies
            to. The order is flagged for follow-up.
          </DialogDescription>
        </DialogHeader>
        <Input placeholder="Filter by reference…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div className="max-h-56 space-y-1 overflow-auto">
          {orders === null && !error && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              <Loader2 className="mr-1 inline animate-spin" /> Loading orders…
            </p>
          )}
          {visible.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setSelectedId(o.id)}
              className={`flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs ${
                selectedId === o.id ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <span className="font-medium">{o.ref}</span>
              <span className="text-muted-foreground">{o.status}</span>
            </button>
          ))}
          {orders !== null && visible.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No orders match. Create registry orders first.
            </p>
          )}
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!selectedId || busy} onClick={() => void submit()}>
            {busy && <Loader2 className="animate-spin" />}
            Flag exception
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

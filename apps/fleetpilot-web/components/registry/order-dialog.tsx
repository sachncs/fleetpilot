'use client';

import * as React from 'react';
import { Loader2, MapPin } from 'lucide-react';

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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { PlaceSearchBar } from '@/components/map/place-search-bar';

export interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    ref: string;
    kind: 'delivery' | 'pickup' | 'pair';
    pairRefId: string | null;
    priority: number;
    quantity: number | null;
    windowStart: string | null;
    windowEnd: string | null;
    processingMin: number | null;
    lat: number;
    lng: number;
    region: string | null;
    notes: string | null;
  }) => Promise<void>;
}

/**
 * Coordinates come exclusively from the address search — no manual
 * lat/lng entry anywhere in the console. Windows are HH:MM strings.
 */
export function OrderDialog({ open, onOpenChange, onSubmit }: OrderDialogProps): React.ReactElement {
  const [ref, setRef] = React.useState('');
  const [kind, setKind] = React.useState<'delivery' | 'pickup' | 'pair'>('delivery');
  const [pairRefId, setPairRefId] = React.useState('');
  const [priority, setPriority] = React.useState('3');
  const [quantity, setQuantity] = React.useState('');
  const [windowStart, setWindowStart] = React.useState('');
  const [windowEnd, setWindowEnd] = React.useState('');
  const [processingMin, setProcessingMin] = React.useState('');
  const [region, setRegion] = React.useState('');
  const [picked, setPicked] = React.useState<{ displayName: string; lat: number; lng: number } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reset = (): void => {
    setRef('');
    setKind('delivery');
    setPairRefId('');
    setPriority('3');
    setQuantity('');
    setWindowStart('');
    setWindowEnd('');
    setProcessingMin('');
    setRegion('');
    setPicked(null);
    setError(null);
  };

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!ref.trim() || !picked) return;
    if (kind === 'pair' && !pairRefId.trim()) {
      setError('Paired orders need the paired order reference');
      return;
    }
    if (windowStart && windowEnd && windowStart > windowEnd) {
      setError('Window start is after window end');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        ref: ref.trim(),
        kind,
        pairRefId: pairRefId.trim() === '' ? null : pairRefId.trim(),
        priority: Number(priority),
        quantity: quantity === '' ? null : Number(quantity),
        windowStart: windowStart === '' ? null : windowStart,
        windowEnd: windowEnd === '' ? null : windowEnd,
        processingMin: processingMin === '' ? null : Number(processingMin),
        lat: picked.lat,
        lng: picked.lng,
        region: region.trim() === '' ? null : region.trim(),
        notes: null,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New order</DialogTitle>
          <DialogDescription>
            Registry entry. Set a time window to have simulate flag late arrivals.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ord-ref">Reference</Label>
              <Input id="ord-ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="ORD-1042" required />
            </div>
            <div className="space-y-1">
              <Label>Kind</Label>
              <Select
                value={kind}
                onValueChange={(v) => {
                  if (v !== 'pair') setPairRefId('');
                  setKind(v as typeof kind);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="pair">Pair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {kind === 'pair' && (
              <div className="col-span-2 space-y-1">
                <Label htmlFor="ord-pair">Paired order ref</Label>
                <Input id="ord-pair" value={pairRefId} onChange={(e) => setPairRefId(e.target.value)} placeholder="ORD-1041" />
              </div>
            )}
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ord-qty">Quantity</Label>
              <Input id="ord-qty" type="number" step="0.1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ord-ws">Window start</Label>
              <Input id="ord-ws" type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ord-we">Window end</Label>
              <Input id="ord-we" type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ord-proc">Service time (min)</Label>
              <Input id="ord-proc" type="number" value={processingMin} onChange={(e) => setProcessingMin(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ord-region">Region</Label>
              <Input id="ord-region" value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <PlaceSearchBar onPick={setPicked} />
            {picked && (
              <p className="text-muted-foreground flex items-start gap-1 text-xs">
                <MapPin className="mt-0.5 size-3 shrink-0" />
                <span className="line-clamp-2">{picked.displayName}</span>
              </p>
            )}
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!ref.trim() || !picked || busy}>
              {busy && <Loader2 className="animate-spin" />}
              Create order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

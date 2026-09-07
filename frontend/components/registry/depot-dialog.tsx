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

import { PlaceSearchBar } from '@/components/map/place-search-bar';

export interface DepotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    name: string;
    lat: number;
    lng: number;
    region: string | null;
    notes: string | null;
  }) => Promise<void>;
}

/**
 * Coordinates come exclusively from the address search — there is no
 * manual lat/lng entry anywhere in the console.
 */
export function DepotDialog({ open, onOpenChange, onSubmit }: DepotDialogProps): React.ReactElement {
  const [name, setName] = React.useState('');
  const [region, setRegion] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [picked, setPicked] = React.useState<{ displayName: string; lat: number; lng: number } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reset = (): void => {
    setName('');
    setRegion('');
    setNotes('');
    setPicked(null);
    setError(null);
  };

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim() || !picked) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        lat: picked.lat,
        lng: picked.lng,
        region: region.trim() === '' ? null : region.trim(),
        notes: notes.trim() === '' ? null : notes.trim(),
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New station</DialogTitle>
          <DialogDescription>Find the location by address — coordinates are set from the match.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="dep-name">Name</Label>
            <Input id="dep-name" value={name} onChange={(e) => setName(e.target.value)} required />
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="dep-region">Region</Label>
              <Input id="dep-region" value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dep-notes">Notes</Label>
              <Input id="dep-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !picked || busy}>
              {busy && <Loader2 className="animate-spin" />}
              Create station
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

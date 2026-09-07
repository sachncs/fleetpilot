'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface DepotOption {
  id: string;
  name: string;
}

export interface VehicleDialogValues {
  name: string;
  status: 'active' | 'maintenance' | 'retired';
  capacityKg: string;
  costPerKm: string;
  co2PerKm: string;
  depotId: string;
  region: string;
  notes: string;
}

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  status: z.enum(['active', 'maintenance', 'retired']),
  capacityKg: z.string().refine((v) => v === '' || (Number(v) >= 0 && Number.isInteger(Number(v))), 'Whole kg ≥ 0'),
  costPerKm: z.string().refine((v) => v === '' || Number(v) >= 0, '≥ 0'),
  co2PerKm: z.string().refine((v) => v === '' || Number(v) >= 0, '≥ 0'),
  depotId: z.string(),
  region: z.string().max(100),
  notes: z.string().max(2000),
});

export interface VehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depots: DepotOption[];
  initial?: Partial<VehicleDialogValues> & { id?: string };
  onSubmit: (values: {
    name: string;
    status: VehicleDialogValues['status'];
    capacityKg: number | null;
    costPerKm: number | null;
    co2PerKm: number | null;
    depotId: string | null;
    region: string | null;
    notes: string | null;
  }) => Promise<void>;
}

function toPayload(v: VehicleDialogValues) {
  return {
    name: v.name.trim(),
    status: v.status,
    capacityKg: v.capacityKg === '' ? null : Number(v.capacityKg),
    costPerKm: v.costPerKm === '' ? null : Number(v.costPerKm),
    co2PerKm: v.co2PerKm === '' ? null : Number(v.co2PerKm),
    depotId: v.depotId === 'none' ? null : v.depotId || null,
    region: v.region.trim() === '' ? null : v.region.trim(),
    notes: v.notes.trim() === '' ? null : v.notes.trim(),
  };
}

export function VehicleDialog({
  open,
  onOpenChange,
  depots,
  initial,
  onSubmit,
}: VehicleDialogProps): React.ReactElement {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<VehicleDialogValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      status: initial?.status ?? 'active',
      capacityKg: initial?.capacityKg ?? '',
      costPerKm: initial?.costPerKm ?? '',
      co2PerKm: initial?.co2PerKm ?? '',
      depotId: initial?.depotId ?? 'none',
      region: initial?.region ?? '',
      notes: initial?.notes ?? '',
    },
  });

  const submit = form.handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(toPayload(values));
      onOpenChange(false);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? 'Edit vehicle' : 'New vehicle'}</DialogTitle>
          <DialogDescription>
            Registry entries feed planning workflows; they are not modified by runs.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="veh-name">Name</Label>
              <Input id="veh-name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <ControllerSelect
                value={form.watch('status')}
                onChange={(v) => form.setValue('status', v as VehicleDialogValues['status'])}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'maintenance', label: 'Maintenance' },
                  { value: 'retired', label: 'Retired' },
                ]}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="veh-depot">Station</Label>
              <ControllerSelect
                value={form.watch('depotId') || 'none'}
                onChange={(v) => form.setValue('depotId', v)}
                options={[{ value: 'none', label: 'Unassigned' }, ...depots.map((d) => ({ value: d.id, label: d.name }))]}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="veh-cap">Capacity (kg)</Label>
              <Input id="veh-cap" type="number" {...form.register('capacityKg')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="veh-region">Region</Label>
              <Input id="veh-region" {...form.register('region')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="veh-cost">Cost per km</Label>
              <Input id="veh-cost" type="number" step="0.01" {...form.register('costPerKm')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="veh-co2">CO₂e per km (kg)</Label>
              <Input id="veh-co2" type="number" step="0.01" {...form.register('co2PerKm')} />
            </div>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {initial?.id ? 'Save changes' : 'Create vehicle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Thin wrapper because RHF register() and shadcn Select don't compose. */
function ControllerSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}): React.ReactElement {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

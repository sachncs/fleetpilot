'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Route, Truck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

interface DepotOption {
  id: string;
  name: string;
}

interface VehicleOption {
  id: string;
  name: string;
  status: 'active' | 'maintenance' | 'retired';
  capacityKg: number | null;
  depotId: string | null;
}

export interface RegistryPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderIds: string[];
  onCreated: () => Promise<void> | void;
}

function headers(): HeadersInit {
  return { Authorization: `Bearer ${localStorage.getItem('fleetpilot_api_key') ?? 'fp_public_console'}` };
}

export function RegistryPlanDialog({
  open,
  onOpenChange,
  orderIds,
  onCreated,
}: RegistryPlanDialogProps): React.ReactElement {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [depots, setDepots] = React.useState<DepotOption[]>([]);
  const [vehicles, setVehicles] = React.useState<VehicleOption[]>([]);
  const [depotId, setDepotId] = React.useState('');
  const [vehicleIds, setVehicleIds] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(`Dispatch plan · ${new Date().toLocaleDateString()}`);
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [depotRes, fleetRes] = await Promise.all([
          fetch('/api/depots?limit=200', { headers: headers() }),
          fetch('/api/fleet?status=active&limit=200', { headers: headers() }),
        ]);
        if (!depotRes.ok || !fleetRes.ok) throw new Error('Could not load depots and fleet.');
        const depotData = (await depotRes.json()) as { depots: DepotOption[] };
        const fleetData = (await fleetRes.json()) as { fleet: VehicleOption[] };
        setDepots(depotData.depots);
        setVehicles(fleetData.fleet);
        const firstDepot = depotData.depots[0]?.id ?? '';
        setDepotId(firstDepot);
        setVehicleIds(
          new Set(
            fleetData.fleet
              .filter((vehicle) => vehicle.capacityKg !== null && vehicle.capacityKg > 0)
              .filter((vehicle) => !firstDepot || !vehicle.depotId || vehicle.depotId === firstDepot)
              .map((vehicle) => vehicle.id),
          ),
        );
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Could not load planning resources.');
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const eligibleVehicles = React.useMemo(
    () => vehicles.filter((vehicle) => !depotId || !vehicle.depotId || vehicle.depotId === depotId),
    [vehicles, depotId],
  );

  React.useEffect(() => {
    setVehicleIds((current) => new Set([...current].filter((id) => eligibleVehicles.some((vehicle) => vehicle.id === id))));
  }, [eligibleVehicles]);

  const toggleVehicle = (id: string, checked: boolean): void => {
    setVehicleIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const create = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/scenarios/from-registry', {
        method: 'POST',
        headers: { ...headers(), 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), depotId, orderIds, vehicleIds: [...vehicleIds] }),
      });
      const data = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!response.ok || !data.id) throw new Error(data.error ?? `Plan creation failed (${response.status})`);
      localStorage.setItem('fleetpilot:last-scenario', data.id);
      await onCreated();
      onOpenChange(false);
      router.push(`/optimize?problem=${encodeURIComponent(data.id)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Plan creation failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Route className="size-5" /> Create dispatch plan</DialogTitle>
          <DialogDescription>
            Turn {orderIds.length} selected deliver{orderIds.length === 1 ? 'y' : 'ies'} into a route plan using real vehicle capacity and costs.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
            <Loader2 className="size-4 animate-spin" /> Loading planning resources…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Plan name</Label>
              <Input id="plan-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Dispatch depot</Label>
              <Select value={depotId} onValueChange={setDepotId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose a depot" /></SelectTrigger>
                <SelectContent>
                  {depots.map((depot) => <SelectItem key={depot.id} value={depot.id}>{depot.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Active vehicles</Label>
                <span className="text-muted-foreground text-xs">{vehicleIds.size} selected</span>
              </div>
              <div className="max-h-52 space-y-1 overflow-auto rounded-md border p-2">
                {eligibleVehicles.map((vehicle) => {
                  const ready = vehicle.capacityKg !== null && vehicle.capacityKg > 0;
                  return (
                    <label key={vehicle.id} className="hover:bg-muted flex items-center gap-3 rounded-md p-2 text-sm">
                      <Checkbox
                        checked={vehicleIds.has(vehicle.id)}
                        disabled={!ready}
                        onCheckedChange={(value) => toggleVehicle(vehicle.id, value === true)}
                      />
                      <Truck className="text-muted-foreground size-4" />
                      <span className="flex-1 font-medium">{vehicle.name}</span>
                      <span className={ready ? 'text-muted-foreground text-xs' : 'text-destructive text-xs'}>
                        {ready ? `${vehicle.capacityKg!.toLocaleString()} kg` : 'capacity required'}
                      </span>
                    </label>
                  );
                })}
                {eligibleVehicles.length === 0 && (
                  <p className="text-muted-foreground py-5 text-center text-sm">No active vehicles are available at this depot.</p>
                )}
              </div>
            </div>
            {depots.length === 0 && <p className="text-destructive text-sm">Create a depot under Vehicles & depots before planning.</p>}
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={loading || busy || !name.trim() || !depotId || vehicleIds.size === 0 || orderIds.length === 0}
            onClick={() => void create()}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Route />}
            Create and optimize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

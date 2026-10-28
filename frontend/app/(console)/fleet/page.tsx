'use client';

import * as React from 'react';
import { Plus, Truck } from 'lucide-react';

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

import { VehicleDialog, type DepotOption } from '@/components/registry/vehicle-dialog';
import { DepotDialog } from '@/components/registry/depot-dialog';
import { ConfirmActionDialog } from '@/components/shared/confirm-action-dialog';

interface VehicleRow {
  id: string;
  name: string;
  status: 'active' | 'maintenance' | 'retired';
  capacityKg: number | null;
  costPerKm: number | null;
  co2PerKm: number | null;
  depotId: string | null;
  region: string | null;
  notes?: string | null;
}

interface DepotRow {
  id: string;
  name: string;
  lat: number;
  lng: number;
  region: string | null;
}

const POLL_MS = 30_000;

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${localStorage.getItem('fleetpilot_api_key') ?? 'fp_public_console'}`,
    'content-type': 'application/json',
  };
}

function statusVariant(status: VehicleRow['status']): 'default' | 'secondary' | 'destructive' {
  if (status === 'active') return 'default';
  if (status === 'maintenance') return 'destructive';
  return 'secondary';
}

export default function FleetPage(): React.ReactElement {
  const [vehicles, setVehicles] = React.useState<VehicleRow[]>([]);
  const [depots, setDepots] = React.useState<DepotRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [vehicleDialogOpen, setVehicleDialogOpen] = React.useState(false);
  const [editingVehicle, setEditingVehicle] = React.useState<VehicleRow | null>(null);
  const [depotDialogOpen, setDepotDialogOpen] = React.useState(false);
  const [editingDepot, setEditingDepot] = React.useState<DepotRow | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = React.useState<VehicleRow | null>(null);
  const [depotToDelete, setDepotToDelete] = React.useState<DepotRow | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        fetch('/api/fleet?limit=200', { headers: authHeaders() }),
        fetch('/api/depots?limit=200', { headers: authHeaders() }),
      ]);
      if (!vRes.ok || !dRes.ok) throw new Error('Registry load failed');
      const vData = (await vRes.json()) as { fleet: VehicleRow[] };
      const dData = (await dRes.json()) as { depots: DepotRow[] };
      setVehicles(vData.fleet);
      setDepots(dData.depots);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registry load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const depotName = (id: string | null): string =>
    id ? (depots.find((d) => d.id === id)?.name ?? '—') : '—';

  const submitVehicle = async (values: Parameters<React.ComponentProps<typeof VehicleDialog>['onSubmit']>[0]) => {
    const res = editingVehicle
      ? await fetch(`/api/fleet/${editingVehicle.id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(values),
        })
      : await fetch('/api/fleet', {
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

  const deleteVehicle = async (id: string): Promise<void> => {
    setActionError(null);
    const res = await fetch(`/api/fleet/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `Delete failed (${res.status})`);
    }
    await load();
  };

  const submitDepot = async (values: { name: string; lat: number; lng: number; region: string | null; notes: string | null }) => {
    const res = await fetch(editingDepot ? `/api/depots/${editingDepot.id}` : '/api/depots', {
      method: editingDepot ? 'PATCH' : 'POST',
      headers: authHeaders(),
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `Save failed (${res.status})`);
    }
    await load();
  };

  const deleteDepot = async (id: string): Promise<void> => {
    setActionError(null);
    const res = await fetch(`/api/depots/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error === undefined ? `Delete failed (${res.status})` : data.error);
    }
    await load();
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const depotOptions: DepotOption[] = depots.map((d) => ({ id: d.id, name: d.name }));

  return (
    <div className="space-y-4 overflow-auto p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground mb-1 font-mono text-[10px] uppercase tracking-[0.16em]">Resources</p>
          <h1 className="text-3xl font-medium tracking-[-0.04em]">Vehicles & depots</h1>
          <p className="text-muted-foreground text-sm">
            Keep the available fleet, capacity, operating cost, and dispatch locations ready for planning.
          </p>
        </div>
      </div>

      {(error || actionError) && (
        <Card className="border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">{error ?? actionError}</CardContent>
        </Card>
      )}

      <Tabs defaultValue="vehicles">
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="vehicles">Vehicles ({vehicles.length})</TabsTrigger>
            <TabsTrigger value="stations">Depots ({depots.length})</TabsTrigger>
          </TabsList>
          <TabActions
            onNewVehicle={() => {
              setEditingVehicle(null);
              setVehicleDialogOpen(true);
            }}
            onNewStation={() => { setEditingDepot(null); setDepotDialogOpen(true); }}
          />
        </div>

        <TabsContent value="vehicles" className="mt-4">
          {vehicles.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No vehicles yet"
              description="Add the trucks you operate so planning can draw from a real roster."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Depot</TableHead>
                  <TableHead className="text-right">Capacity</TableHead>
                  <TableHead className="text-right">Cost/km</TableHead>
                  <TableHead className="text-right">CO₂e/km</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      {v.name}
                      {v.region && (
                        <span className="text-muted-foreground ml-2 text-xs">{v.region}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(v.status)}>{v.status}</Badge>
                    </TableCell>
                    <TableCell>{depotName(v.depotId)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {v.capacityKg !== null ? `${v.capacityKg.toLocaleString()} kg` : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{v.costPerKm ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{v.co2PerKm ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingVehicle(v);
                          setVehicleDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setVehicleToDelete(v)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="stations" className="mt-4">
          {depots.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No depots yet"
              description="Depots anchor your network—search an address to place the first one."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Coordinates</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {depots.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.region ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {d.lat.toFixed(5)}, {d.lng.toFixed(5)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingDepot(d); setDepotDialogOpen(true); }}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDepotToDelete(d)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <VehicleDialog
        open={vehicleDialogOpen}
        onOpenChange={setVehicleDialogOpen}
        depots={depotOptions}
        initial={
          editingVehicle
            ? {
                id: editingVehicle.id,
                name: editingVehicle.name,
                status: editingVehicle.status,
                capacityKg: editingVehicle.capacityKg?.toString() ?? '',
                costPerKm: editingVehicle.costPerKm?.toString() ?? '',
                co2PerKm: editingVehicle.co2PerKm?.toString() ?? '',
                depotId: editingVehicle.depotId ?? 'none',
                region: editingVehicle.region ?? '',
                notes: '',
              }
            : undefined
        }
        onSubmit={submitVehicle}
      />
      <DepotDialog open={depotDialogOpen} onOpenChange={setDepotDialogOpen} initial={editingDepot ?? undefined} onSubmit={submitDepot} />
      <ConfirmActionDialog
        open={vehicleToDelete !== null}
        onOpenChange={(next) => !next && setVehicleToDelete(null)}
        title="Delete vehicle?"
        description={`Remove ${vehicleToDelete?.name ?? 'this vehicle'} from the fleet? Saved plans remain available.`}
        onConfirm={async () => {
          if (!vehicleToDelete) return;
          await deleteVehicle(vehicleToDelete.id);
          setVehicleToDelete(null);
        }}
      />
      <ConfirmActionDialog
        open={depotToDelete !== null}
        onOpenChange={(next) => !next && setDepotToDelete(null)}
        title="Delete depot?"
        description={`Remove ${depotToDelete?.name ?? 'this depot'}? Reassign its vehicles first.`}
        onConfirm={async () => {
          if (!depotToDelete) return;
          await deleteDepot(depotToDelete.id);
          setDepotToDelete(null);
        }}
      />
    </div>
  );
}

function TabActions({
  onNewVehicle,
  onNewStation,
}: {
  onNewVehicle: () => void;
  onNewStation: () => void;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={onNewStation}>
        <Plus /> New depot
      </Button>
      <Button size="sm" onClick={onNewVehicle}>
        <Plus /> New vehicle
      </Button>
    </div>
  );
}

'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { useProblemStore } from '@/lib/problem-store';
import type { Vehicle } from '@/lib/problem-schema';

export function VehicleForm(): React.ReactElement {
  const problem = useProblemStore((s) => s.problem);
  const setProblem = useProblemStore((s) => s.setProblem);

  const updateVehicle = (idx: number, patch: Partial<Vehicle>): void => {
    if (!problem) return;
    const vehicles = problem.vehicles.map((v, i) => (i === idx ? { ...v, ...patch } : v));
    setProblem({ ...problem, vehicles });
  };

  const removeVehicle = (idx: number): void => {
    if (!problem) return;
    setProblem({ ...problem, vehicles: problem.vehicles.filter((_, i) => i !== idx) });
  };

  const addVehicle = (): void => {
    if (!problem) return;
    const depot = problem.depotNodeId;
    const newId = (problem.vehicles.reduce((m, v) => Math.max(m, v.id), 0) ?? 0) + 1;
    setProblem({
      ...problem,
      vehicles: [
        ...problem.vehicles,
        { id: newId, capacity: 100, startDepotId: depot, endDepotId: depot },
      ],
    });
  };

  if (!problem)
    return (
      <Card>
        <CardContent className="text-sm text-muted-foreground">No problem yet.</CardContent>
      </Card>
    );

  const nodeOptions = (
    Array.isArray(problem.nodes) ? problem.nodes : Object.values(problem.nodes)
  ).map((n) => ({ id: n.id, name: n.name ?? `Node ${n.id}` }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Vehicles</CardTitle>
        <Button size="sm" variant="outline" onClick={addVehicle}>
          <Plus className="mr-1 h-3 w-3" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {problem.vehicles.length === 0 && (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            No vehicles yet.
          </div>
        )}
        {problem.vehicles.map((v, idx) => (
          <div key={v.id} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">Vehicle #{v.id}</Badge>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeVehicle(idx)}
                aria-label="Remove vehicle"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Capacity</Label>
                <Input
                  type="number"
                  value={v.capacity}
                  onChange={(e) => updateVehicle(idx, { capacity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">Cost/km</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={v.costPerKm ?? 1}
                  onChange={(e) => updateVehicle(idx, { costPerKm: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">CO₂/kg/km</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={v.co2PerKm ?? 1}
                  onChange={(e) => updateVehicle(idx, { co2PerKm: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Start depot</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  value={v.startDepotId ?? problem.depotNodeId}
                  onChange={(e) => updateVehicle(idx, { startDepotId: Number(e.target.value) })}
                >
                  {nodeOptions.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">End depot</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  value={v.endDepotId ?? v.startDepotId ?? problem.depotNodeId}
                  onChange={(e) => updateVehicle(idx, { endDepotId: Number(e.target.value) })}
                >
                  {nodeOptions.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
      <Separator />
    </Card>
  );
}

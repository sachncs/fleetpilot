'use client';

import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';

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
    const newId = (problem.vehicles.reduce((m, v) => Math.max(m, v.id), 0) ?? 0) + 1;
    setProblem({
      ...problem,
      vehicles: [...problem.vehicles, { id: newId, capacity: 100 }],
    });
  };

  if (!problem) return <Card><CardContent className="text-sm text-muted-foreground">No problem yet.</CardContent></Card>;

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
          <div key={v.id} className="flex items-end gap-2 rounded-md border p-3">
            <Badge variant="secondary">#{v.id}</Badge>
            <div className="flex-1">
              <Label className="text-xs">Capacity</Label>
              <Input
                type="number"
                value={v.capacity}
                onChange={(e) => updateVehicle(idx, { capacity: Number(e.target.value) })}
              />
            </div>
            <div className="w-24">
              <Label className="text-xs">Cost/km</Label>
              <Input
                type="number"
                value={v.costPerKm ?? 1}
                onChange={(e) => updateVehicle(idx, { costPerKm: Number(e.target.value) })}
              />
            </div>
            <div className="w-24">
              <Label className="text-xs">CO₂/kg/km</Label>
              <Input
                type="number"
                step="0.01"
                value={v.co2PerKm ?? 1}
                onChange={(e) => updateVehicle(idx, { co2PerKm: Number(e.target.value) })}
              />
            </div>
            <Button size="icon" variant="ghost" onClick={() => removeVehicle(idx)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </CardContent>
      <Separator />
    </Card>
  );
}

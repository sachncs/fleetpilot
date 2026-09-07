'use client';

import * as React from 'react';
import { Plus, Trash2, X } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { useProblemStore } from '@/lib/problem-store';
import type { Customer } from '@/lib/problem-schema';

const TIME_WINDOW_FIELDS = [
  { key: 'earliestDeliveryTime', label: 'Earliest delivery' },
  { key: 'latestDeliveryTime', label: 'Latest delivery' },
  { key: 'earliestPickupTime', label: 'Earliest pickup' },
  { key: 'latestPickupTime', label: 'Latest pickup' },
] as const;

type TimeWindowKey = (typeof TIME_WINDOW_FIELDS)[number]['key'];

export function CustomerForm(): React.ReactElement {
  const problem = useProblemStore((s) => s.problem);
  const setProblem = useProblemStore((s) => s.setProblem);

  const nodes = React.useMemo(() => {
    if (!problem) return [] as Array<{ id: number; name: string }>;
    const list = Array.isArray(problem.nodes) ? problem.nodes : Object.values(problem.nodes);
    return list.map((n) => ({ id: n.id, name: n.name ?? `Node ${n.id}` }));
  }, [problem]);

  const updateCustomer = (idx: number, patch: Partial<Customer>): void => {
    if (!problem) return;
    const customers = problem.customers.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    setProblem({ ...problem, customers });
  };

  const clearTimeWindow = (idx: number, key: TimeWindowKey): void => {
    const customers = [...(problem?.customers ?? [])];
    const existing = customers[idx];
    if (!existing) return;
    const next = { ...existing };
    delete next[key];
    customers[idx] = next;
    if (problem) setProblem({ ...problem, customers });
  };

  const removeCustomer = (idx: number): void => {
    if (!problem) return;
    const customers = problem.customers.filter((_, i) => i !== idx);
    setProblem({ ...problem, customers });
  };

  const addCustomer = (): void => {
    if (!problem) return;
    const nodeList = Array.isArray(problem.nodes) ? problem.nodes : Object.values(problem.nodes);
    const nonDepotNodes = nodeList.filter((n) => n.id !== problem.depotNodeId);
    if (nonDepotNodes.length < 2) {
      alert('Add at least 2 non-depot nodes on the map first.');
      return;
    }
    const n1 = nonDepotNodes[0]?.id ?? 0;
    const n2 = nonDepotNodes[1]?.id ?? 0;
    const newId = (problem.customers.reduce((m, c) => Math.max(m, c.id), 0) ?? 0) + 1;
    setProblem({
      ...problem,
      customers: [
        ...problem.customers,
        { id: newId, deliveryNodeId: n1, pickupNodeId: n2, processingTime: 10 },
      ],
    });
  };

  if (!problem)
    return (
      <Card>
        <CardContent className="text-sm text-muted-foreground">No problem yet.</CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Customers</CardTitle>
        <Button size="sm" variant="outline" onClick={addCustomer}>
          <Plus className="mr-1 h-3 w-3" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {problem.customers.length === 0 && (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            No customers yet. Click a node and use &quot;Drop here&quot; / &quot;Pickup here&quot;
            to add one, or press Add.
          </div>
        )}
        {problem.customers.map((c, idx) => {
          const hasAnyTw = TIME_WINDOW_FIELDS.some((f) => c[f.key] !== undefined);
          return (
            <div key={c.id} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">Customer #{c.id}</Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeCustomer(idx)}
                  aria-label="Remove customer"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Delivery node</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                    value={c.deliveryNodeId}
                    onChange={(e) =>
                      updateCustomer(idx, { deliveryNodeId: Number(e.target.value) })
                    }
                  >
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Pickup node</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                    value={c.pickupNodeId}
                    onChange={(e) => updateCustomer(idx, { pickupNodeId: Number(e.target.value) })}
                  >
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Processing (min)</Label>
                  <Input
                    type="number"
                    value={c.processingTime}
                    onChange={(e) =>
                      updateCustomer(idx, { processingTime: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="flex items-end text-xs text-muted-foreground">ID: {c.id}</div>
              </div>
              <details className="text-xs" open={hasAnyTw}>
                <summary className="cursor-pointer select-none text-muted-foreground">
                  Time windows
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {TIME_WINDOW_FIELDS.map((f) => {
                    const value = c[f.key];
                    return (
                      <div key={f.key} className="flex items-end gap-1">
                        <div className="flex-1">
                          <Label className="text-xs">{f.label}</Label>
                          <Input
                            type="number"
                            value={value ?? ''}
                            placeholder="min"
                            onChange={(e) => {
                              const v = e.target.value === '' ? undefined : Number(e.target.value);
                              updateCustomer(idx, { [f.key]: v } as Partial<Customer>);
                            }}
                          />
                        </div>
                        {value !== undefined && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => clearTimeWindow(idx, f.key)}
                            aria-label={`Clear ${f.label}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>
          );
        })}
      </CardContent>
      <Separator />
    </Card>
  );
}

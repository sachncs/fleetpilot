'use client';

import * as React from 'react';
import { Trash2, Star, ArrowRight, Plus, X } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { useProblemStore } from '@/lib/problem-store';
import type { Customer } from '@/lib/problem-schema';

export interface NodeActionsPanelProps {
  selectedNodeId: number | null;
  onSelectNode: (id: number | null) => void;
}

export function NodeActionsPanel({
  selectedNodeId,
  onSelectNode,
}: NodeActionsPanelProps): React.ReactElement {
  const problem = useProblemStore((s) => s.problem);
  const setProblem = useProblemStore((s) => s.setProblem);

  if (!problem || selectedNodeId === null) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Selected node</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Click a node on the map to set it as the depot, rename it, or drop a customer there. Click
          the map (not a node) to add a new node.
        </CardContent>
      </Card>
    );
  }

  const nodeList = Array.isArray(problem.nodes) ? problem.nodes : Object.values(problem.nodes);
  const node = nodeList.find((n) => n.id === selectedNodeId);
  if (!node) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Selected node</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The selected node no longer exists. Pick another.
        </CardContent>
      </Card>
    );
  }

  const isDepot = node.id === problem.depotNodeId;
  const usedAsDelivery = problem.customers.some((c) => c.deliveryNodeId === node.id);
  const usedAsPickup = problem.customers.some((c) => c.pickupNodeId === node.id);

  const renameNode = (newName: string): void => {
    const nodes = nodeList.map((n) => (n.id === node.id ? { ...n, name: newName } : n));
    setProblem({ ...problem, nodes });
  };

  const setAsDepot = (): void => {
    setProblem({ ...problem, depotNodeId: node.id });
  };

  const deleteNode = (): void => {
    // Block delete if this node is the depot or used by a customer.
    if (isDepot) {
      alert('This node is the depot. Promote another node to depot first.');
      return;
    }
    if (usedAsDelivery || usedAsPickup) {
      alert('This node is referenced by a customer. Remove or reassign that customer first.');
      return;
    }
    const nodes = nodeList.filter((n) => n.id !== node.id);
    setProblem({ ...problem, nodes });
    onSelectNode(null);
  };

  const quickAddCustomer = (kind: 'delivery' | 'pickup'): void => {
    const newId = (problem.customers.reduce((m, c) => Math.max(m, c.id), 0) ?? 0) + 1;
    const fallbackNode = nodeList.find((n) => n.id !== node.id) ?? nodeList[0];
    const fallbackId = fallbackNode?.id ?? node.id;
    const baseCustomer: Customer = {
      id: newId,
      deliveryNodeId: kind === 'delivery' ? node.id : fallbackId,
      pickupNodeId: kind === 'pickup' ? node.id : fallbackId,
      processingTime: 10,
    };
    setProblem({ ...problem, customers: [...problem.customers, baseCustomer] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          Node {node.id}
          {isDepot && <Badge variant="default">Depot</Badge>}
        </CardTitle>
        <Button size="icon" variant="ghost" onClick={() => onSelectNode(null)}>
          <X className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input
            value={node.name ?? `Node ${node.id}`}
            onChange={(e) => renameNode(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          ({node.x.toFixed(2)}, {node.y.toFixed(2)})
        </div>
        <div className="flex flex-wrap gap-2">
          {!isDepot && (
            <Button size="sm" variant="outline" onClick={setAsDepot}>
              <Star className="mr-1 h-3 w-3" /> Set as depot
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => quickAddCustomer('delivery')}>
            <ArrowRight className="mr-1 h-3 w-3" /> Drop here
          </Button>
          <Button size="sm" variant="outline" onClick={() => quickAddCustomer('pickup')}>
            <Plus className="mr-1 h-3 w-3" /> Pickup here
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {usedAsDelivery || usedAsPickup
            ? `Used as ${[usedAsDelivery && 'delivery', usedAsPickup && 'pickup'].filter(Boolean).join(' and ')} stop.`
            : 'Not yet linked to a customer.'}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={deleteNode}
          disabled={isDepot || usedAsDelivery || usedAsPickup}
        >
          <Trash2 className="mr-1 h-3 w-3" /> Delete node
        </Button>
      </CardContent>
    </Card>
  );
}

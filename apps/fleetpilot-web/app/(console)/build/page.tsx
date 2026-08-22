'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Hand,
  Loader2,
  MapPinPlus,
  Play,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { CustomerForm } from '@/components/problem/customer-form';
import { VehicleForm } from '@/components/problem/vehicle-form';
import { NodeActionsPanel } from '@/components/problem/node-actions-panel';
import { ScenarioHub } from '@/components/problem/scenario-hub';
import { SolveButton } from '@/components/solver/solve-button';
import type { MapTool } from '@/components/map/build-map';
import { PlaceSearchBar } from '@/components/map/place-search-bar';
import { useProblemStore } from '@/lib/problem-store';

const DynamicBuildMap = dynamic(
  () => import('@/components/map/build-map').then((m) => m.BuildMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-xl border bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

export default function BuildPage(): React.ReactElement {
  const problem = useProblemStore((s) => s.problem);
  const solution = useProblemStore((s) => s.solution);
  const status = useProblemStore((s) => s.status);
  const reset = useProblemStore((s) => s.reset);
  const [selectedNodeId, setSelectedNodeId] = React.useState<number | null>(null);
  const [tool, setTool] = React.useState<MapTool>('place');
  const [multiPlace, setMultiPlace] = React.useState(true);

  const nodeCount = problem ? (Array.isArray(problem.nodes) ? problem.nodes.length : Object.keys(problem.nodes).length) : 0;
  const customerCount = problem?.customers.length ?? 0;
  const vehicleCount = problem?.vehicles.length ?? 0;
  const canSimulate = solution !== null && solution.feasible;

  /** After a single placement (multi-place off), return to select mode. */
  const handleSelectNode = (id: number | null): void => {
    setSelectedNodeId(id);
    if (!multiPlace && tool === 'place') setTool('select');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Planning</h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{nodeCount} nodes</Badge>
            <Badge variant="outline">{customerCount} customers</Badge>
            <Badge variant="outline">{vehicleCount} vehicles</Badge>
            {solution && (
              <Badge variant={solution.feasible ? 'success' : 'destructive'}>
                {solution.feasible ? 'Solved' : 'Infeasible'}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {problem && (
            <Button size="sm" variant="ghost" onClick={reset}>
              <Trash2 className="mr-1 h-3 w-3" /> Clear
            </Button>
          )}
          <Button
            asChild
            size="sm"
            variant={canSimulate ? 'default' : 'secondary'}
            disabled={!canSimulate}
          >
            <Link href="/simulate">
              <Play className="mr-1 h-3 w-3" /> Simulate
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-4 border-b bg-background px-4 py-2">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={tool === 'select' ? 'secondary' : 'ghost'}
                aria-label="Select tool"
                onClick={() => setTool('select')}
              >
                <Hand />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Select and inspect markers</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={tool === 'place' ? 'secondary' : 'ghost'}
                aria-label="Place stop tool"
                onClick={() => setTool('place')}
              >
                <MapPinPlus />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Click the map to drop a stop</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="multi-place"
            checked={multiPlace}
            onCheckedChange={setMultiPlace}
            aria-label="Multi-place mode"
          />
          <Label htmlFor="multi-place" className="text-sm">
            Multi-place
          </Label>
        </div>

        <div className="ml-auto">
          <PlaceSearchBar
            onPick={(hit) => {
              // Search picks reuse the same placement pipeline; they always
              // place exactly one node regardless of the active tool.
              window.dispatchEvent(
                new CustomEvent('fleetpilot:place-at', {
                  detail: { lat: hit.lat, lng: hit.lng },
                }),
              );
              if (!multiPlace) setTool('select');
            }}
          />
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1fr_420px]">
        <div className="relative min-h-[400px]">
          <DynamicBuildMap
            tool={tool}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
          />
        </div>
        <div className="space-y-4 overflow-y-auto pr-1">
          {status === 'solving' && (
            <Card>
              <CardContent className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Solving…
              </CardContent>
            </Card>
          )}
          <NodeActionsPanel
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="setup">Scenario</TabsTrigger>
              <TabsTrigger value="entities">Entities</TabsTrigger>
            </TabsList>
            <TabsContent value="setup" className="space-y-4">
              <ScenarioHub />
              <SolveButton />
            </TabsContent>
            <TabsContent value="entities" className="space-y-4">
              <CustomerForm />
              <VehicleForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

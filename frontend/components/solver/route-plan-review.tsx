'use client';

import * as React from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { Check, Clock3, MapPin, Package, Truck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Map } from '@/components/map/map';
import { MapMarker } from '@/components/map/map-marker';
import { MapPolyline } from '@/components/map/map-polyline';
import { MapTileLayer } from '@/components/map/map-tile-layer';
import { MapFullscreenControl, MapZoomControl } from '@/components/ui/map';
import { metresToLatLng } from '@/lib/geo-utils';
import type { Problem } from '@/lib/problem-schema';
import type { SolverSolution } from '@/lib/problem-store';
import { cn } from '@/lib/utils';

function FitRouteBounds({ points }: { points: Array<[number, number]> }): null {
  const map = useMap();
  const signature = points.map((point) => point.join(',')).join('|');
  React.useEffect(() => {
    if (points.length === 1) map.setView(points[0]!, 12);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
  }, [map, signature]);
  return null;
}

function eta(minutes: number | undefined): string {
  if (minutes === undefined || !Number.isFinite(minutes)) return '—';
  const normalized = Math.max(0, Math.round(minutes)) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function stopMarker(sequence: number, selected: boolean): string {
  return `<div style="width:24px;height:24px;display:grid;place-items:center;border-radius:999px;background:${selected ? '#050505' : '#fff'};color:${selected ? '#fff' : '#111'};border:2px solid ${selected ? '#fff' : '#111'};box-shadow:0 2px 8px rgba(0,0,0,.25);font:600 10px ui-sans-serif">${sequence}</div>`;
}

interface ReviewRoute {
  vehicleId: number;
  vehicleName: string;
  routeIndex: number;
  path: Array<[number, number]>;
  stops: Array<{
    nodeId: number;
    name: string;
    orderRef: string;
    demand: number;
    eta?: number;
    position?: [number, number];
  }>;
  load: number;
  capacity: number;
  duration: number;
  distanceKm: number;
}

export function RoutePlanReview({ problem, solution }: { problem: Problem; solution: SolverSolution }): React.ReactElement {
  const nodes = Array.isArray(problem.nodes) ? problem.nodes : Object.values(problem.nodes);
  const nodeById = new globalThis.Map(nodes.map((node) => [node.id, node]));
  const customerByDelivery = new globalThis.Map(problem.customers.map((customer) => [customer.deliveryNodeId, customer]));
  const vehicleById = new globalThis.Map(problem.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const depot = nodeById.get(problem.depotNodeId);
  const origin = problem.referenceOrigin;
  const positionFor = (nodeId: number): [number, number] | undefined => {
    const node = nodeById.get(nodeId);
    if (!node || !origin) return undefined;
    return metresToLatLng(origin, node.x, node.y);
  };

  const routes: ReviewRoute[] = solution.routes
    .map((route, routeIndex) => {
      const vehicle = vehicleById.get(route.vehicleId) ?? problem.vehicles[routeIndex];
      const depotId = vehicle?.startDepotId ?? problem.depotNodeId;
      const endDepotId = vehicle?.endDepotId ?? problem.depotNodeId;
      const pathIds = [depotId, ...route.nodes, endDepotId];
      const path = pathIds.map(positionFor).filter((point): point is [number, number] => Boolean(point));
      const stops = route.nodes.flatMap((nodeId) => {
        const customer = customerByDelivery.get(nodeId);
        if (!customer) return [];
        const node = nodeById.get(nodeId);
        return [{
          nodeId,
          name: node?.name?.replace(/ · service$/, '') ?? customer.orderRef ?? `Stop ${customer.id}`,
          orderRef: customer.orderRef ?? `Job ${customer.id}`,
          demand: customer.demand ?? 1,
          eta: solution.nodeTimes[String(nodeId)],
          position: positionFor(nodeId),
        }];
      });
      let distanceKm = 0;
      for (let index = 1; index < pathIds.length; index++) {
        const previous = nodeById.get(pathIds[index - 1]!);
        const current = nodeById.get(pathIds[index]!);
        if (previous && current) distanceKm += Math.hypot(current.x - previous.x, current.y - previous.y) / (origin ? 1000 : 1);
      }
      return {
        vehicleId: route.vehicleId,
        vehicleName: vehicle?.name ?? `Vehicle ${route.vehicleId}`,
        routeIndex,
        path,
        stops,
        load: stops.reduce((sum, stop) => sum + stop.demand, 0),
        capacity: vehicle?.capacity ?? 0,
        duration: solution.nodeTimes[`depot_return_${routeIndex}`] ?? 0,
        distanceKm,
      };
    })
    .filter((route) => route.stops.length > 0);

  const [selectedVehicleId, setSelectedVehicleId] = React.useState<number | null>(routes[0]?.vehicleId ?? null);
  const selectedRoute = routes.find((route) => route.vehicleId === selectedVehicleId) ?? routes[0];
  const allPoints = routes.flatMap((route) => route.path);
  const mapCenter = selectedRoute?.path[0] ?? (origin ? [origin.lat, origin.lng] : [20, 0]);

  if (routes.length === 0) {
    return (
      <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">The solver returned no active vehicle routes.</CardContent></Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Dispatch review</CardTitle>
            <CardDescription>Inspect every assigned stop before sharing the plan with drivers.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{routes.length} active vehicle{routes.length === 1 ? '' : 's'}</Badge>
            <Badge variant="outline">{routes.reduce((sum, route) => sum + route.stops.length, 0)} stops</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-0 p-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative min-h-[480px] bg-muted/20">
          {origin ? (
            <Map center={mapCenter} zoom={11} className="min-h-[480px] border-0">
              <MapTileLayer />
              <FitRouteBounds points={selectedRoute?.path.length ? selectedRoute.path : allPoints} />
              <MapZoomControl position="top-3 left-3" />
              <MapFullscreenControl position="top-3 right-3" />
              {routes.map((route) => {
                const selected = route.vehicleId === selectedRoute?.vehicleId;
                return route.path.length > 1 ? (
                  <MapPolyline
                    key={route.vehicleId}
                    positions={route.path}
                    eventHandlers={{ click: () => setSelectedVehicleId(route.vehicleId) }}
                    pathOptions={{ color: selected ? '#050505' : '#8b8b8b', weight: selected ? 6 : 3, opacity: selected ? 0.95 : 0.5, dashArray: selected ? undefined : '6 8' }}
                  />
                ) : null;
              })}
              {depot && origin && (
                <MapMarker position={metresToLatLng(origin, depot.x, depot.y)} icon={'<div style="width:28px;height:28px;display:grid;place-items:center;background:#050505;color:white;border:2px solid white;box-shadow:0 2px 10px rgba(0,0,0,.3);font:700 11px ui-sans-serif">D</div>'} iconAnchor={[14, 14]} />
              )}
              {selectedRoute?.stops.map((stop, index) => stop.position ? (
                <MapMarker key={stop.nodeId} position={stop.position} icon={stopMarker(index + 1, true)} iconAnchor={[12, 12]} />
              ) : null)}
            </Map>
          ) : (
            <div className="grid min-h-[480px] place-items-center p-8 text-center">
              <div><MapPin className="mx-auto mb-3 size-6" /><p className="font-medium">Map unavailable for this imported scenario</p><p className="mt-1 text-sm text-muted-foreground">Route assignments and timing remain available.</p></div>
            </div>
          )}
          {selectedRoute && (
            <div className="matte-glass absolute bottom-3 left-3 z-[1000] flex items-center gap-3 rounded-xl px-3 py-2 text-xs">
              <Truck className="size-4" /><strong>{selectedRoute.vehicleName}</strong><span className="text-muted-foreground">{selectedRoute.distanceKm.toFixed(1)} km</span>
            </div>
          )}
        </div>

        <div className="max-h-[620px] space-y-2 overflow-auto border-l p-3">
          {routes.map((route) => {
            const selected = route.vehicleId === selectedRoute?.vehicleId;
            const utilization = route.capacity > 0 ? Math.min(100, (route.load / route.capacity) * 100) : 0;
            return (
              <button
                key={route.vehicleId}
                type="button"
                onClick={() => setSelectedVehicleId(route.vehicleId)}
                className={cn('w-full rounded-xl border p-3 text-left transition-all hover:bg-muted/60', selected && 'border-foreground bg-muted/50 shadow-sm')}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('grid size-8 shrink-0 place-items-center rounded-lg border', selected && 'bg-foreground text-background')}>
                    {selected ? <Check className="size-4" /> : <Truck className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{route.vehicleName}</strong><span className="text-xs tabular-nums text-muted-foreground">{route.distanceKm.toFixed(1)} km</span></div>
                    <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><Package className="size-3" />{route.stops.length} stops</span><span className="flex items-center gap-1"><Clock3 className="size-3" />back {eta(route.duration)}</span></div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${utilization}%` }} /></div>
                    <p className="mt-1 text-[10px] text-muted-foreground">{route.load.toFixed(0)} / {route.capacity.toFixed(0)} load</p>
                    {selected && (
                      <ol className="mt-3 space-y-2 border-t pt-3">
                        {route.stops.map((stop, index) => (
                          <li key={stop.nodeId} className="flex items-center gap-2 text-xs">
                            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-foreground text-[9px] font-semibold text-background">{index + 1}</span>
                            <span className="min-w-0 flex-1 truncate">{stop.name}</span>
                            <span className="tabular-nums text-muted-foreground">{eta(stop.eta)}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

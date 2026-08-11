'use client';

import * as React from 'react';
import L from 'leaflet';

import { Map } from '@/components/map/map';
import { MapTileLayer } from '@/components/map/map-tile-layer';
import { MapMarker } from '@/components/map/map-marker';
import { MapPopup } from '@/components/map/map-popup';
import { MapDrawControl } from '@/components/map/map-draw-control';

import { useProblemStore } from '@/lib/problem-store';
import { metresToLatLngExpr, latLngToMetres, type ReferenceOrigin } from '@/lib/geo-utils';

const DELHI_CENTER: [number, number] = [28.6139, 77.209];

export interface BuildMapProps {
  referenceOrigin: ReferenceOrigin | null;
  selectedNodeId: number | null;
  onSelectNode: (nodeId: number | null) => void;
}

function nodeLabelHtml(id: number, isDepot: boolean, isSelected: boolean): string {
  const ring = isSelected
    ? 'box-shadow: 0 0 0 4px rgba(59,130,246,0.55), 0 0 0 2px rgba(0,0,0,0.4);'
    : 'box-shadow: 0 0 0 2px rgba(0,0,0,0.4);';
  const bg = isDepot ? '#0f172a' : isSelected ? '#3b82f6' : '#64748b';
  return `<div style="
    width:24px;height:24px;
    background:${bg};
    color:white;
    border:2px solid white;
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-size:11px;font-weight:700;
    ${ring}
  ">${id}</div>`;
}

export function BuildMap({
  referenceOrigin,
  selectedNodeId,
  onSelectNode,
}: BuildMapProps): React.ReactElement {
  const problem = useProblemStore((s) => s.problem);
  const setProblem = useProblemStore((s) => s.setProblem);
  const layerRef = React.useRef<L.FeatureGroup | null>(null);

  const handleMapClick = React.useCallback(
    (latLng: { lat: number; lng: number }) => {
      if (!referenceOrigin) return;
      const currentProblem = useProblemStore.getState().problem;
      const layer = layerRef.current ?? new L.FeatureGroup();
      layerRef.current = layer;

      // Allocate the next node id (depot is 0, customer stops start at 1).
      const existingIds = (
        currentProblem
          ? Array.isArray(currentProblem.nodes)
            ? currentProblem.nodes.map((n) => n.id)
            : Object.values(currentProblem.nodes).map((n) => n.id)
          : []
      ).concat(
        Array.from(layer.getLayers()).map((l) =>
          Number((l as L.Marker & { options: { markerId?: number } }).options.markerId),
        ),
      );
      const nextId = existingIds.length === 0 ? 0 : Math.max(...existingIds) + 1;

      const marker = L.marker([latLng.lat, latLng.lng], {
        icon: L.divIcon({
          className: 'vrp-draw-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      });
      (marker.options as { markerId?: number }).markerId = nextId;
      layer.addLayer(marker);

      const [x, y] = latLngToMetres(referenceOrigin, latLng.lat, latLng.lng);
      const nodes = (layer.getLayers() as L.Marker[]).flatMap((m) => {
        const id = (m.options as { markerId?: number }).markerId;
        if (typeof id !== 'number') return [];
        const ll = m.getLatLng();
        const [mx, my] = latLngToMetres(referenceOrigin, ll.lat, ll.lng);
        return [{ id, x: Math.abs(mx), y: Math.abs(my), name: `Node ${id}` }];
      });
      const depotNodeId = currentProblem?.depotNodeId ?? nodes[0]?.id ?? 0;
      const customers = currentProblem?.customers ?? [];
      const vehicles = currentProblem?.vehicles ?? [{ id: 1, capacity: 100 }];

      setProblem({
        depotNodeId,
        nodes,
        customers,
        vehicles,
        referenceOrigin: { lat: referenceOrigin.lat, lng: referenceOrigin.lng },
      });
      onSelectNode(nextId);
    },
    [referenceOrigin, setProblem, onSelectNode],
  );

  const center: [number, number] = React.useMemo(() => {
    if (referenceOrigin) return [referenceOrigin.lat, referenceOrigin.lng];
    return DELHI_CENTER;
  }, [referenceOrigin]);

  // Fall back to the depot node when referenceOrigin is missing.
  const effectiveOrigin: ReferenceOrigin | null = React.useMemo(() => {
    if (referenceOrigin) return referenceOrigin;
    if (!problem) return null;
    const nodeList = Array.isArray(problem.nodes) ? problem.nodes : Object.values(problem.nodes);
    const depot = nodeList.find((n) => n.id === problem.depotNodeId) ?? nodeList[0];
    return depot ? { lat: depot.x, lng: depot.y } : null;
  }, [referenceOrigin, problem]);

  const nodeList = problem
    ? Array.isArray(problem.nodes)
      ? problem.nodes
      : Object.values(problem.nodes)
    : [];
  const depotNodeId = problem?.depotNodeId ?? 0;

  return (
    <Map center={center} zoom={12} className="rounded-xl border">
      <MapTileLayer />
      <MapDrawControl onClick={handleMapClick}>
        <></>
      </MapDrawControl>
      {nodeList.map((node) => {
        if (!effectiveOrigin) return null;
        const [lat, lng] = metresToLatLngExpr(effectiveOrigin, node.x, node.y) as [number, number];
        const isDepot = node.id === depotNodeId;
        const isSelected = node.id === selectedNodeId;
        return (
          <MapMarker
            key={node.id}
            position={[lat, lng]}
            icon={nodeLabelHtml(node.id, isDepot, isSelected)}
            iconSize={[24, 24]}
            iconAnchor={[12, 12]}
            eventHandlers={{
              click: () => onSelectNode(node.id),
            }}
          >
            <MapPopup>
              <div className="text-xs">
                <div className="font-semibold">
                  {node.name ?? `Node ${node.id}`}
                  {isDepot && (
                    <span className="ml-1 rounded bg-slate-900 px-1.5 text-white">Depot</span>
                  )}
                </div>
                <div className="text-muted-foreground">
                  ({node.x.toFixed(1)}, {node.y.toFixed(1)})
                </div>
              </div>
            </MapPopup>
          </MapMarker>
        );
      })}
      {effectiveOrigin && (
        <div className="absolute right-2 top-2 z-1000 rounded-md bg-white/90 px-3 py-1.5 text-xs shadow">
          Click the map to drop a node · {nodeList.length} nodes
        </div>
      )}
    </Map>
  );
}

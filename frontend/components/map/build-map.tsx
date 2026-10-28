'use client';

import * as React from 'react';
import L from 'leaflet';
import { useMap, useMapEvents } from 'react-leaflet';

import { Map } from '@/components/map/map';
import { MapTileLayer } from '@/components/map/map-tile-layer';
import { MapMarker } from '@/components/map/map-marker';
import { MapPopup } from '@/components/map/map-popup';
import { MapFullscreenControl, MapLocateControl, MapZoomControl } from '@/components/ui/map';

import { useProblemStore } from '@/lib/problem-store';
import { log } from '@/lib/log';
import {
  latLngToMetres,
  metresToLatLng,
  type ReferenceOrigin,
} from '@/lib/geo-utils';

export type MapTool = 'select' | 'place';

/** Canvas rendering kicks in above this many nodes to keep panning smooth. */
export const CANVAS_NODE_THRESHOLD = 500;

const WORLD_CENTER: [number, number] = [20, 0];
const WORLD_ZOOM = 2;

function nodeLabelHtml(id: number, isDepot: boolean, isSelected: boolean): string {
  const ring = isSelected
    ? 'box-shadow: 0 0 0 5px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.75);'
    : 'box-shadow: 0 0 0 1px rgba(0,0,0,0.55);';
  const bg = isDepot || isSelected ? '#0a0a0a' : '#ffffff';
  const color = isDepot || isSelected ? '#ffffff' : '#0a0a0a';
  return `<div style="
    width:24px;height:24px;
    background:${bg};
    color:${color};
    border:2px solid ${isDepot || isSelected ? 'white' : '#0a0a0a'};
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-size:11px;font-weight:700;
    ${ring}
  ">${id}</div>`;
}

/** Recenters the map once a scenario origin exists (first node placed). */
function Recenter({ origin }: { origin: ReferenceOrigin | null }): null {
  const map = useMap();
  React.useEffect(() => {
    if (origin) map.setView([origin.lat, origin.lng], Math.max(map.getZoom(), 12));
  }, [map, origin]);
  return null;
}

/** Map-level click capture (react-leaflet v5 has no container event props). */
function ClickHandler({ onClick }: { onClick: (e: L.LeafletMouseEvent) => void }): null {
  useMapEvents({ click: onClick });
  return null;
}

export interface BuildMapProps {
  tool: MapTool;
  selectedNodeId: number | null;
  onSelectNode: (nodeId: number | null) => void;
}

export function BuildMap({
  tool,
  selectedNodeId,
  onSelectNode,
}: BuildMapProps): React.ReactElement {
  const problem = useProblemStore((s) => s.problem);
  const setProblem = useProblemStore((s) => s.setProblem);

  // Origin: explicit referenceOrigin wins. Legacy scenarios without one stay
  // at world view rather than mis-interpreting stored metres as lat/lng.
  const origin: ReferenceOrigin | null = React.useMemo(() => {
    if (problem?.referenceOrigin) return problem.referenceOrigin;
    return null;
  }, [problem]);

  const nodeList = problem
    ? Array.isArray(problem.nodes)
      ? problem.nodes
      : Object.values(problem.nodes)
    : [];
  const depotNodeId = problem?.depotNodeId ?? 0;

  /** Places a node at geographic coords; the first node anchors the origin. */
  const placeNode = React.useCallback(
    (lat: number, lng: number, name?: string) => {
      const current = useProblemStore.getState().problem;
      const nextId = current
        ? Math.max(
            ...(Array.isArray(current.nodes) ? current.nodes : Object.values(current.nodes)).map(
              (n) => n.id,
            ),
          ) + 1
        : 0;

      if (!current || !origin) {
        // First placement defines the reference origin for metre projection.
        setProblem({
          depotNodeId: nextId,
          nodes: [{ id: nextId, x: 0, y: 0, name }],
          customers: [],
          vehicles: [{ id: 1, capacity: 100 }],
          referenceOrigin: { lat, lng },
        });
      } else {
        const [mx, my] = latLngToMetres(origin, lat, lng);
        const existing = Array.isArray(current.nodes) ? current.nodes : Object.values(current.nodes);
        setProblem({
          ...current,
          nodes: [...existing, { id: nextId, x: mx, y: my, name }],
        });
      }
      onSelectNode(nextId);
    },
    [origin, setProblem, onSelectNode],
  );

  /** Drags rewrite coordinates in place through the same projection. */
  const moveNode = React.useCallback(
    (nodeId: number, lat: number, lng: number) => {
      const current = useProblemStore.getState().problem;
      const ref = current?.referenceOrigin ?? origin;
      if (!current || !ref) return;
      const existing = Array.isArray(current.nodes) ? current.nodes : Object.values(current.nodes);
      const [mx, my] = latLngToMetres(ref, lat, lng);
      setProblem({
        ...current,
        nodes: existing.map((n) =>
          n.id === nodeId ? { ...n, x: mx, y: my } : n,
        ),
      });
    },
    [origin, setProblem],
  );

  const handleClick = React.useCallback(
    (e: L.LeafletMouseEvent) => {
      if (tool !== 'place') return;
      placeNode(e.latlng.lat, e.latlng.lng);
    },
    [tool, placeNode],
  );

  // Search-result picks arrive as a custom event so the toolbar stays
  // independent of Leaflet internals.
  React.useEffect(() => {
    const handler = (e: Event): void => {
      const detail = (e as CustomEvent<{ lat: number; lng: number }>).detail;
      placeNode(detail.lat, detail.lng);
    };
    window.addEventListener('fleetpilot:place-at', handler);
    return () => window.removeEventListener('fleetpilot:place-at', handler);
  }, [placeNode]);

  React.useEffect(() => {
    log.debug('BuildMap mount', { tool, hasOrigin: !!origin, nodes: nodeList.length });
    return () => log.debug('BuildMap unmount');
  }, [tool, origin, nodeList.length]);

  return (
    <Map
      center={origin ? [origin.lat, origin.lng] : WORLD_CENTER}
      zoom={origin ? 12 : WORLD_ZOOM}
      className={`rounded-2xl border ${tool === 'place' ? 'cursor-crosshair' : ''}`}
      preferCanvas={nodeList.length > CANVAS_NODE_THRESHOLD}
    >
      <MapTileLayer />
      <MapZoomControl position="top-3 left-3" />
      <MapFullscreenControl position="top-3 right-3" />
      <MapLocateControl position="right-3 bottom-3" />
      <ClickHandler onClick={handleClick} />
      <Recenter origin={origin} />
      {nodeList.map((node) => {
        if (!origin) return null;
        const [lat, lng] = metresToLatLng(origin, node.x, node.y);
        const isDepot = node.id === depotNodeId;
        const isSelected = node.id === selectedNodeId;
        return (
          <MapMarker
            key={node.id}
            position={[lat, lng]}
            draggable
            icon={nodeLabelHtml(node.id, isDepot, isSelected)}
            iconSize={[24, 24]}
            iconAnchor={[12, 12]}
            eventHandlers={{
              click: (e) => {
                e.originalEvent?.stopPropagation();
                onSelectNode(node.id);
              },
              dragend: (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                moveNode(node.id, ll.lat, ll.lng);
              },
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
                  ({lat.toFixed(5)}, {lng.toFixed(5)})
                </div>
              </div>
            </MapPopup>
          </MapMarker>
        );
      })}
      <div className="matte-glass pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-xl px-3 py-2 text-[11px]">
        {tool === 'place'
          ? 'Click the map to drop a stop · drag markers to adjust'
          : 'Select mode — click a marker to inspect'}
        {' · '}
        {nodeList.length} nodes
      </div>
    </Map>
  );
}

'use client';

import * as React from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

import { Map } from '@/components/map/map';
import { MapTileLayer } from '@/components/map/map-tile-layer';
import { MapMarker } from '@/components/map/map-marker';
import { MapPolyline } from '@/components/map/map-polyline';
import { MapPopup } from '@/components/map/map-popup';

import { useProblemStore } from '@/lib/problem-store';
import { metresToLatLngExpr, type ReferenceOrigin } from '@/lib/geo-utils';

const TABLEAU = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ab',
];

export interface SimulateMapProps {
  referenceOrigin: ReferenceOrigin | null;
  currentTime: number;
  hoveredVehicleId: number | null;
}

interface VehicleTrace {
  vehicleId: number;
  color: string;
  positions: Array<[number, number]>;
  nodeTimes: number[];
}

interface InterpolateResult {
  pos: [number, number];
  heading: number;
  atStop: boolean;
}

function interpolate(
  positions: Array<[number, number]>,
  nodeTimes: number[],
  currentTime: number,
): InterpolateResult {
  if (positions.length === 0) {
    return { pos: [0, 0], heading: 0, atStop: true };
  }
  if (positions.length === 1) {
    return { pos: positions[0]!, heading: 0, atStop: true };
  }
  const first = positions[0]!;
  const last = positions[positions.length - 1]!;
  if (currentTime <= (nodeTimes[0] ?? 0)) {
    return { pos: first, heading: 0, atStop: true };
  }
  if (currentTime >= (nodeTimes[nodeTimes.length - 1] ?? 0)) {
    return { pos: last, heading: 0, atStop: true };
  }
  for (let i = 0; i < positions.length - 1; i++) {
    const t0 = nodeTimes[i] ?? 0;
    const t1 = nodeTimes[i + 1] ?? 0;
    if (currentTime >= t0 && currentTime <= t1) {
      const span = t1 - t0;
      const frac = span > 0 ? (currentTime - t0) / span : 0;
      const p0 = positions[i]!;
      const p1 = positions[i + 1]!;
      const pos: [number, number] = [
        p0[0] + (p1[0] - p0[0]) * frac,
        p0[1] + (p1[1] - p0[1]) * frac,
      ];
      const dLat = p1[0] - p0[0];
      const dLng = p1[1] - p0[1];
      const heading = frac > 0.001 ? (Math.atan2(dLng, dLat) * 180) / Math.PI : 0;
      return { pos, heading, atStop: false };
    }
  }
  return { pos: last, heading: 0, atStop: true };
}

// Two-layer icon: outer wrapper for size, inner `rotation` div for heading.
// Lets us update heading in O(1) via DOM (no `setIcon` round-trip).
function truckHtml(color: string, label: number): string {
  return `<div class="vrp-truck-outer">
    <div class="vrp-truck-rotation" style="transform: rotate(0deg)">
      <div class="vrp-truck-pointer" style="background:${color}"></div>
      <div class="vrp-truck-body" style="background:${color}">${label}</div>
    </div>
  </div>`;
}

function stopHtml(color: string): string {
  return `<div class="vrp-stop" style="background:${color}"></div>`;
}

function depotHtml(): string {
  return `<div class="vrp-depot">D</div>`;
}

function HeadsLayer({
  vehicles,
  currentTime,
}: {
  vehicles: VehicleTrace[];
  currentTime: number;
}): null {
  const map = useMap();
  const markersRef = React.useRef<globalThis.Map<number, L.Marker>>(new globalThis.Map());

  // Build markers when the vehicle set changes.
  React.useEffect(() => {
    const layer = markersRef.current;
    for (const v of vehicles) {
      if (!layer.has(v.vehicleId)) {
        const { pos } = interpolate(v.positions, v.nodeTimes, currentTime);
        const marker = L.marker(pos, {
          icon: L.divIcon({
            className: 'vrp-head-marker',
            html: truckHtml(v.color, v.vehicleId),
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          }),
          keyboard: false,
          zIndexOffset: 1000,
        });
        marker.addTo(map);
        layer.set(v.vehicleId, marker);
      }
    }
    for (const [id, marker] of layer) {
      if (!vehicles.some((v) => v.vehicleId === id)) {
        marker.remove();
        layer.delete(id);
      }
    }
    return () => {
      for (const marker of layer.values()) {
        marker.remove();
      }
      layer.clear();
    };
  }, [map, vehicles]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update marker positions and headings on every currentTime change.
  // We mutate the existing DOM (no `setIcon`) so rAF can drive this at 60fps
  // without re-rendering any React component.
  React.useEffect(() => {
    const layer = markersRef.current;
    for (const v of vehicles) {
      const marker = layer.get(v.vehicleId);
      if (!marker) continue;
      const { pos, heading, atStop } = interpolate(v.positions, v.nodeTimes, currentTime);
      marker.setLatLng(pos);
      const el = marker.getElement();
      if (el) {
        const rotation = el.querySelector<HTMLDivElement>('.vrp-truck-rotation');
        if (rotation) {
          rotation.style.transform = `rotate(${heading}deg)`;
          rotation.style.transition = 'transform 120ms linear';
        }
        const body = el.querySelector<HTMLDivElement>('.vrp-truck-body');
        const pointer = el.querySelector<HTMLDivElement>('.vrp-truck-pointer');
        if (body && pointer) {
          // Visual pulse when arriving at a stop: a quick scale-up of the body.
          if (atStop) {
            body.style.boxShadow = '0 0 0 6px rgba(59,130,246,0.35)';
          } else {
            body.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.35)';
          }
        }
      }
    }
  }, [currentTime, vehicles]);

  return null;
}

export function SimulateMap({
  referenceOrigin,
  currentTime,
  hoveredVehicleId,
}: SimulateMapProps): React.ReactElement {
  const problem = useProblemStore((s) => s.problem);
  const solution = useProblemStore((s) => s.solution);

  const center: [number, number] = React.useMemo(() => {
    if (referenceOrigin) return [referenceOrigin.lat, referenceOrigin.lng];
    return [28.6139, 77.209];
  }, [referenceOrigin]);

  const nodeById = React.useMemo(() => {
    const map = new globalThis.Map<number, { x: number; y: number; name: string }>();
    if (problem) {
      const nodeList = Array.isArray(problem.nodes) ? problem.nodes : Object.values(problem.nodes);
      for (const n of nodeList) map.set(n.id, { x: n.x, y: n.y, name: n.name ?? '' });
    }
    return map;
  }, [problem]);

  if (!referenceOrigin || !problem || !solution) {
    return (
      <Map center={center} zoom={12} className="rounded-xl border">
        <MapTileLayer />
      </Map>
    );
  }

  const nodeTimeMap = React.useMemo(() => {
    const m = new globalThis.Map<number, number>();
    for (const [k, v] of solution.nodeTimesEntries ?? []) {
      m.set(Number(k), v);
    }
    return m;
  }, [solution]);

  const vehicles: VehicleTrace[] = React.useMemo(() => {
    return solution.routes.map((route, idx) => {
      const positions: Array<[number, number]> = [];
      const times: number[] = [];
      for (const nodeId of route.nodes) {
        const node = nodeById.get(nodeId);
        if (!node) continue;
        const [lat, lng] = metresToLatLngExpr(referenceOrigin, node.x, node.y) as [
          number,
          number,
        ];
        positions.push([lat, lng]);
        times.push(nodeTimeMap.get(nodeId) ?? 0);
      }
      return {
        vehicleId: route.vehicleId,
        color: TABLEAU[idx % TABLEAU.length] ?? '#4e79a7',
        positions,
        nodeTimes: times,
      };
    });
  }, [solution, nodeById, nodeTimeMap, referenceOrigin]);

  const fitBoundsRef = React.useRef(false);

  return (
    <Map
      ref={(m) => {
        if (m && !fitBoundsRef.current) {
          const allPts = vehicles.flatMap((v) => v.positions) as [number, number][];
          if (allPts.length > 0) {
            const bounds = L.latLngBounds(allPts);
            m.fitBounds(bounds, { padding: [40, 40] });
          }
          fitBoundsRef.current = true;
        }
      }}
      center={center}
      zoom={12}
      className="rounded-xl border"
    >
      <MapTileLayer />
      {vehicles.map((v) => (
        <MapPolyline
          key={`poly-${v.vehicleId}`}
          positions={v.positions}
          pathOptions={{
            color: v.color,
            weight: hoveredVehicleId === null || hoveredVehicleId === v.vehicleId ? 5 : 2,
            opacity: hoveredVehicleId === null || hoveredVehicleId === v.vehicleId ? 0.9 : 0.3,
          }}
        />
      ))}
      {vehicles.flatMap((v) =>
        v.positions.map((pos, idx) => {
          const isDepot = idx === 0;
          const html = isDepot ? depotHtml() : stopHtml(v.color);
          const size: [number, number] = isDepot ? [22, 22] : [18, 18];
          const anchor: [number, number] = isDepot ? [11, 11] : [9, 9];
          return (
            <MapMarker
              key={`stop-${v.vehicleId}-${idx}`}
              position={pos}
              icon={html}
              iconSize={size}
              iconAnchor={anchor}
            >
              <MapPopup>
                <div className="text-xs">
                  <div className="font-semibold">
                    {isDepot ? 'Depot' : `Vehicle ${v.vehicleId}`} stop {idx + 1}
                  </div>
                  <div className="text-muted-foreground">
                    Arrival: {v.nodeTimes[idx]?.toFixed(1) ?? '—'} min
                  </div>
                </div>
              </MapPopup>
            </MapMarker>
          );
        }),
      )}
      <HeadsLayer vehicles={vehicles} currentTime={currentTime} />
    </Map>
  );
}

'use client';

import * as React from 'react';
import L from 'leaflet';
import { Marker } from 'react-leaflet';

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

function truckHtml(color: string, label: number, heading: number, atStop: boolean): string {
  const shadow = atStop
    ? 'box-shadow: 0 0 0 8px rgba(59,130,246,0.35), 0 0 0 2px rgba(0,0,0,0.4);'
    : 'box-shadow: 0 0 0 2px rgba(0,0,0,0.4);';
  return `<div class="vrp-truck-outer">
    <div class="vrp-truck-rotation" style="transform: rotate(${heading}deg)">
      <div class="vrp-truck-pointer" style="background:${color}"></div>
      <div class="vrp-truck-body" style="background:${color};${shadow}">${label}</div>
    </div>
  </div>`;
}

function stopHtml(color: string): string {
  return `<div class="vrp-stop" style="background:${color}"></div>`;
}

function depotHtml(): string {
  return `<div class="vrp-depot">D</div>`;
}

interface TruckMarkerProps {
  position: [number, number];
  color: string;
  label: number;
  heading: number;
  atStop: boolean;
}

function TruckMarker({
  position,
  color,
  label,
  heading,
  atStop,
}: TruckMarkerProps): React.ReactElement {
  // The icon HTML is rebuilt on every render so the heading rotates and
  // the atStop pulse reflects the latest currentTime. With divIcon's html
  // string, react-leaflet calls setIcon() and the inner divs are reused,
  // so the rotation transition stays smooth across frames.
  const icon = React.useMemo(
    () =>
      L.divIcon({
        className: 'vrp-head-marker',
        html: truckHtml(color, label, heading, atStop),
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      }),
    [color, label, heading, atStop],
  );
  return <Marker position={position} icon={icon} zIndexOffset={1000} />;
}

export function SimulateMap({
  referenceOrigin,
  currentTime,
  hoveredVehicleId,
}: SimulateMapProps): React.ReactElement {
  const problem = useProblemStore((s) => s.problem);
  const solution = useProblemStore((s) => s.solution);

  const effectiveOrigin: ReferenceOrigin | null = React.useMemo(() => {
    if (referenceOrigin) return referenceOrigin;
    if (!problem) return null;
    const nodeList = Array.isArray(problem.nodes) ? problem.nodes : Object.values(problem.nodes);
    const depot = nodeList.find((n) => n.id === problem.depotNodeId) ?? nodeList[0];
    return depot ? { lat: depot.x, lng: depot.y } : null;
  }, [referenceOrigin, problem]);

  const center: [number, number] = React.useMemo(() => {
    if (effectiveOrigin) return [effectiveOrigin.lat, effectiveOrigin.lng];
    return [28.6139, 77.209];
  }, [effectiveOrigin]);

  const nodeById = React.useMemo(() => {
    const map = new globalThis.Map<number, { x: number; y: number; name: string }>();
    if (problem) {
      const nodeList = Array.isArray(problem.nodes) ? problem.nodes : Object.values(problem.nodes);
      for (const n of nodeList) map.set(n.id, { x: n.x, y: n.y, name: n.name ?? '' });
    }
    return map;
  }, [problem]);

  if (!effectiveOrigin || !problem || !solution) {
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
        const [lat, lng] = metresToLatLngExpr(effectiveOrigin, node.x, node.y) as [
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
  }, [solution, nodeById, nodeTimeMap, effectiveOrigin]);

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
      {vehicles.map((v) => {
        const { pos, heading, atStop } = interpolate(v.positions, v.nodeTimes, currentTime);
        return (
          <TruckMarker
            key={`head-${v.vehicleId}`}
            position={pos}
            color={v.color}
            label={v.vehicleId}
            heading={heading}
            atStop={atStop}
          />
        );
      })}
    </Map>
  );
}

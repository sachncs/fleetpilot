'use client';

import * as React from 'react';
import L from 'leaflet';
import { useMap, Marker, type MarkerProps } from 'react-leaflet';

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

function interpolate(
  positions: Array<[number, number]>,
  nodeTimes: number[],
  currentTime: number,
): [number, number] {
  if (positions.length === 0) return [0, 0];
  if (positions.length === 1) return positions[0]!;
  if (currentTime <= (nodeTimes[0] ?? 0)) return positions[0]!;
  const last = positions.length - 1;
  const lastT = nodeTimes[last] ?? 0;
  if (currentTime >= lastT) return positions[last]!;
  // Find the segment [i, i+1] where currentTime falls.
  for (let i = 0; i < last; i++) {
    const t0 = nodeTimes[i] ?? 0;
    const t1 = nodeTimes[i + 1] ?? 0;
    if (currentTime >= t0 && currentTime <= t1) {
      const span = t1 - t0;
      const frac = span > 0 ? (currentTime - t0) / span : 0;
      const p0 = positions[i]!;
      const p1 = positions[i + 1]!;
      return [p0[0] + (p1[0] - p0[0]) * frac, p0[1] + (p1[1] - p0[1]) * frac];
    }
  }
  return positions[last]!;
}

interface AnimatedHeadProps {
  position: [number, number];
  color: string;
  label: number;
}

function AnimatedHead({ position, color, label }: AnimatedHeadProps): React.ReactElement {
  const map = useMap();
  const markerRef = React.useRef<L.Marker | null>(null);
  const iconRef = React.useRef<L.DivIcon | null>(null);

  if (!iconRef.current) {
    const html = `<div style="background:${color};width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700;">${label}</div>`;
    iconRef.current = L.divIcon({
      className: 'vrp-head-marker',
      html,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  }

  React.useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    }
  }, [position[0], position[1]]);

  return (
    <Marker
      ref={(instance) => {
        markerRef.current = instance;
      }}
      position={position}
      icon={iconRef.current}
      zIndexOffset={1000}
    />
  );
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
      {vehicles.map((v) =>
        v.positions.map((pos, idx) => (
          <MapMarker
            key={`stop-${v.vehicleId}-${idx}`}
            position={pos}
            icon={
              <div
                style={{
                  background: v.color,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  border: '2px solid white',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
                }}
              />
            }
          >
            <MapPopup>
              <div className="text-xs">
                <div className="font-semibold">Vehicle {v.vehicleId}</div>
                <div>
                  Stop {idx + 1} of {v.positions.length}
                </div>
                <div className="text-muted-foreground">
                  Arrival: {v.nodeTimes[idx]?.toFixed(1) ?? '—'} min
                </div>
              </div>
            </MapPopup>
          </MapMarker>
        )),
      )}
      {vehicles.map((v) => (
        <AnimatedHead
          key={`head-${v.vehicleId}`}
          position={interpolate(v.positions, v.nodeTimes, currentTime)}
          color={v.color}
          label={v.vehicleId}
        />
      ))}
    </Map>
  );
}

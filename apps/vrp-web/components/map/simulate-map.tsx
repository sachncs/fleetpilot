'use client';

import * as React from 'react';
import L from 'leaflet';

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

interface VehiclePos {
  vehicleId: number;
  color: string;
  positions: Array<[number, number]>;
  nodeTimes: number[];
  currentIndex: number;
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

  const nodeTimes = (solution.nodeTimesEntries ?? []).map(([k, v]) => [Number(k), v] as [number, number]);
  const nodeTimeMap = new globalThis.Map<number, number>(nodeTimes);

  const vehicles: VehiclePos[] = solution.routes.map((route, idx) => {
    const positions: Array<[number, number]> = [];
    const times: number[] = [];
    for (const nodeId of route.nodes) {
      const node = nodeById.get(nodeId);
      if (!node) continue;
      const [lat, lng] = metresToLatLngExpr(referenceOrigin, node.x, node.y) as [number, number];
      positions.push([lat, lng]);
      times.push(nodeTimeMap.get(nodeId) ?? 0);
    }

    let currentIndex = 0;
    for (let i = 0; i < times.length; i++) {
      if ((times[i] ?? 0) <= currentTime) {
        currentIndex = i;
      } else {
        break;
      }
    }

    return {
      vehicleId: route.vehicleId,
      color: TABLEAU[idx % TABLEAU.length] ?? '#4e79a7',
      positions,
      nodeTimes: times,
      currentIndex,
    };
  });

  const fitBounds = React.useRef(false);
  const mapRef = React.useRef<L.Map | null>(null);

  return (
    <Map
      ref={(m) => {
        mapRef.current = m;
        if (m && !fitBounds.current && vehicles.some((v) => v.positions.length > 0)) {
          const allPts = vehicles.flatMap((v) => v.positions) as [number, number][];
          if (allPts.length > 0) {
            const bounds = L.latLngBounds(allPts);
            m.fitBounds(bounds, { padding: [40, 40] });
            fitBounds.current = true;
          }
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
                <div>Stop {idx + 1} of {v.positions.length}</div>
                <div className="text-muted-foreground">Arrival: {v.nodeTimes[idx]?.toFixed(1) ?? '—'} min</div>
              </div>
            </MapPopup>
          </MapMarker>
        )),
      )}
      {vehicles.map((v) => {
        const pos = v.positions[v.currentIndex];
        if (!pos) return null;
        return (
          <MapMarker
            key={`head-${v.vehicleId}`}
            position={pos}
            icon={
              <div
                style={{
                  background: v.color,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: '3px solid white',
                  boxShadow: '0 0 0 2px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {v.vehicleId}
              </div>
            }
          />
        );
      })}
    </Map>
  );
}

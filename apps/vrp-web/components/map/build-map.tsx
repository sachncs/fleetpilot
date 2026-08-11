'use client';

import * as React from 'react';
import L from 'leaflet';

import { Map } from '@/components/map/map';
import { MapTileLayer } from '@/components/map/map-tile-layer';
import { MapMarker } from '@/components/map/map-marker';
import { MapPopup } from '@/components/map/map-popup';
import { MapDrawControl } from '@/components/map/map-draw-control';

import { useProblemStore } from '@/lib/problem-store';
import {
  metresToLatLngExpr,
  latLngToMetres,
  type ReferenceOrigin,
} from '@/lib/geo-utils';

const DELHI_CENTER: [number, number] = [28.6139, 77.209];

function isPointInLayer(layer: L.Layer): layer is L.Marker {
  return layer instanceof L.Marker;
}

export interface BuildMapProps {
  referenceOrigin: ReferenceOrigin | null;
}

export function BuildMap({ referenceOrigin }: BuildMapProps): React.ReactElement {
  const problem = useProblemStore((s) => s.problem);
  const setProblem = useProblemStore((s) => s.setProblem);
  const [selectedNodeId, setSelectedNodeId] = React.useState<number | null>(null);

  const handleLayersChange = React.useCallback(
    (layers: L.FeatureGroup) => {
      const currentProblem = useProblemStore.getState().problem;
      const markerEntries: Array<{ id: number; lat: number; lng: number }> = [];
      layers.eachLayer((layer) => {
        if (isPointInLayer(layer)) {
          const latLng = layer.getLatLng();
          const id = (layer.options as { markerId?: number }).markerId;
          if (typeof id === 'number') {
            markerEntries.push({ id, lat: latLng.lat, lng: latLng.lng });
          }
        }
      });

      if (!referenceOrigin) return;

      const nodes = markerEntries.map((m) => {
        const [x, y] = latLngToMetres(referenceOrigin, m.lat, m.lng);
        return { id: m.id, x: Math.abs(x), y: Math.abs(y), name: `Node ${m.id}` };
      });
      const depotNodeId = currentProblem?.depotNodeId ?? 0;

      const customers = currentProblem?.customers ?? [];
      const vehicles = currentProblem?.vehicles ?? [{ id: 1, capacity: 100 }];

      setProblem({
        depotNodeId,
        nodes,
        customers,
        vehicles,
        referenceOrigin: { lat: referenceOrigin.lat, lng: referenceOrigin.lng },
      });
    },
    [referenceOrigin, setProblem],
  );

  const center: [number, number] = React.useMemo(() => {
    if (referenceOrigin) return [referenceOrigin.lat, referenceOrigin.lng];
    return DELHI_CENTER;
  }, [referenceOrigin]);

  const nodeList = problem
    ? Array.isArray(problem.nodes)
      ? problem.nodes
      : Object.values(problem.nodes)
    : [];
  const depotNodeId = problem?.depotNodeId ?? 0;

  return (
    <Map center={center} zoom={12} className="rounded-xl border">
      <MapTileLayer />
      <MapDrawControl onLayersChange={handleLayersChange}>
        <></>
      </MapDrawControl>
      {nodeList.map((node) => {
        if (!referenceOrigin) return null;
        const [lat, lng] = metresToLatLngExpr(referenceOrigin, node.x, node.y) as [
          number,
          number,
        ];
        const isDepot = node.id === depotNodeId;
        return (
          <MapMarker
            key={node.id}
            position={[lat, lng]}
            eventHandlers={{
              click: () => setSelectedNodeId(node.id),
            }}
          >
            <MapPopup>
              <div className="text-xs">
                <div className="font-semibold">{node.name ?? `Node ${node.id}`}</div>
                <div className="text-muted-foreground">
                  {isDepot ? 'Depot' : `Customer stop #${node.id}`}
                </div>
                <div className="text-muted-foreground">
                  ({node.x.toFixed(1)}, {node.y.toFixed(1)})
                </div>
              </div>
            </MapPopup>
          </MapMarker>
        );
      })}
      {selectedNodeId !== null && (
        <div className="absolute bottom-2 left-2 z-1000 rounded-md bg-white/90 px-3 py-2 text-xs shadow">
          Selected: Node {selectedNodeId}
        </div>
      )}
    </Map>
  );
}

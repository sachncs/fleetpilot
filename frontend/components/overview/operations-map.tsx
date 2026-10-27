'use client';

import * as React from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Building2, Package, Truck } from 'lucide-react';

import { Map } from '@/components/map/map';
import { MapMarker } from '@/components/map/map-marker';
import { MapPopup } from '@/components/map/map-popup';
import { MapTileLayer } from '@/components/map/map-tile-layer';
import { MapFullscreenControl, MapZoomControl } from '@/components/ui/map';

export interface OperationsDepot {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface OperationsOrder {
  id: string;
  ref: string;
  lat: number | null;
  lng: number | null;
  status: 'unassigned' | 'planned' | 'exception';
  windowStart: string | null;
  windowEnd: string | null;
}

export interface OperationsVehicle {
  id: string;
  name: string;
  depotId: string | null;
  status: 'active' | 'maintenance' | 'retired';
}

function FitBounds({ points }: { points: Array<[number, number]> }): null {
  const map = useMap();
  const signature = points.map(([lat, lng]) => `${lat},${lng}`).join('|');
  React.useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0]!, 12);
    else map.fitBounds(L.latLngBounds(points), { padding: [52, 52], maxZoom: 13 });
  }, [map, signature]);
  return null;
}

function depotMarker(vehicleCount: number): string {
  return `<div class="grid h-8 min-w-8 place-items-center border-2 border-white bg-black px-1.5 text-[10px] font-semibold text-white shadow-sm">${vehicleCount}</div>`;
}

function orderMarker(status: OperationsOrder['status']): string {
  const styles = status === 'exception'
    ? 'background:#fff;border:3px double #111;'
    : status === 'planned'
      ? 'background:#111;border:2px solid #fff;box-shadow:0 0 0 1px #111;'
      : 'background:#fff;border:2px solid #111;';
  return `<div style="width:14px;height:14px;border-radius:999px;${styles}"></div>`;
}

export function OperationsMap({
  depots,
  orders,
  vehicles,
}: {
  depots: OperationsDepot[];
  orders: OperationsOrder[];
  vehicles: OperationsVehicle[];
}): React.ReactElement {
  const locatedOrders = orders.filter(
    (order): order is OperationsOrder & { lat: number; lng: number } => order.lat !== null && order.lng !== null,
  );
  const points: Array<[number, number]> = [
    ...depots.map((depot) => [depot.lat, depot.lng] as [number, number]),
    ...locatedOrders.map((order) => [order.lat, order.lng] as [number, number]),
  ];
  const center = points[0] ?? [20, 0];

  return (
    <div className="relative h-[480px] overflow-hidden rounded-2xl border bg-muted/20 shadow-[0_24px_70px_-44px_rgba(0,0,0,.5)]">
      <Map center={center} zoom={points.length > 0 ? 11 : 2} className="rounded-2xl border-0">
        <MapTileLayer />
        <FitBounds points={points} />
        <MapZoomControl position="top-3 left-3" />
        <MapFullscreenControl position="top-3 right-3" />
        {locatedOrders.map((order) => (
          <MapMarker
            key={order.id}
            position={[order.lat, order.lng]}
            icon={orderMarker(order.status)}
            iconAnchor={[7, 7]}
          >
            <MapPopup>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2"><Package className="size-3.5" /><strong>{order.ref}</strong></div>
                <p className="capitalize text-muted-foreground">{order.status}</p>
                {(order.windowStart || order.windowEnd) && <p>{order.windowStart ?? '—'}–{order.windowEnd ?? '—'}</p>}
              </div>
            </MapPopup>
          </MapMarker>
        ))}
        {depots.map((depot) => {
          const depotVehicles = vehicles.filter((vehicle) => vehicle.depotId === depot.id && vehicle.status === 'active');
          return (
            <MapMarker
              key={depot.id}
              position={[depot.lat, depot.lng]}
              icon={depotMarker(depotVehicles.length)}
              iconAnchor={[16, 16]}
              zIndexOffset={500}
            >
              <MapPopup>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2"><Building2 className="size-3.5" /><strong>{depot.name}</strong></div>
                  <p className="flex items-center gap-2 text-muted-foreground"><Truck className="size-3" />{depotVehicles.length} active vehicle{depotVehicles.length === 1 ? '' : 's'}</p>
                </div>
              </MapPopup>
            </MapMarker>
          );
        })}
      </Map>
      <div className="matte-glass pointer-events-none absolute bottom-3 left-3 z-[1000] flex items-center gap-4 rounded-xl px-3 py-2 text-[10px]">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border-2 border-foreground bg-background" /> Unplanned</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-foreground" /> Planned</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border-4 border-double border-foreground bg-background" /> Exception</span>
      </div>
    </div>
  );
}

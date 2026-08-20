'use client';

import * as React from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import { cn } from '@/lib/utils';

export interface MapDrawControlProps {
  /**
   * Fires whenever the user clicks on the map (or after a drag-create).
   * Up to the parent to decide whether to add a marker, set a depot,
   * or ignore the click.
   */
  onClick?: (latLng: { lat: number; lng: number }) => void;
  /** Cursor style for the map. Defaults to a crosshair. */
  cursor?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Lightweight map-click-to-create interaction.
 *
 * We deliberately do NOT use `leaflet-draw`. The draw plugin is a UMD
 * bundle whose IIFE references `window` directly at invocation time, and
 * webpack's module wrapper hides `window` from the IIFE — so `L.Control.Draw`
 * is never installed. The only thing we need is "click on the map, get a
 * LatLng", which is a one-liner over `useMapEvents`.
 */
export const MapDrawControl: React.FC<MapDrawControlProps> = ({
  onClick,
  cursor = 'crosshair',
  className,
  children,
}) => {
  const map = useMap();
  const stableOnClick = React.useRef(onClick);
  stableOnClick.current = onClick;

  useMapEvents({
    click: (e) => {
      stableOnClick.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  React.useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    const prev = container.style.cursor;
    container.style.cursor = cursor;
    return () => {
      container.style.cursor = prev;
    };
  }, [map, cursor]);

  return <div className={cn('hidden', className)}>{children}</div>;
};
MapDrawControl.displayName = 'MapDrawControl';

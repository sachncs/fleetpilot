'use client';

import * as React from 'react';
import { Marker, type MarkerProps } from 'react-leaflet';
import L from 'leaflet';

const DEFAULT_ICON = L.divIcon({
  className: 'vrp-default-marker',
  html: `<div style="background:#3b82f6;width:18px;height:18px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.15);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export interface MapMarkerProps extends Omit<MarkerProps, 'icon'> {
  /**
   * Either a `L.Icon` / `L.DivIcon` instance to render directly, or a
   * string of HTML for the icon body. We don't accept React nodes because
   * the only way to render them inside a Leaflet divIcon is to serialize
   * them server-side, which defeats the purpose of an interactive marker.
   */
  icon?: L.Icon | string;
  iconSize?: [number, number];
  iconAnchor?: [number, number];
  className?: string;
}

export const MapMarker: React.FC<MapMarkerProps> = ({
  icon,
  iconSize,
  iconAnchor,
  className,
  ...props
}) => {
  const leafletIcon = React.useMemo(() => {
    if (icon === undefined) return DEFAULT_ICON;
    if (typeof icon === 'string') {
      return L.divIcon({
        className: `vrp-custom-marker ${className ?? ''}`,
        html: icon,
        iconSize: iconSize ?? [24, 24],
        iconAnchor: iconAnchor ?? [12, 12],
      });
    }
    return icon;
  }, [icon, iconSize, iconAnchor, className]);

  return <Marker icon={leafletIcon} {...props} />;
};
MapMarker.displayName = 'MapMarker';

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
  icon?: React.ReactNode;
  iconAnchor?: [number, number];
}

export const MapMarker: React.FC<MapMarkerProps> = ({ icon, iconAnchor, ...props }) => {
  const leafletIcon = React.useMemo(() => {
    if (icon === undefined) return DEFAULT_ICON;
    return L.divIcon({
      className: 'vrp-custom-marker',
      html: `<div class="vrp-custom-marker-inner">${(typeof icon === 'string' ? icon : '')}</div>`,
      iconSize: [24, 24],
      iconAnchor: iconAnchor ?? [12, 12],
    });
  }, [icon, iconAnchor]);

  return <Marker icon={leafletIcon} {...props} />;
};
MapMarker.displayName = 'MapMarker';

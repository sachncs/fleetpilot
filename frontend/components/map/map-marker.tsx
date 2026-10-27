'use client';

import * as React from 'react';
import type { MarkerProps } from 'react-leaflet';
import L from 'leaflet';
import { MapMarker as ShadcnMapMarker } from '@/components/ui/map';

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
  iconSize: _iconSize,
  iconAnchor,
  className,
  ...props
}) => {
  const iconNode = React.useMemo(() => {
    if (typeof icon === 'string') {
      return <span className={className} dangerouslySetInnerHTML={{ __html: icon }} />;
    }
    if (icon instanceof L.Icon) return undefined;
    return icon;
  }, [icon, className]);

  return (
    <ShadcnMapMarker
      icon={iconNode}
      iconAnchor={iconAnchor ?? [12, 12]}
      {...props}
    />
  );
};
MapMarker.displayName = 'MapMarker';

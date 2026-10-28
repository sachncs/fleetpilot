'use client';

import * as React from 'react';
import type { TileLayerProps } from 'react-leaflet';
import { MapTileLayer as ShadcnMapTileLayer } from '@/components/ui/map';

export interface MapTileLayerProps extends Omit<TileLayerProps, 'url'> {
  url?: string;
  darkUrl?: string;
  attribution?: string;
  darkAttribution?: string;
}

export const MapTileLayer: React.FC<MapTileLayerProps> = ({
  url,
  darkUrl,
  attribution,
  darkAttribution,
  ...props
}) => (
  <ShadcnMapTileLayer
    vectorStyleUrl="https://tiles.openfreemap.org/styles/positron"
    darkVectorStyleUrl="https://tiles.openfreemap.org/styles/dark"
    rasterUrl={url ?? '/map-fallback-light.svg'}
    darkRasterUrl={darkUrl ?? '/map-fallback-dark.svg'}
    rasterAttribution={attribution ?? 'FleetPilot degraded map mode'}
    darkRasterAttribution={darkAttribution ?? 'FleetPilot degraded map mode'}
    {...props}
  />
);
MapTileLayer.displayName = 'MapTileLayer';

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
    rasterUrl={url ?? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'}
    darkRasterUrl={darkUrl ?? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'}
    rasterAttribution={attribution ?? '&copy; OpenStreetMap contributors &copy; CARTO'}
    darkRasterAttribution={darkAttribution ?? '&copy; OpenStreetMap contributors &copy; CARTO'}
    {...props}
  />
);
MapTileLayer.displayName = 'MapTileLayer';

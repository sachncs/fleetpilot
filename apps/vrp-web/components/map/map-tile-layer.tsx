'use client';

import * as React from 'react';
import { TileLayer, type TileLayerProps } from 'react-leaflet';

const DEFAULT_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const DEFAULT_DARK_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export interface MapTileLayerProps extends Omit<TileLayerProps, 'url'> {
  url?: string;
  darkUrl?: string;
  attribution?: string;
  darkAttribution?: string;
}

export const MapTileLayer: React.FC<MapTileLayerProps> = ({
  url = DEFAULT_URL,
  darkUrl = DEFAULT_DARK_URL,
  attribution = DEFAULT_ATTRIBUTION,
  darkAttribution = DEFAULT_ATTRIBUTION,
  ...props
}) => {
  const [isDark, setIsDark] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return (
    <TileLayer
      attribution={isDark ? darkAttribution : attribution}
      url={isDark ? darkUrl : url}
      {...props}
    />
  );
};
MapTileLayer.displayName = 'MapTileLayer';


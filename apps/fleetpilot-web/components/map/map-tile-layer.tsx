'use client';

import * as React from 'react';
import { TileLayer, type TileLayerProps } from 'react-leaflet';

import { ALIDADE_SMOOTH, ALIDADE_SMOOTH_DARK } from '@/lib/map/tiles';
import { log } from '@/lib/log';

export interface MapTileLayerProps extends Omit<TileLayerProps, 'url'> {
  url?: string;
  darkUrl?: string;
  attribution?: string;
  darkAttribution?: string;
}

export const MapTileLayer: React.FC<MapTileLayerProps> = ({
  url = ALIDADE_SMOOTH.url,
  darkUrl = ALIDADE_SMOOTH_DARK.url,
  attribution = ALIDADE_SMOOTH.attribution,
  darkAttribution = ALIDADE_SMOOTH_DARK.attribution,
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

  React.useEffect(() => {
    log.debug('MapTileLayer mount', { isDark, url: isDark ? darkUrl : url });
  }, [isDark, url, darkUrl]);

  return (
    <TileLayer
      attribution={isDark ? darkAttribution : attribution}
      url={isDark ? darkUrl : url}
      {...props}
    />
  );
};
MapTileLayer.displayName = 'MapTileLayer';


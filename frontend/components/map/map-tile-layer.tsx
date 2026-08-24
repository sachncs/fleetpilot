'use client';

import * as React from 'react';
import { TileLayer, type TileLayerProps } from 'react-leaflet';
import { useTheme } from 'next-themes';

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
  const { resolvedTheme } = useTheme();
  // Tiles stay light until the theme resolves (first paint), then follow
  // the app theme so the basemap matches the ThemeToggle.
  const isDark = resolvedTheme === 'dark';

  React.useEffect(() => {
    log.debug('MapTileLayer mount', { isDark, url: isDark ? darkUrl : url });
  }, [isDark, url, darkUrl]);

  return (
    <TileLayer
      key={isDark ? 'dark' : 'light'}
      attribution={isDark ? darkAttribution : attribution}
      url={isDark ? darkUrl : url}
      {...props}
    />
  );
};
MapTileLayer.displayName = 'MapTileLayer';

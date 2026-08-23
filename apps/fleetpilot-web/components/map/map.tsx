'use client';

import * as React from 'react';
import { MapContainer, type MapContainerProps } from 'react-leaflet';
import L from 'leaflet';

import { cn } from '@/lib/utils';
import { log } from '@/lib/log';

import 'leaflet/dist/leaflet.css';

export interface MapProps extends Omit<MapContainerProps, 'ref'> {
  className?: string;
}

export const Map = React.forwardRef<L.Map, MapProps>(({ className, ...props }, ref) => {
  return (
    <MapContainer
      ref={ref}
      className={cn('h-full w-full', className)}
      zoomControl={false}
      whenReady={() => {
        log.debug('Leaflet container ready');
      }}
      {...props}
    />
  );
});
Map.displayName = 'Map';

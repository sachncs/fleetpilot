'use client';

import * as React from 'react';
import { MapContainer, type MapContainerProps } from 'react-leaflet';
import L from 'leaflet';

import { cn } from '@/lib/utils';

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
      {...props}
    />
  );
});
Map.displayName = 'Map';

'use client';

import * as React from 'react';
import type { MapContainerProps } from 'react-leaflet';
import L from 'leaflet';

import { cn } from '@/lib/utils';
import { Map as ShadcnMap } from '@/components/ui/map';

export interface MapProps extends Omit<MapContainerProps, 'ref' | 'center'> {
  center: L.LatLngExpression;
  className?: string;
}

export const Map = React.forwardRef<L.Map, MapProps>(({ className, style, ...props }, ref) => {
  return (
    <ShadcnMap
      ref={ref}
      className={cn('fleet-map h-full w-full rounded-none bg-background', className)}
      style={{ ...style, filter: 'grayscale(1)' }}
      {...props}
    />
  );
});
Map.displayName = 'Map';

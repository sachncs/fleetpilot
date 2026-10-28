'use client';

import * as React from 'react';
import type { PolylineProps } from 'react-leaflet';
import { MapPolyline as ShadcnMapPolyline } from '@/components/ui/map';

export type MapPolylineProps = PolylineProps;

export const MapPolyline: React.FC<MapPolylineProps> = (props) => {
  return <ShadcnMapPolyline {...props} />;
};
MapPolyline.displayName = 'MapPolyline';

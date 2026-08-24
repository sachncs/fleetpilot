'use client';

import * as React from 'react';
import { Polyline, type PolylineProps } from 'react-leaflet';

export type MapPolylineProps = PolylineProps;

export const MapPolyline: React.FC<MapPolylineProps> = (props) => {
  return <Polyline {...props} />;
};
MapPolyline.displayName = 'MapPolyline';

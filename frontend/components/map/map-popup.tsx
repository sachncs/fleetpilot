'use client';

import * as React from 'react';
import type { PopupProps } from 'react-leaflet';
import { MapPopup as ShadcnMapPopup } from '@/components/ui/map';

export type MapPopupProps = PopupProps;

export const MapPopup: React.FC<MapPopupProps> = (props) => {
  return <ShadcnMapPopup {...props} />;
};
MapPopup.displayName = 'MapPopup';

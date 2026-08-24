'use client';

import * as React from 'react';
import { Popup, type PopupProps } from 'react-leaflet';

export type MapPopupProps = PopupProps;

export const MapPopup: React.FC<MapPopupProps> = (props) => {
  return <Popup {...props} />;
};
MapPopup.displayName = 'MapPopup';

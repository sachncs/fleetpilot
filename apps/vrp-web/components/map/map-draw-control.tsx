'use client';

import * as React from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';

export interface MapDrawControlProps {
  onLayersChange?: (layers: L.FeatureGroup) => void;
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  className?: string;
  children?: React.ReactNode;
}

export const MapDrawControl: React.FC<MapDrawControlProps> = ({
  onLayersChange,
  position = 'topleft',
  className,
  children,
}) => {
  const map = useMap();
  const drawnItemsRef = React.useRef<L.FeatureGroup>(new L.FeatureGroup());
  const drawerRef = React.useRef<L.Control.Draw | null>(null);
  const handlerRef = React.useRef<{ markers: boolean; polyline: boolean }>({
    markers: true,
    polyline: false,
  });

  React.useEffect(() => {
    if (!map) return;
    const drawnItems = drawnItemsRef.current;
    map.addLayer(drawnItems);

    const DrawConstructor = (L.Control as unknown as { Draw: new (opts: unknown) => L.Control.Draw }).Draw;
    const drawer = new DrawConstructor({
      position,
      edit: {
        featureGroup: drawnItems,
      },
      draw: {
        marker: handlerRef.current.markers
          ? { icon: L.divIcon({ className: 'vrp-draw-marker', iconSize: [18, 18], iconAnchor: [9, 9] }) }
          : false,
        polyline: false,
        polygon: false,
        circle: false,
        rectangle: false,
        circlemarker: false,
      },
    });
    drawerRef.current = drawer;
    map.addControl(drawer);

    const onCreated = (e: L.LeafletEvent) => {
      const event = e as L.LeafletEvent & { layer: L.Layer };
      drawnItems.addLayer(event.layer);
      onLayersChange?.(drawnItems);
    };
    const onEdited = () => onLayersChange?.(drawnItems);
    const onDeleted = () => onLayersChange?.(drawnItems);
    map.on(L.Draw.Event.CREATED, onCreated);
    map.on(L.Draw.Event.EDITED, onEdited);
    map.on(L.Draw.Event.DELETED, onDeleted);

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated);
      map.off(L.Draw.Event.EDITED, onEdited);
      map.off(L.Draw.Event.DELETED, onDeleted);
      map.removeControl(drawer);
      map.removeLayer(drawnItems);
    };
  }, [map, onLayersChange, position]);

  return <div className={cn('hidden', className)}>{children}</div>;
};
MapDrawControl.displayName = 'MapDrawControl';

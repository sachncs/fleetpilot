/**
 * A KML Placemark as emitted by `GISExporter.toKml()`.
 */
export interface KmlPlacemark {
  name: string;
  description: string;
  coordinates: [number, number][] | [number, number];
  style: {
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;
  };
}

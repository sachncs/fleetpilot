/**
 * A single GeoJSON Feature — either a LineString (route) or a Point (depot / stop).
 */
export interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString' | 'Point';
    coordinates: [number, number][] | [number, number];
  };
  properties: Record<string, unknown>;
}

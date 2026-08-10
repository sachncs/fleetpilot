import type { GeoJsonFeature } from './geo-json-feature.js';

/**
 * A GeoJSON FeatureCollection as emitted by `GISExporter.toGeoJson()`.
 */
export interface GeoJson {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}
// Geometry utilities: convert between geographic lat/lng and the Euclidean
// (x, y) grid the solver uses, and interpolate vehicle positions along a
// route for the simulator playback.

import type { LatLngExpression } from 'leaflet';

const EARTH_RADIUS_M = 6_371_000;
const DEG_TO_RAD = Math.PI / 180;

export interface ReferenceOrigin {
  lat: number;
  lng: number;
}

/** Project lat/lng to local metres relative to the origin. */
export function latLngToMetres(origin: ReferenceOrigin, lat: number, lng: number): [number, number] {
  const dLat = (lat - origin.lat) * DEG_TO_RAD;
  const dLng = (lng - origin.lng) * DEG_TO_RAD;
  const latAvg = ((lat + origin.lat) / 2) * DEG_TO_RAD;
  const x = dLng * Math.cos(latAvg) * EARTH_RADIUS_M;
  const y = dLat * EARTH_RADIUS_M;
  return [x, y];
}

/** Project metres back to lat/lng. */
export function metresToLatLng(origin: ReferenceOrigin, x: number, y: number): [number, number] {
  const dLat = y / EARTH_RADIUS_M;
  const dLng = x / (EARTH_RADIUS_M * Math.cos(origin.lat * DEG_TO_RAD));
  const lat = origin.lat + dLat / DEG_TO_RAD;
  const lng = origin.lng + dLng / DEG_TO_RAD;
  return [lat, lng] as [number, number];
}

export function metresToLatLngExpr(origin: ReferenceOrigin, x: number, y: number): LatLngExpression {
  return metresToLatLng(origin, x, y);
}

/** Great-circle distance between two lat/lng points, in metres. */
export function haversineMetres(a: [number, number], b: [number, number]): number {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const aH =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(aH));
}

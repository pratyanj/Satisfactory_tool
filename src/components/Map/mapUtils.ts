/**
 * mapUtils.ts
 * Converts Unreal Engine world coordinates (cm) to Leaflet pixel coordinates.
 *
 * The map background is now served as a self-hosted tile pyramid
 * (public/map/v2/{z}/{x}/{y}.webp) instead of a single ~45MB PNG.
 * The tiles are baked for a specific projection, so this coordinate math
 * MUST match the tile pyramid exactly or markers won't line up with the map.
 *
 * Projection (matches rockfactory/satisfactory-logistics tile set):
 *   - Logical map is MAP_IMAGE_SIZE (256) px square at zoom 0 (one tile).
 *   - Leaflet CRS.Simple, latitude increases UPWARD.
 *   - Game +X → right (east).  Game +Y → DOWN the image (latitude 0 → -256).
 *
 * Satisfactory world bounds (Unreal units, cm):
 *   X: -324700 to 425300
 *   Y: -375000 to 375000
 */

import L from 'leaflet';

// ---- World bounds in Unreal Engine centimetres (must match the tile set) ----
export const UE_BOUNDS = {
  minX: -324_700,
  maxX: 425_300,
  minY: -375_000,
  maxY: 375_000,
};

/** Logical size of the map at zoom 0 — one 256px tile covers the whole world. */
export const MAP_IMAGE_SIZE = 256;

// ---- Zoom configuration (matches the self-hosted pyramid: zoom 0–6) ----
/**
 * Lowest zoom the user can reach. Below MIN_NATIVE_ZOOM there are no
 * tiles in the pyramid, so Leaflet downscales the zoom-0 tiles to let
 * the whole map shrink further into the viewport.
 */
export const MIN_ZOOM = 1;
/** Shallowest native tile level present in public/map/v2 (one 256px tile). */
export const MIN_NATIVE_ZOOM = 1;
/** Deepest native tile level we downloaded into public/map/v2. */
export const MAX_NATIVE_ZOOM = 6;
/** Extra zoom levels Leaflet may upscale past native tiles for smooth zoom-in. */
export const OVERZOOM_LEVELS = 2;
export const MAX_ZOOM = MAX_NATIVE_ZOOM + OVERZOOM_LEVELS; // 8
export const DEFAULT_ZOOM = 1;

const X_RANGE = UE_BOUNDS.maxX - UE_BOUNDS.minX;
const Y_RANGE = UE_BOUNDS.maxY - UE_BOUNDS.minY;

/**
 * Convert Unreal Engine X/Y (cm) to a Leaflet LatLng for CRS.Simple.
 * CRS.Simple treats LatLng as [lat=y_pixel, lng=x_pixel].
 */
export function gameToLatLng(ueX: number, ueY: number): L.LatLng {
  const px = ((ueX - UE_BOUNDS.minX) / X_RANGE) * MAP_IMAGE_SIZE;
  // Game +Y goes down the image, so latitude runs 0 → -MAP_IMAGE_SIZE.
  const py = -((ueY - UE_BOUNDS.minY) / Y_RANGE) * MAP_IMAGE_SIZE;
  return L.latLng(py, px);
}

/**
 * Inverse of gameToLatLng — converts Leaflet pixel coords back to UE world space (cm).
 * Used for the live cursor coordinate readout.
 */
export function latLngToGame(lat: number, lng: number): { x: number; y: number } {
  const x = (lng / MAP_IMAGE_SIZE) * X_RANGE + UE_BOUNDS.minX;
  const y = (-lat / MAP_IMAGE_SIZE) * Y_RANGE + UE_BOUNDS.minY;
  return { x, y };
}

/**
 * The full map bounds for Leaflet, as [southWest, northEast].
 * Image top edge = latitude 0, bottom edge = latitude -MAP_IMAGE_SIZE.
 */
export const MAP_BOUNDS: L.LatLngBoundsExpression = [
  [-MAP_IMAGE_SIZE, 0],
  [0, MAP_IMAGE_SIZE],
];

/** Default map centre. */
export const DEFAULT_CENTER: L.LatLngExpression = [-MAP_IMAGE_SIZE / 2, MAP_IMAGE_SIZE / 2];

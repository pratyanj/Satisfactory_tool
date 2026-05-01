/**
 * mapUtils.ts
 * Converts Unreal Engine world coordinates (cm) to Leaflet pixel coordinates.
 *
 * Satisfactory world bounds (Unreal units, cm):
 *   X: -324698 to 425302  (East–West, ~750km total)
 *   Y: -375000 to 375000  (North–South, ~750km total)
 *
 * The world map image is 4096 × 4096 px (or whatever we load).
 * We map those UE extents linearly to [0, MAP_SIZE].
 *
 * Leaflet CRS.Simple uses [y, x] order (row, col).
 * In the image:  top-left = min-Y(north), max-X(east) by convention.
 */

import L from 'leaflet';

// ---- World bounds in Unreal Engine centimetres ----
export const UE_BOUNDS = {
  minX: -324698,
  maxX: 425302,
  minY: -375000,
  maxY: 375000,
};

/** Size of the map image in pixels (assumed square). */
export const MAP_IMAGE_SIZE = 5000;

/**
 * Convert Unreal Engine X/Y (cm) to a Leaflet LatLng for CRS.Simple.
 * CRS.Simple treats LatLng as [y_pixel, x_pixel].
 */
export function gameToLatLng(ueX: number, ueY: number): L.LatLng {
  const { minX, maxX, minY, maxY } = UE_BOUNDS;

  // Normalise to [0,1]
  const normX = (ueX - minX) / (maxX - minX);
  // Y axis: Unreal +Y is South on the map image, so we flip it
  const normY = 1 - (ueY - minY) / (maxY - minY);

  const px = normX * MAP_IMAGE_SIZE;
  const py = normY * MAP_IMAGE_SIZE;

  // Leaflet CRS.Simple: LatLng(row, col) = LatLng(py, px)
  return L.latLng(py, px);
}

/**
 * The full map image bounds for Leaflet (top-left corner → bottom-right corner).
 * In CRS.Simple: [[maxRow, minCol], [minRow, maxCol]] = [[imageH, 0], [0, imageW]]
 */
export const MAP_BOUNDS: L.LatLngBoundsExpression = [
  [0, 0],
  [MAP_IMAGE_SIZE, MAP_IMAGE_SIZE],
];

/**
 * Inverse of gameToLatLng — converts Leaflet pixel coords back to UE world space (cm).
 * Used for live coordinate display on mouse move.
 */
export function latLngToGame(lat: number, lng: number): { x: number; y: number } {
  const { minX, maxX, minY, maxY } = UE_BOUNDS;

  // lng = px = normX * MAP_IMAGE_SIZE  →  normX = lng / MAP_IMAGE_SIZE
  const normX = lng / MAP_IMAGE_SIZE;
  // lat = py = (1 - normY) * MAP_IMAGE_SIZE  →  normY = 1 - lat/MAP_IMAGE_SIZE
  const normY = 1 - lat / MAP_IMAGE_SIZE;

  const x = normX * (maxX - minX) + minX;
  const y = normY * (maxY - minY) + minY;

  return { x, y };
}

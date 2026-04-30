/**
 * biomeDetector.ts
 * Point-in-polygon biome detection using ray-casting algorithm.
 * Biome polygons are defined in UE world coordinates (cm).
 */

interface BiomePolygon {
  name: string;
  color: string;
  /** Array of [x, y] points in UE centimetres */
  polygon: [number, number][];
}

let biomesCache: BiomePolygon[] | null = null;
let loadPromise: Promise<BiomePolygon[]> | null = null;

/** Load biome data once and cache it */
async function loadBiomes(): Promise<BiomePolygon[]> {
  if (biomesCache) return biomesCache;
  if (loadPromise) return loadPromise;

  loadPromise = fetch('/data/biomes.json')
    .then(r => r.json())
    .then((data: BiomePolygon[]) => {
      biomesCache = data;
      return data;
    })
    .catch(() => {
      biomesCache = [];
      return [] as BiomePolygon[];
    });

  return loadPromise;
}

/**
 * Ray-casting point-in-polygon test.
 * @param px  UE world X (cm)
 * @param py  UE world Y (cm)
 * @param poly  Array of [x, y] polygon vertices
 */
function pointInPolygon(px: number, py: number, poly: [number, number][]): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Synchronous biome lookup (returns 'Unknown' if cache not ready).
 * Call `initBiomes()` first to warm the cache.
 */
export function getBiome(ueX: number, ueY: number): string {
  if (!biomesCache) return 'Unknown';
  for (const biome of biomesCache) {
    if (pointInPolygon(ueX, ueY, biome.polygon)) {
      return biome.name;
    }
  }
  return 'Wilderness';
}

/** Pre-load biome data (call once at app startup / on map mount) */
export async function initBiomes(): Promise<void> {
  await loadBiomes();
}

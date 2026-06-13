/**
 * buildingFootprints.ts
 * Approximate building footprint sizes (width × length, in Unreal cm) keyed by
 * class-path keyword, used to draw each building as a rotated rectangle on the
 * map — the clean "factory blueprint" look (à la satisfactory-logistics).
 *
 * Sizes are close-enough approximations of the in-game footprints; exact
 * precision isn't needed at map scale. Unknown buildables fall back to DEFAULT.
 */
import L from 'leaflet';
import type { SaveBuilding, Quaternion } from '../../types/save';
import { gameToLatLng } from './mapUtils';

/** [widthCm, lengthCm] keyed by a substring of the building class path. */
const FOOTPRINTS: Array<[string, [number, number]]> = [
  // ── Extraction ──
  ['Build_MinerMk',            [600, 1400]],
  ['Build_WaterPump',          [2000, 2000]],
  ['Build_OilPump',            [600, 1400]],
  ['Build_FrackingActivator',  [2000, 2000]],
  ['Build_FrackingExtractor',  [400, 400]],
  // ── Smelting ──
  ['Build_SmelterMk1',         [600, 900]],
  ['Build_FoundryMk1',         [1000, 900]],
  // ── Production ──
  ['Build_ConstructorMk1',     [800, 950]],
  ['Build_AssemblerMk1',       [1000, 1500]],
  ['Build_ManufacturerMk1',    [1800, 1950]],
  ['Build_Packager',           [800, 800]],
  ['Build_OilRefinery',        [1000, 3100]],
  ['Build_Refinery',           [1000, 3100]],
  ['Build_Blender',            [1800, 1600]],
  ['Build_HadronCollider',     [3800, 3700]],
  ['Build_QuantumEncoder',     [1100, 2100]],
  ['Build_Converter',          [1600, 1600]],
  ['Build_AlienPowerAugmenter',[1100, 1100]],
  // ── Power ──
  ['Build_GeneratorCoal',      [1000, 2600]],
  ['Build_GeneratorFuel',      [2000, 2000]],
  ['Build_GeneratorNuclear',   [4300, 4300]],
  ['Build_GeneratorBiomass',   [800, 800]],
  ['Build_GeneratorGeoThermal',[1900, 1900]],
  ['Build_PowerStorage',       [1000, 1000]],
  ['Build_PowerPole',          [120, 120]],
  ['Build_PowerSwitch',        [200, 200]],
  // ── Logistics ── (real class names are Build_ConveyorAttachmentSplitter/Merger…)
  ['Build_ConveyorPole',       [80, 80]],
  ['Splitter',                 [200, 200]],
  ['Merger',                   [200, 200]],
  ['ConveyorAttachment',       [200, 200]],
  ['Build_ConveyorLift',       [200, 200]],
  ['Build_DroneStation',       [1100, 1100]],
  ['Build_TrainStation',       [1600, 3400]],
  ['Build_RailroadStation',    [1600, 3400]],
  ['Build_TruckStation',       [1900, 1900]],
  ['Build_TruckDockStation',   [1900, 1900]],
  // ── Storage ──
  ['Build_StorageContainerMk1',[500, 1000]],
  ['Build_StorageContainerMk2',[800, 1500]],
  ['Build_StorageIntegrated',  [500, 1000]],
  ['Build_PipeStorageTank',    [800, 800]],
  ['Build_IndustrialTank',     [1100, 1100]],
  ['Build_LiquidTank',         [800, 800]],
  // ── Special / structural ──
  ['Build_SpaceElevator',      [5400, 5000]],
  ['Build_AwesomeSink',        [1600, 2400]],
  ['Build_AwesomeShop',        [800, 800]],
  ['Build_TradingPost',        [2400, 3700]], // The HUB
  ['Build_Foundation',         [800, 800]],
  ['Build_Wall',               [800, 100]],
  ['Build_Ramp',               [800, 800]],
  ['Build_Floor',              [800, 800]],
];

/** Default footprint for unknown buildables. */
const DEFAULT: [number, number] = [700, 700];

/** Look up a building's footprint (cm) by its class path. */
export function getFootprintCm(typePath: string): { w: number; l: number } {
  for (const [key, [w, l]] of FOOTPRINTS) {
    if (typePath.includes(key)) return { w, l };
  }
  return { w: DEFAULT[0], l: DEFAULT[1] };
}

/** Yaw (rotation about the vertical Z axis), in radians, from a quaternion. */
export function yawFromQuat(q: Quaternion): number {
  const siny = 2 * (q.w * q.z + q.x * q.y);
  const cosy = 1 - 2 * (q.y * q.y + q.z * q.z);
  return Math.atan2(siny, cosy);
}

/**
 * The four corners of a building's footprint, as Leaflet LatLngs.
 * Corners are computed in game space (so they rotate with yaw), then mapped
 * through gameToLatLng — keeping them aligned with the tiles like every other
 * map layer.
 */
export function footprintCorners(b: SaveBuilding): L.LatLng[] {
  const { w, l } = getFootprintCm(b.typePath);
  const yaw = yawFromQuat(b.rotation);
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const hw = w / 2;
  const hl = l / 2;
  const cx = b.position.x;
  const cy = b.position.y;

  // Local corner offsets (half-width along X, half-length along Y), rotated by yaw.
  const offsets: Array<[number, number]> = [
    [-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl],
  ];
  return offsets.map(([sx, sy]) =>
    gameToLatLng(cx + sx * cos - sy * sin, cy + sx * sin + sy * cos)
  );
}

/**
 * saveParser.ts
 * Wraps @etothepii/satisfactory-file-parser to extract map-relevant data.
 *
 * Geometry extraction follows the approach proven by rockfactory/satisfactory-logistics
 * (which uses the same library) — because the library stores geometry in
 * specific, non-obvious places:
 *   - Belts/pipes: per-entity `mSplineData[].Location` — LOCAL coords, must be
 *     rotated by the actor yaw and translated by its world position.
 *   - Power wires: per-entity `mWireInstances[].Locations` — already WORLD coords.
 *   - Foundations/walls/decor (Satisfactory 1.0+): NOT standalone entities —
 *     thousands are packed into one `FGLightweightBuildableSubsystem` actor under
 *     `specialProperties.buildables[].instances[]`, each with a world transform.
 */

import { Parser } from '@etothepii/satisfactory-file-parser';
import type {
  ParsedSave,
  SaveBuilding,
  SaveConveyor,
  SavePipe,
  SavePowerLine,
  Vec3,
  Quaternion,
  PlayerInfo,
} from '../types/save';

const CONVEYOR_KEYWORDS = ['ConveyorBelt', 'ConveyorLift'];
const PIPE_KEYWORDS     = ['Build_Pipeline', 'PipelineMk', 'Build_PipeHyper'];
const POWERLINE_KEYWORDS = ['PowerLine'];
const LIGHTWEIGHT_SUBSYSTEM = 'FGLightweightBuildableSubsystem';

// Class path keywords for power classification
const GENERATOR_KEYWORDS = [
  'GeneratorCoal', 'GeneratorFuel', 'GeneratorNuclear',
  'GeneratorBiomass', 'GeneratorGeoThermal', 'GeneratorSteam',
];
const BATTERY_KEYWORDS = ['PowerStorage'];
const PLAYER_KEYWORDS  = ['Char_Player_C', 'BP_PlayerState'];

function toVec3(t?: { x?: number; y?: number; z?: number }): Vec3 {
  return { x: t?.x ?? 0, y: t?.y ?? 0, z: t?.z ?? 0 };
}
function toQuat(r?: { x?: number; y?: number; z?: number; w?: number }): Quaternion {
  return { x: r?.x ?? 0, y: r?.y ?? 0, z: r?.z ?? 0, w: r?.w ?? 1 };
}

/** Safely extract a numeric property from the raw properties bag. */
function getPropNum(properties: Record<string, unknown>, key: string): number | null {
  const raw = (properties[key] as any)?.value ?? properties[key];
  if (typeof raw === 'number') return raw;
  return null;
}

/** Coerce an unknown value to Vec3 if it looks like one ({x,y[,z]}). */
function toVec3FromAny(v: any): Vec3 | null {
  const c = v?.value ?? v;
  if (c && typeof c.x === 'number' && typeof c.y === 'number') {
    return { x: c.x, y: c.y, z: typeof c.z === 'number' ? c.z : 0 };
  }
  return null;
}

/** Unwrap an ArrayProperty / raw array into its element list. */
function arrayValues(prop: any): any[] {
  if (!prop) return [];
  if (Array.isArray(prop)) return prop;
  if (Array.isArray(prop.values)) return prop.values;
  if (Array.isArray(prop.value?.values)) return prop.value.values;
  if (Array.isArray(prop.value)) return prop.value;
  return [];
}

/** The named sub-properties of a struct array element. */
function structProps(el: any): any {
  return el?.properties ?? el?.value?.properties ?? el?.value ?? el;
}

/** Yaw (rotation about vertical Z), radians, from a quaternion. */
function yawFromQuat(q: Quaternion): number {
  const siny = 2 * (q.w * q.z + q.x * q.y);
  const cosy = 1 - 2 * (q.y * q.y + q.z * q.z);
  return Math.atan2(siny, cosy);
}

/**
 * Read a spline's LOCAL points from `mSplineData` (or `mSplinePoints` for
 * vehicles) and transform them into WORLD space using the actor's position+yaw.
 */
function readSplineWorldPath(
  properties: Record<string, unknown>,
  origin: Vec3,
  rot: Quaternion,
  propName: string = 'mSplineData',
): Vec3[] | null {
  const els = arrayValues((properties as any)[propName]);
  if (els.length < 2) return null;
  const yaw = yawFromQuat(rot);
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const out: Vec3[] = [];
  for (const el of els) {
    const sp = structProps(el);
    const loc = toVec3FromAny(sp?.Location ?? sp?.location);
    if (!loc) continue;
    out.push({
      x: origin.x + loc.x * cos - loc.y * sin,
      y: origin.y + loc.x * sin + loc.y * cos,
      z: origin.z + loc.z,
    });
  }
  return out.length >= 2 ? out : null;
}

/**
 * Read per-wire WORLD polylines from `mWireInstances[].Locations`.
 * (`CachedRelativeLocations` is the relative variant — intentionally ignored.)
 */
function readPowerWires(properties: Record<string, unknown>): Vec3[][] {
  const wires = arrayValues((properties as any).mWireInstances);
  const out: Vec3[][] = [];
  for (const wire of wires) {
    const wp = structProps(wire);
    const locs = arrayValues(wp?.Locations ?? wp?.locations);
    const pts: Vec3[] = [];
    for (const item of locs) {
      const v = toVec3FromAny(item);
      if (v) pts.push(v);
    }
    if (pts.length >= 2) out.push(pts);
  }
  return out;
}

export type ParseProgress = { progress: number; message: string };

export async function parseSaveFile(
  saveName: string,
  buffer: ArrayBuffer,
  onProgress?: (p: ParseProgress) => void,
): Promise<ParsedSave> {
  onProgress?.({ progress: 0.05, message: 'Starting parser…' });

  const save = Parser.ParseSave(saveName, buffer, {
    throwErrors: false,
    onProgressCallback: (progress: number, msg?: string) => {
      onProgress?.({ progress: 0.05 + progress * 0.85, message: msg ?? 'Parsing…' });
    },
  });

  onProgress?.({ progress: 0.92, message: 'Extracting buildings…' });

  const buildings: SaveBuilding[]   = [];
  const conveyors: SaveConveyor[]   = [];
  const pipes: SavePipe[]           = [];
  const powerLines: SavePowerLine[] = [];
  const players: PlayerInfo[]       = [];

  let totalObjectCount = 0;
  let totalProduction  = 0;
  let totalConsumption = 0;
  let batteryCount     = 0;
  let generatorCount   = 0;
  let lightweightCount = 0;
  // First-seen raw samples, logged only if extraction of that kind yields nothing,
  // so we can see the real property shape and fix the field path.
  let sampleConveyorProps: any = null;
  let samplePowerProps: any = null;
  let sampleLwSpecial: any = null;

  for (const level of Object.values(save.levels)) {
    const objects = (level as any).objects ?? [];
    totalObjectCount += objects.length;

    for (const obj of objects) {
      const typePath: string     = obj.typePath ?? '';
      const instanceName: string = obj.instanceName ?? '';
      const position = toVec3(obj.transform?.translation);
      const rot      = toQuat(obj.transform?.rotation);
      const props: Record<string, unknown> = obj.properties ?? {};
      const special: any = (obj as any).specialProperties;

      // ── Lightweight buildable subsystem (foundations/walls/decor) ─────────
      // Satisfactory 1.0+ aggregates thousands of structural pieces here.
      if (typePath.includes(LIGHTWEIGHT_SUBSYSTEM) || special?.type === 'BuildableSubsystemSpecialProperties') {
        if (!sampleLwSpecial) sampleLwSpecial = special;
        for (const group of (special?.buildables ?? [])) {
          const gPath: string = group?.typeReference?.pathName ?? group?.typeReference?.value?.pathName ?? '';
          if (!gPath) continue;
          for (const inst of (group?.instances ?? [])) {
            const pos = toVec3FromAny(inst?.transform?.translation);
            if (!pos) continue;
            buildings.push({
              typePath: gPath,
              instanceName: `lw_${lightweightCount++}`,
              position: pos,
              rotation: toQuat(inst?.transform?.rotation),
              properties: {},
              structural: true,
            });
          }
        }
        continue;
      }

      // ── Players ──────────────────────────────────────────────
      if (PLAYER_KEYWORDS.some(k => typePath.includes(k))) {
        const name = (props.mCachedPlayerName as any)?.value ?? (props.PlayerName as any)?.value ?? 'Pioneer';
        players.push({ name: typeof name === 'string' ? name : 'Pioneer', position });
        continue;
      }

      // ── Conveyors (belt route from mSplineData, local→world) ──
      if (CONVEYOR_KEYWORDS.some(k => typePath.includes(k))) {
        if (!sampleConveyorProps) sampleConveyorProps = props;
        const path = readSplineWorldPath(props, position, rot, 'mSplineData');
        if (path) {
          conveyors.push({ instanceName, typePath, startPosition: path[0], endPosition: path[path.length - 1], path });
        } else {
          conveyors.push({ instanceName, typePath, startPosition: position, endPosition: position });
        }
        continue;
      }

      // ── Pipes (route from mSplineData, local→world) ──────────
      if (PIPE_KEYWORDS.some(k => typePath.includes(k))) {
        const path = readSplineWorldPath(props, position, rot, 'mSplineData');
        if (path) {
          pipes.push({ instanceName, typePath, startPosition: path[0], endPosition: path[path.length - 1], path });
        } else {
          pipes.push({ instanceName, typePath, startPosition: position, endPosition: position });
        }
        continue;
      }

      // ── Power lines (wire polylines from mWireInstances, world) ──
      if (POWERLINE_KEYWORDS.some(k => typePath.includes(k))) {
        if (!samplePowerProps) samplePowerProps = props;
        const wires = readPowerWires(props);
        if (wires.length > 0) {
          wires.forEach((w, i) => {
            powerLines.push({
              instanceName: `${instanceName}_w${i}`,
              startPosition: w[0],
              endPosition: w[w.length - 1],
              path: w,
            });
          });
        } else {
          // Fallback: power line special properties carry the endpoints directly.
          const start = toVec3FromAny(special?.sourceTranslation);
          const end   = toVec3FromAny(special?.targetTranslation);
          if (start && end) {
            powerLines.push({ instanceName, startPosition: start, endPosition: end, path: [start, end] });
          }
        }
        continue;
      }

      // ── Buildable actors (machines, generators, storage, …) ──
      if (
        typePath.includes('/Game/FactoryGame/Buildable/') ||
        typePath.includes('Hub') ||
        typePath.includes('SpaceElevator') ||
        typePath.includes('AwesomeSink') ||
        typePath.includes('AwesomeShop')
      ) {
        if (GENERATOR_KEYWORDS.some(k => typePath.includes(k))) {
          generatorCount++;
          const prod = getPropNum(props, 'mPowerProduction');
          if (prod !== null) totalProduction += prod;
          else {
            if (typePath.includes('GeneratorCoal'))         totalProduction += 75;
            else if (typePath.includes('GeneratorFuel'))    totalProduction += 150;
            else if (typePath.includes('GeneratorNuclear')) totalProduction += 2500;
            else if (typePath.includes('GeneratorBiomass')) totalProduction += 30;
            else if (typePath.includes('GeneratorGeoThermal')) totalProduction += 200;
          }
        }
        if (BATTERY_KEYWORDS.some(k => typePath.includes(k))) batteryCount++;

        const cons = getPropNum(props, 'mPowerConsumption');
        if (cons !== null) totalConsumption += cons;

        buildings.push({ typePath, instanceName, position, rotation: rot, properties: props });
      }
    }
  }

  const beltsWithPath = conveyors.filter(c => c.path && c.path.length >= 2).length;
  const wiredPower    = powerLines.filter(p => p.path && p.path.length >= 2).length;
  console.log(
    `[saveParser] buildings=${buildings.length} (lightweight/foundations=${lightweightCount}) ` +
    `conveyors=${conveyors.length} (withPath=${beltsWithPath}) pipes=${pipes.length} ` +
    `powerLines=${powerLines.length} (wired=${wiredPower}) players=${players.length}`,
  );

  // If a geometry kind came out empty, dump the raw shape of the first such
  // object so the actual library field path can be identified.
  const dump = (label: string, v: any) => {
    try { console.log(`[saveParser:debug] ${label}:`, JSON.stringify(v, (_k, val) =>
      typeof val === 'bigint' ? val.toString() : val).slice(0, 1200)); }
    catch { console.log(`[saveParser:debug] ${label}: <unserializable>`, v); }
  };
  if (beltsWithPath === 0 && sampleConveyorProps) {
    dump('conveyor prop keys', Object.keys(sampleConveyorProps));
    dump('conveyor.mSplineData', (sampleConveyorProps as any).mSplineData);
  }
  if (wiredPower === 0 && samplePowerProps) {
    dump('powerline prop keys', Object.keys(samplePowerProps));
    dump('powerline.mWireInstances', (samplePowerProps as any).mWireInstances);
  }
  if (lightweightCount === 0 && sampleLwSpecial) {
    dump('lightweight special', sampleLwSpecial);
  }

  onProgress?.({ progress: 1.0, message: 'Done!' });

  const finalPlayers = players.length > 0
    ? players
    : [{ name: 'Pioneer', position: { x: 0, y: 0, z: 0 } }];

  return {
    saveName,
    buildings,
    conveyors,
    pipes,
    powerLines,
    parsedAt: Date.now(),
    totalObjectCount,
    players: finalPlayers,
    powerData: {
      totalProduction: Math.round(totalProduction),
      totalConsumption: Math.round(totalConsumption),
      batteryCount,
      generatorCount,
    },
  };
}

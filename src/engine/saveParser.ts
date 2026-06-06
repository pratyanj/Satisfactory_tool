/**
 * saveParser.ts
 * Wraps @etothepii/satisfactory-file-parser to extract map-relevant data.
 * Sprint 3: adds player position extraction + power data aggregation.
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
  PowerData,
} from '../types/save';

const CONVEYOR_KEYWORDS = ['ConveyorBelt', 'ConveyorLift'];
const PIPE_KEYWORDS     = ['Build_Pipeline', 'Build_PipelineMk2'];
const POWERLINE_KEYWORDS = ['PowerLine'];

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

/** Safely extract a numeric property from the raw properties bag */
function getPropNum(properties: Record<string, unknown>, key: string): number | null {
  const raw = (properties[key] as any)?.value ?? properties[key];
  if (typeof raw === 'number') return raw;
  return null;
}

/** Coerce an unknown value to Vec3 if it looks like one ({x,y[,z]}). */
function toVec3FromAny(v: any): Vec3 | null {
  if (v && typeof v.x === 'number' && typeof v.y === 'number') {
    return { x: v.x, y: v.y, z: typeof v.z === 'number' ? v.z : 0 };
  }
  return null;
}

/**
 * A power-line connection ref points at a PowerConnection *component* whose path
 * is "<buildingInstanceName>.PowerConnection...". Strip the trailing component to
 * get the owning building's instance name.
 */
function ownerFromConnectionPath(pathName: string): string {
  const i = pathName.lastIndexOf('.');
  return i > 0 ? pathName.slice(0, i) : pathName;
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
  // Belt geometry comes from two sources depending on save version:
  //  - chainConveyors: ConveyorChainActor special properties (Satisfactory 1.0) — full spline paths
  //  - beltConveyors:  per-belt fallback (zero-length point if no spline available)
  const chainConveyors: SaveConveyor[] = [];
  const beltConveyors: SaveConveyor[]  = [];
  const pipes: SavePipe[]           = [];
  const powerLines: SavePowerLine[] = [];
  const players: PlayerInfo[]       = [];
  // instanceName/path -> world position, for resolving power-line connection refs
  const instancePos = new Map<string, Vec3>();
  // power lines are resolved after the loop, once every position is known
  const pendingPowerLines: { instanceName: string; position: Vec3; sp: any }[] = [];

  let totalObjectCount = 0;
  let totalProduction  = 0;
  let totalConsumption = 0;
  let batteryCount     = 0;
  let generatorCount   = 0;

  for (const level of Object.values(save.levels)) {
    const objects = (level as any).objects ?? [];
    totalObjectCount += objects.length;

    for (const obj of objects) {
      const typePath: string    = obj.typePath ?? '';
      const instanceName: string = obj.instanceName ?? '';
      const translation = obj.transform?.translation;
      const rotation    = obj.transform?.rotation;

      const position = toVec3(translation);
      const rot      = toQuat(rotation);
      const props: Record<string, unknown> = obj.properties ?? {};
      const special: any = (obj as any).specialProperties;

      if (instanceName) instancePos.set(instanceName, position);

      // ── Conveyor chain actors (Satisfactory 1.0): full belt spline path ──
      if (special?.type === 'ConveyorChainActorSpecialProperties' && Array.isArray(special.beltsInChain)) {
        try {
          const path: Vec3[] = [];
          for (const seg of special.beltsInChain) {
            for (const pt of (seg?.splinePoints ?? [])) {
              const loc = toVec3FromAny(pt?.location);
              if (loc) path.push(loc);
            }
          }
          if (path.length >= 2) {
            chainConveyors.push({
              instanceName, typePath,
              startPosition: path[0], endPosition: path[path.length - 1], path,
            });
          }
        } catch { /* ignore malformed chain */ }
        continue;
      }

      // ── Players ──────────────────────────────────────────────
      if (PLAYER_KEYWORDS.some(k => typePath.includes(k))) {
        const name =
          (getPropNum(props, 'mCachedPlayerName') as any) ??
          (props.mCachedPlayerName as any)?.value ??
          (props.PlayerName as any)?.value ??
          'Pioneer';
        players.push({
          name: typeof name === 'string' ? name : 'Pioneer',
          position,
        });
        continue;
      }

      // ── Conveyors (per-belt fallback; geometry may be empty) ──
      if (CONVEYOR_KEYWORDS.some(k => typePath.includes(k))) {
        beltConveyors.push({ instanceName, typePath, startPosition: position, endPosition: position });
        continue;
      }

      // ── Pipes ────────────────────────────────────────────────
      if (PIPE_KEYWORDS.some(k => typePath.includes(k))) {
        pipes.push({ instanceName, typePath, startPosition: position, endPosition: position });
        continue;
      }

      // ── Power lines (resolved after the loop, once positions are known) ──
      if (POWERLINE_KEYWORDS.some(k => typePath.includes(k))) {
        pendingPowerLines.push({ instanceName, position, sp: special });
        continue;
      }

      // ── Buildable actors ─────────────────────────────────────
      if (
        typePath.includes('/Game/FactoryGame/Buildable/') ||
        typePath.includes('Hub') ||
        typePath.includes('SpaceElevator') ||
        typePath.includes('MAM') ||
        typePath.includes('AwesomeSink') ||
        typePath.includes('AwesomeShop')
      ) {
        // Aggregate power data
        if (GENERATOR_KEYWORDS.some(k => typePath.includes(k))) {
          generatorCount++;
          const prod = getPropNum(props, 'mPowerProduction');
          if (prod !== null) totalProduction += prod;
          else {
            // Estimate from class defaults (rough values in MW)
            if (typePath.includes('GeneratorCoal'))    totalProduction += 75;
            else if (typePath.includes('GeneratorFuel'))   totalProduction += 150;
            else if (typePath.includes('GeneratorNuclear')) totalProduction += 2500;
            else if (typePath.includes('GeneratorBiomass')) totalProduction += 30;
            else if (typePath.includes('GeneratorGeoThermal')) totalProduction += 200;
          }
        }

        if (BATTERY_KEYWORDS.some(k => typePath.includes(k))) {
          batteryCount++;
        }

        const cons = getPropNum(props, 'mPowerConsumption');
        if (cons !== null) totalConsumption += cons;

        buildings.push({ typePath, instanceName, position, rotation: rot, properties: props });
      }
    }
  }

  // ── Resolve power-line endpoints ─────────────────────────────
  // Prefer the translations stored on the line; otherwise look up the owning
  // building's position from the source/target connection refs.
  const resolvePos = (ref: any): Vec3 | null => {
    const pathName: string | undefined = ref?.pathName;
    if (!pathName) return null;
    return instancePos.get(pathName)
        ?? instancePos.get(ownerFromConnectionPath(pathName))
        ?? null;
  };
  for (const pw of pendingPowerLines) {
    const sp = pw.sp;
    const start = toVec3FromAny(sp?.sourceTranslation) ?? resolvePos(sp?.source) ?? pw.position;
    const end   = toVec3FromAny(sp?.targetTranslation) ?? resolvePos(sp?.target) ?? pw.position;
    powerLines.push({ instanceName: pw.instanceName, startPosition: start, endPosition: end });
  }

  // Prefer real belt spline paths (chain actors) when present; else per-belt points.
  const conveyors: SaveConveyor[] = chainConveyors.length > 0 ? chainConveyors : beltConveyors;

  const wiredCount = powerLines.filter(
    p => p.startPosition.x !== p.endPosition.x || p.startPosition.y !== p.endPosition.y,
  ).length;
  console.log(
    `[saveParser] conveyors=${conveyors.length} (chains=${chainConveyors.length}, belts=${beltConveyors.length}) ` +
    `powerLines=${powerLines.length} (wired=${wiredCount}) pipes=${pipes.length}`,
  );

  onProgress?.({ progress: 1.0, message: 'Done!' });

  // If we found no players at the explicit player character class,
  // add a placeholder so the map still has something to show
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

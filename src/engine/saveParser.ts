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

      // ── Conveyors ────────────────────────────────────────────
      if (CONVEYOR_KEYWORDS.some(k => typePath.includes(k))) {
        conveyors.push({ instanceName, typePath, startPosition: position, endPosition: position });
        continue;
      }

      // ── Pipes ────────────────────────────────────────────────
      if (PIPE_KEYWORDS.some(k => typePath.includes(k))) {
        pipes.push({ instanceName, typePath, startPosition: position, endPosition: position });
        continue;
      }

      // ── Power lines ──────────────────────────────────────────
      if (POWERLINE_KEYWORDS.some(k => typePath.includes(k))) {
        powerLines.push({ instanceName, startPosition: position, endPosition: position });
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

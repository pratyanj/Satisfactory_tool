/**
 * save.ts
 * TypeScript interfaces describing the data extracted from a Satisfactory .sav file.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** A single placed building / actor extracted from the save. */
export interface SaveBuilding {
  /** Unreal class path, e.g. "/Game/FactoryGame/Buildable/Factory/SmelterMk1/Build_SmelterMk1.Build_SmelterMk1_C" */
  typePath: string;
  /** Short instance name for identification */
  instanceName: string;
  /** World position in Unreal Engine centimetres */
  position: Vec3;
  /** World rotation (quaternion) */
  rotation: Quaternion;
  /** Raw properties map — varies per actor type */
  properties: Record<string, unknown>;
}

/** A conveyor belt segment (start + end point pair from save data). */
export interface SaveConveyor {
  instanceName: string;
  startPosition: Vec3;
  endPosition: Vec3;
  /** Belt class path determines tier */
  typePath: string;
  /** Full spline path (world cm) when available — renders the actual belt route. */
  path?: Vec3[];
}

/** A fluid pipe segment */
export interface SavePipe {
  instanceName: string;
  startPosition: Vec3;
  endPosition: Vec3;
  typePath: string;
  /** Full spline path (world cm) when available — renders the actual pipe route. */
  path?: Vec3[];
}

/** A power line connection between two poles */
export interface SavePowerLine {
  instanceName: string;
  startPosition: Vec3;
  endPosition: Vec3;
}

/** Fully parsed save data ready for the map */
export interface PowerData {
  totalProduction: number;  // MW
  totalConsumption: number; // MW
  batteryCount: number;
  generatorCount: number;
}

export interface PlayerInfo {
  name: string;
  position: Vec3;
}

export interface ParsedSave {
  saveName: string;
  buildings: SaveBuilding[];
  conveyors: SaveConveyor[];
  pipes: SavePipe[];
  powerLines: SavePowerLine[];
  /** Parsed at timestamp */
  parsedAt: number;
  /** Raw total object count in the save */
  totalObjectCount: number;
  /** Extracted player positions and names */
  players: PlayerInfo[];
  /** Aggregated power grid data */
  powerData: PowerData;
}

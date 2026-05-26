/**
 * FICSIT Sandbox — Core Type Definitions
 * Pure types only. No imports from React or PixiJS.
 */

import type { MachineId, RecipeId, ItemId } from '../data';

// ─── Grid ────────────────────────────────────────────────────────────────────

/** A position on the foundation grid (1 cell = 1 foundation = 8m × 8m) */
export interface GridPosition {
  col: number;
  row: number;
}

/** Machine footprint in foundation units */
export interface MachineFootprint {
  width: number;  // columns
  height: number; // rows
}

// ─── Ports ───────────────────────────────────────────────────────────────────

export type PortType = 'input' | 'output';
export type PortMedium = 'belt' | 'pipe';

/** A port definition in the machine registry (relative to top-left of machine) */
export interface PortDefinition {
  id: string;           // e.g. "in0", "out0"
  type: PortType;
  medium: PortMedium;
  /** Position relative to top-left cell, in fraction of machine width/height */
  relX: number;
  relY: number;
}

// ─── Placed Entities ─────────────────────────────────────────────────────────

export type SandboxMachineId = string; // UUID for placed instances

export interface SandboxMachine {
  instanceId: SandboxMachineId;
  machineId: MachineId;
  /** Top-left corner on the grid */
  position: GridPosition;
  /** 0 | 90 | 180 | 270 */
  rotation: 0 | 90 | 180 | 270;
  recipeId: RecipeId | null;
  /** Overclock percentage: 1–250 */
  overclock: number;
}

export type SandboxBeltId = string; // UUID

export interface SandboxPort {
  machineInstanceId: SandboxMachineId;
  portId: string; // matches PortDefinition.id
}

export interface SandboxBelt {
  beltId: SandboxBeltId;
  from: SandboxPort;
  to: SandboxPort;
  /** Belt tier: 'mk1'–'mk6' */
  tier: string;
}

// ─── Full State ───────────────────────────────────────────────────────────────

export interface SandboxState {
  machines: SandboxMachine[];
  belts: SandboxBelt[];
  /** Which machine is currently selected */
  selectedMachineId: SandboxMachineId | null;
  /** Which belt is currently selected (mutually exclusive with machine selection) */
  selectedBeltId: SandboxBeltId | null;
  /** Viewport offset in pixels */
  viewOffset: { x: number; y: number };
  /** Zoom level (1.0 = 100%) */
  zoom: number;
  /** Foundation cell size in pixels at zoom=1 */
  cellSize: number;
  /** Show grid overlay */
  showGrid: boolean;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type SandboxAction =
  | { type: 'PLACE_MACHINE'; machine: SandboxMachine }
  | { type: 'MOVE_MACHINE'; instanceId: SandboxMachineId; position: GridPosition }
  | { type: 'ROTATE_MACHINE'; instanceId: SandboxMachineId }
  | { type: 'DELETE_MACHINE'; instanceId: SandboxMachineId }
  | { type: 'SELECT_MACHINE'; instanceId: SandboxMachineId | null }
  | { type: 'SET_RECIPE'; instanceId: SandboxMachineId; recipeId: RecipeId }
  | { type: 'SET_OVERCLOCK'; instanceId: SandboxMachineId; overclock: number }
  | { type: 'ADD_BELT'; belt: SandboxBelt }
  | { type: 'DELETE_BELT'; beltId: SandboxBeltId }
  | { type: 'SELECT_BELT'; beltId: SandboxBeltId | null }
  | { type: 'SET_BELT_TIER'; beltId: SandboxBeltId; tier: string }
  | { type: 'SET_VIEWPORT'; offset: { x: number; y: number }; zoom: number }
  | { type: 'TOGGLE_GRID' }
  | { type: 'LOAD_STATE'; state: SandboxState }
  | { type: 'CLEAR_ALL' };

// ─── Simulation Results ───────────────────────────────────────────────────────

export interface MachineThroughput {
  inputRates: Record<ItemId, number>;  // items/min per input
  outputRate: number;                   // items/min
  powerMW: number;
  isStarved: boolean;
  isOverloaded: boolean;
}

export interface BeltLoad {
  capacity: number;    // items/min
  actualLoad: number;  // items/min carried
  /** 'ok' < 80%, 'warn' 80–99%, 'full' = 100% */
  saturation: 'ok' | 'warn' | 'full';
}

export interface FactoryStats {
  totalMachines: number;
  totalPowerMW: number;
  efficiencyPct: number;
  bottleneckCount: number;
  machineThroughputs: Record<SandboxMachineId, MachineThroughput>;
  beltLoads: Record<SandboxBeltId, BeltLoad>;
}

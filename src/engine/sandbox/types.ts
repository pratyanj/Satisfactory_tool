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
  /** For power switches: is the switch toggled ON? Defaults to true */
  switchOn?: boolean;
  /** For biomass burners: selected fuel ID */
  fuelId?: string;
}

// ─── Clipboard Template ───────────────────────────────────────────────────────

/**
 * A lightweight template entry stored in the clipboard when machines are copied.
 * Uses relative grid offsets from the top-left anchor machine.
 */
export interface ClipboardEntry {
  machineId: string;
  relCol: number;
  relRow: number;
  rotation: 0 | 90 | 180 | 270;
  recipeId: RecipeId | null;
  overclock: number;
  fuelId?: string;
  switchOn?: boolean;
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

export type SandboxPowerLineId = string; // UUID

export interface SandboxPowerLine {
  lineId: SandboxPowerLineId;
  fromMachineId: SandboxMachineId;
  toMachineId: SandboxMachineId;
}

// ─── Full State ───────────────────────────────────────────────────────────────

export interface SandboxState {
  machines: SandboxMachine[];
  belts: SandboxBelt[];
  powerLines: SandboxPowerLine[];
  /** Which machine is currently selected (single) */
  selectedMachineId: SandboxMachineId | null;
  /** Which machines are part of a multi-selection */
  selectedMachineIds: SandboxMachineId[];
  /** Which belt is currently selected (mutually exclusive with other selections) */
  selectedBeltId: SandboxBeltId | null;
  /** Which power line is currently selected (mutually exclusive with other selections) */
  selectedPowerLineId: SandboxPowerLineId | null;
  /** Clipboard for copy-paste of machine layouts */
  clipboard: ClipboardEntry[] | null;
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
  | { type: 'TOGGLE_SWITCH'; instanceId: SandboxMachineId }
  | { type: 'SET_FUEL'; instanceId: SandboxMachineId; fuelId: string }
  | { type: 'ADD_BELT'; belt: SandboxBelt }
  | { type: 'DELETE_BELT'; beltId: SandboxBeltId }
  | { type: 'SELECT_BELT'; beltId: SandboxBeltId | null }
  | { type: 'SET_BELT_TIER'; beltId: SandboxBeltId; tier: string }
  | { type: 'ADD_POWER_LINE'; line: SandboxPowerLine }
  | { type: 'DELETE_POWER_LINE'; lineId: SandboxPowerLineId }
  | { type: 'SELECT_POWER_LINE'; lineId: SandboxPowerLineId | null }
  | { type: 'SET_VIEWPORT'; offset: { x: number; y: number }; zoom: number }
  | { type: 'TOGGLE_GRID' }
  | { type: 'LOAD_STATE'; state: SandboxState }
  | { type: 'CLEAR_ALL' }
  // ── Phase 4: Multi-Selection & Arrays ────────────────────────────────────────
  /** Replace entire multi-selection set */
  | { type: 'SELECT_MULTIPLE_MACHINES'; instanceIds: SandboxMachineId[] }
  /** Toggle a single machine's membership in the multi-selection (Shift+click) */
  | { type: 'SELECT_ADD_MACHINE'; instanceId: SandboxMachineId }
  /** Copy current multi-selection (or single selection) into clipboard */
  | { type: 'COPY_SELECTION' }
  /** Place an entire array of machines at once (Zoop / Paste) */
  | { type: 'PLACE_MACHINE_ARRAY'; machines: SandboxMachine[] }
  /** Sync clock speed across all selected machines */
  | { type: 'BULK_SET_OVERCLOCK'; instanceIds: SandboxMachineId[]; overclock: number }
  /** Delete all selected machines and their connected edges */
  | { type: 'BULK_DELETE'; instanceIds: SandboxMachineId[] }
  /** Auto-generate a splitter/merger manifold for the selected machines */
  | {
      type: 'GENERATE_MANIFOLD';
      machineIds: SandboxMachineId[];
      portType: 'input' | 'output';
      beltTier: string;
    };

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

export interface MachinePowerStatus {
  isPowered: boolean;
  reason?: 'no_power' | 'fuse_tripped';
}

export interface FactoryStats {
  totalMachines: number;
  totalPowerMW: number; // Deprecated or overall total consumption
  totalPowerProductionMW: number;
  totalPowerConsumptionMW: number;
  trippedGridCount: number;
  unpoweredMachineCount: number;
  machinePowerGridStatus: Record<SandboxMachineId, MachinePowerStatus>;
  efficiencyPct: number;
  bottleneckCount: number;
  machineThroughputs: Record<SandboxMachineId, MachineThroughput>;
  beltLoads: Record<SandboxBeltId, BeltLoad>;
}

/**
 * FICSIT Sandbox — Machine Registry
 *
 * Defines the footprint (width × height in foundation units) and port layout
 * for every machine. Also provides display metadata (category, accent color).
 *
 * Single source of truth — engine and UI both read from here.
 */

import { machines, type MachineId } from '../data';
import type { MachineFootprint, PortDefinition } from './types';

export type MachineCategory = 'extraction' | 'production' | 'logistics' | 'power' | 'storage';

export interface MachineRegistryEntry {
  machineId: MachineId;
  /** Custom display name for sandbox-only items (e.g. power poles) */
  name?: string;
  /** Foundation footprint (1 foundation = 8m × 8m in-game) */
  footprint: MachineFootprint;
  /** Port definitions, relative to top-left corner */
  ports: PortDefinition[];
  category: MachineCategory;
  /** Tailored accent color for this machine */
  accentColor: string;
  /** Display order within its category */
  order: number;
  /** Override or standalone power usage (MW). Negative represents production if needed, but we separate production. */
  powerUsage?: number;
  /** Sandbox standalone power production (MW) */
  powerProduction?: number;
  /** Max power wire connections allowed */
  maxConnections?: number;
}

/** All port layouts use normalized positions (0–1) within the machine footprint */
const REGISTRY: MachineRegistryEntry[] = [
  // ── Extraction ─────────────────────────────────────────────────────────────
  {
    machineId: 'miner_mk1',
    footprint: { width: 2, height: 2 },
    ports: [
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.5, relY: 1.0 },
    ],
    category: 'extraction',
    accentColor: '#6b7280',
    order: 1,
  },
  {
    machineId: 'miner_mk2',
    footprint: { width: 2, height: 2 },
    ports: [
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.5, relY: 1.0 },
    ],
    category: 'extraction',
    accentColor: '#3b82f6',
    order: 2,
  },
  {
    machineId: 'miner_mk3',
    footprint: { width: 2, height: 2 },
    ports: [
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.5, relY: 1.0 },
    ],
    category: 'extraction',
    accentColor: '#a855f7',
    order: 3,
  },
  {
    machineId: 'water_extractor',
    footprint: { width: 2, height: 2 },
    ports: [
      { id: 'out0', type: 'output', medium: 'pipe', relX: 0.5, relY: 1.0 },
    ],
    category: 'extraction',
    accentColor: '#22d3ee',
    order: 4,
  },
  {
    machineId: 'oil_extractor',
    footprint: { width: 2, height: 3 },
    ports: [
      { id: 'out0', type: 'output', medium: 'pipe', relX: 0.5, relY: 1.0 },
    ],
    category: 'extraction',
    accentColor: '#78716c',
    order: 5,
  },

  // ── Production ─────────────────────────────────────────────────────────────
  {
    machineId: 'smelter',
    footprint: { width: 1, height: 2 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'belt', relX: 0.5, relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.5, relY: 1.0 },
    ],
    category: 'production',
    accentColor: '#f97316',
    order: 1,
  },
  {
    machineId: 'foundry',
    footprint: { width: 2, height: 2 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'belt', relX: 0.25, relY: 0.0 },
      { id: 'in1',  type: 'input',  medium: 'belt', relX: 0.75, relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.5,  relY: 1.0 },
    ],
    category: 'production',
    accentColor: '#f59e0b',
    order: 2,
  },
  {
    machineId: 'constructor',
    footprint: { width: 1, height: 2 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'belt', relX: 0.5, relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.5, relY: 1.0 },
    ],
    category: 'production',
    accentColor: '#22c55e',
    order: 3,
  },
  {
    machineId: 'assembler',
    footprint: { width: 2, height: 2 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'belt', relX: 0.25, relY: 0.0 },
      { id: 'in1',  type: 'input',  medium: 'belt', relX: 0.75, relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.5,  relY: 1.0 },
    ],
    category: 'production',
    accentColor: '#3b82f6',
    order: 4,
  },
  {
    machineId: 'manufacturer',
    footprint: { width: 3, height: 2 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'belt', relX: 0.17, relY: 0.0 },
      { id: 'in1',  type: 'input',  medium: 'belt', relX: 0.39, relY: 0.0 },
      { id: 'in2',  type: 'input',  medium: 'belt', relX: 0.61, relY: 0.0 },
      { id: 'in3',  type: 'input',  medium: 'belt', relX: 0.83, relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.5,  relY: 1.0 },
    ],
    category: 'production',
    accentColor: '#a855f7',
    order: 5,
  },
  {
    machineId: 'refinery',
    footprint: { width: 3, height: 3 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'belt', relX: 0.25, relY: 0.0 },
      { id: 'in1',  type: 'input',  medium: 'pipe', relX: 0.75, relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.25, relY: 1.0 },
      { id: 'out1', type: 'output', medium: 'pipe', relX: 0.75, relY: 1.0 },
    ],
    category: 'production',
    accentColor: '#ec4899',
    order: 6,
  },
  {
    machineId: 'blender',
    footprint: { width: 3, height: 3 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'belt', relX: 0.17, relY: 0.0 },
      { id: 'in1',  type: 'input',  medium: 'belt', relX: 0.39, relY: 0.0 },
      { id: 'in2',  type: 'input',  medium: 'pipe', relX: 0.61, relY: 0.0 },
      { id: 'in3',  type: 'input',  medium: 'pipe', relX: 0.83, relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.3,  relY: 1.0 },
      { id: 'out1', type: 'output', medium: 'pipe', relX: 0.7,  relY: 1.0 },
    ],
    category: 'production',
    accentColor: '#06b6d4',
    order: 7,
  },
  {
    machineId: 'packager',
    footprint: { width: 2, height: 2 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'belt', relX: 0.25, relY: 0.0 },
      { id: 'in1',  type: 'input',  medium: 'pipe', relX: 0.75, relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.5,  relY: 1.0 },
    ],
    category: 'production',
    accentColor: '#84cc16',
    order: 8,
  },
  {
    machineId: 'particle_accelerator',
    footprint: { width: 5, height: 3 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'belt', relX: 0.2,  relY: 0.0 },
      { id: 'in1',  type: 'input',  medium: 'belt', relX: 0.4,  relY: 0.0 },
      { id: 'in2',  type: 'input',  medium: 'pipe', relX: 0.6,  relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.5,  relY: 1.0 },
    ],
    category: 'production',
    accentColor: '#f43f5e',
    order: 9,
  },
  {
    machineId: 'quantum_encoder',
    footprint: { width: 5, height: 5 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'belt', relX: 0.2, relY: 0.0 },
      { id: 'in1',  type: 'input',  medium: 'belt', relX: 0.4, relY: 0.0 },
      { id: 'in2',  type: 'input',  medium: 'belt', relX: 0.6, relY: 0.0 },
      { id: 'in3',  type: 'input',  medium: 'pipe', relX: 0.8, relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.5, relY: 1.0 },
    ],
    category: 'production',
    accentColor: '#8b5cf6',
    order: 10,
  },
  {
    machineId: 'converter',
    footprint: { width: 3, height: 3 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'belt', relX: 0.25, relY: 0.0 },
      { id: 'in1',  type: 'input',  medium: 'belt', relX: 0.75, relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.5,  relY: 1.0 },
    ],
    category: 'production',
    accentColor: '#f97316',
    order: 11,
  },
  {
    machineId: 'resource_well_pressurizer',
    footprint: { width: 4, height: 4 },
    ports: [
      { id: 'out0', type: 'output', medium: 'pipe', relX: 0.5, relY: 1.0 },
    ],
    category: 'extraction',
    accentColor: '#10b981',
    order: 6,
  },

  // ── Logistics ──────────────────────────────────────────────────────────────
  {
    machineId: 'conveyor_splitter',
    footprint: { width: 1, height: 1 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'belt', relX: 0.5,  relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.15, relY: 1.0 },
      { id: 'out1', type: 'output', medium: 'belt', relX: 0.5,  relY: 1.0 },
      { id: 'out2', type: 'output', medium: 'belt', relX: 0.85, relY: 1.0 },
    ],
    category: 'logistics',
    accentColor: '#f59e0b',
    order: 1,
  },
  {
    machineId: 'conveyor_merger',
    footprint: { width: 1, height: 1 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'belt', relX: 0.15, relY: 0.0 },
      { id: 'in1',  type: 'input',  medium: 'belt', relX: 0.5,  relY: 0.0 },
      { id: 'in2',  type: 'input',  medium: 'belt', relX: 0.85, relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.5,  relY: 1.0 },
    ],
    category: 'logistics',
    accentColor: '#3b82f6',
    order: 2,
  },
  {
    machineId: 'conveyor_smart_splitter',
    footprint: { width: 1, height: 1 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'belt', relX: 0.5,  relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.15, relY: 1.0 },
      { id: 'out1', type: 'output', medium: 'belt', relX: 0.5,  relY: 1.0 },
      { id: 'out2', type: 'output', medium: 'belt', relX: 0.85, relY: 1.0 },
    ],
    category: 'logistics',
    accentColor: '#a855f7',
    order: 3,
  },
  {
    machineId: 'conveyor_programmable_splitter',
    footprint: { width: 1, height: 1 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'belt', relX: 0.5,  relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.15, relY: 1.0 },
      { id: 'out1', type: 'output', medium: 'belt', relX: 0.5,  relY: 1.0 },
      { id: 'out2', type: 'output', medium: 'belt', relX: 0.85, relY: 1.0 },
    ],
    category: 'logistics',
    accentColor: '#ec4899',
    order: 4,
  },
  {
    machineId: 'industrial_storage_container',
    footprint: { width: 2, height: 2 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'belt', relX: 0.25, relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'belt', relX: 0.75, relY: 1.0 },
    ],
    category: 'storage',
    accentColor: '#6b7280',
    order: 1,
  },
  {
    machineId: 'fluid_buffer',
    footprint: { width: 1, height: 2 },
    ports: [
      { id: 'in0',  type: 'input',  medium: 'pipe', relX: 0.5, relY: 0.0 },
      { id: 'out0', type: 'output', medium: 'pipe', relX: 0.5, relY: 1.0 },
    ],
    category: 'storage',
    accentColor: '#22d3ee',
    order: 2,
  },

  // ── Power ──────────────────────────────────────────────────────────────────
  {
    machineId: 'biomass_burner',
    name: 'Biomass Burner',
    footprint: { width: 1, height: 1 },
    ports: [],
    category: 'power',
    accentColor: '#4ade80',
    order: 1,
    powerProduction: 30, // Nominally 30 MW (fuel-dependent)
    powerUsage: 0,
  },
  {
    machineId: 'power_pole_mk1',
    name: 'Power Pole Mk.1',
    footprint: { width: 1, height: 1 },
    ports: [],
    category: 'power',
    accentColor: '#10b981',
    order: 2,
    maxConnections: 4,
    powerUsage: 0,
  },
  {
    machineId: 'power_pole_mk2',
    name: 'Power Pole Mk.2',
    footprint: { width: 1, height: 1 },
    ports: [],
    category: 'power',
    accentColor: '#3b82f6',
    order: 3,
    maxConnections: 7,
    powerUsage: 0,
  },
  {
    machineId: 'power_pole_mk3',
    name: 'Power Pole Mk.3',
    footprint: { width: 1, height: 1 },
    ports: [],
    category: 'power',
    accentColor: '#a855f7',
    order: 4,
    maxConnections: 10,
    powerUsage: 0,
  },
  {
    machineId: 'power_switch',
    name: 'Power Switch',
    footprint: { width: 1, height: 1 },
    ports: [],
    category: 'power',
    accentColor: '#4b5563',
    order: 5,
    maxConnections: 2,
    powerUsage: 0,
  },
  {
    machineId: 'coal_generator',
    name: 'Coal Generator',
    footprint: { width: 2, height: 3 },
    ports: [
      { id: 'in_coal', type: 'input', medium: 'belt', relX: 0.25, relY: 0.0 },
      { id: 'in_water', type: 'input', medium: 'pipe', relX: 0.75, relY: 0.0 },
    ],
    category: 'power',
    accentColor: '#374151',
    order: 6,
    powerProduction: 75,
    powerUsage: 0,
  },
  {
    machineId: 'fuel_generator',
    name: 'Fuel Generator',
    footprint: { width: 3, height: 3 },
    ports: [
      { id: 'in_fuel', type: 'input', medium: 'pipe', relX: 0.5, relY: 0.0 },
    ],
    category: 'power',
    accentColor: '#f59e0b',
    order: 7,
    powerProduction: 250,
    powerUsage: 0,
  },
  {
    machineId: 'nuclear_power_plant',
    name: 'Nuclear Power Plant',
    footprint: { width: 5, height: 5 },
    ports: [
      { id: 'in_fuel_rod', type: 'input', medium: 'belt', relX: 0.25, relY: 0.0 },
      { id: 'in_water', type: 'input', medium: 'pipe', relX: 0.75, relY: 0.0 },
      { id: 'out_waste', type: 'output', medium: 'belt', relX: 0.5, relY: 1.0 },
    ],
    category: 'power',
    accentColor: '#84cc16',
    order: 8,
    powerProduction: 2500,
    powerUsage: 0,
  },
];

// ─── Lookup Helpers ────────────────────────────────────────────────────────────

const _byId = new Map<MachineId, MachineRegistryEntry>(
  REGISTRY.map((e) => [e.machineId, e])
);

export interface BiomassFuelEntry {
  fuelId: string;
  name: string;
  powerProduction: number; // MW
}

export const BIOMASS_FUELS: BiomassFuelEntry[] = [
  { fuelId: 'leaves',         name: 'Leaves',         powerProduction: 15 },
  { fuelId: 'wood',           name: 'Wood',           powerProduction: 20 },
  { fuelId: 'mycelia',        name: 'Mycelia',        powerProduction: 20 },
  { fuelId: 'biomass',        name: 'Biomass',        powerProduction: 25 },
  { fuelId: 'solid_biofuel',  name: 'Solid Biofuel',  powerProduction: 30 },
];

export function getMachineEntry(machineId: MachineId): MachineRegistryEntry | undefined {
  return _byId.get(machineId);
}

export function getMachineFootprint(machineId: MachineId): MachineFootprint {
  return _byId.get(machineId)?.footprint ?? { width: 1, height: 1 };
}

export function getMachinePorts(machineId: MachineId): PortDefinition[] {
  return _byId.get(machineId)?.ports ?? [];
}

export function getMachinesByCategory(category: MachineCategory): MachineRegistryEntry[] {
  return REGISTRY.filter((e) => e.category === category).sort((a, b) => a.order - b.order);
}

export function getAllMachines(): MachineRegistryEntry[] {
  return [...REGISTRY];
}

export function getMachineName(machineId: string): string {
  const entry = getMachineEntry(machineId);
  if (entry?.name) return entry.name;
  return machines[machineId]?.name ?? machineId;
}

export function getMachinePowerUsage(machineId: string): number {
  const entry = getMachineEntry(machineId);
  if (entry?.powerUsage !== undefined) return entry.powerUsage;
  return machines[machineId]?.powerUsage ?? 0;
}

export function getMachinePowerProduction(machineId: string, fuelId?: string): number {
  const entry = getMachineEntry(machineId);
  if (!entry) return 0;
  if (machineId === 'biomass_burner') {
    const fuel = BIOMASS_FUELS.find((f) => f.fuelId === fuelId);
    return fuel ? fuel.powerProduction : 30; // default 30 MW Solid Biofuel
  }
  return entry.powerProduction ?? 0;
}

export function getMachineMaxConnections(machineId: string): number {
  const entry = getMachineEntry(machineId);
  if (entry?.maxConnections !== undefined) return entry.maxConnections;
  // If it consumes/produces power but isn't a power pole, standard machine limit is 1 wire
  const powerCons = getMachinePowerUsage(machineId);
  const powerProd = getMachinePowerProduction(machineId);
  if (powerCons > 0 || powerProd > 0) return 1;
  return 0; // Doesn't use power
}

export const CATEGORY_LABELS: Record<MachineCategory, string> = {
  extraction: 'Extraction',
  production: 'Production',
  logistics: 'Logistics',
  power:      'Power',
  storage:    'Storage',
};

export const CATEGORY_ORDER: MachineCategory[] = [
  'extraction',
  'production',
  'logistics',
  'power',
  'storage',
];

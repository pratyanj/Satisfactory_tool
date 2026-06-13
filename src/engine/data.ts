import itemsData from '../../data/items.json';
import machinesData from '../../data/machines.json';
import recipesData from '../../data/recipes.json';
import beltsData from '../../data/belts.json';
import buildingsData from '../../data/buildings.json';
import tiersData from '../../data/tiers.json';

export type ItemId = string;
export type MachineId = string;
export type RecipeId = string;

export interface Item {
  id: ItemId;
  name: string;
  imageUrl?: string;
  category: string;
  /** FICSIT AWESOME Sink points awarded per item (undefined if not sinkable). */
  sinkPoints?: number;
}

export interface ResourceInput {
  itemId: ItemId;
  rate: number; // per minute
}

export interface Recipe {
  id: RecipeId;
  name?: string;
  outputItemId: ItemId;
  outputRate: number; // per minute
  inputs: ResourceInput[];
  byproducts?: ResourceInput[];
  machineId: MachineId;
  isAlternate?: boolean;
}

export interface Machine {
  id: MachineId;
  name: string;
  powerUsage: number; // MW
  imageUrl: string;
}

export type BeltId = string;

export interface Belt {
  id: BeltId;
  name: string;
  capacity: number; // items per minute
}

/** One material entry in a building's construction cost. */
export interface BuildCostItem {
  /** Our item id (links to the item codex) when the material maps to a known item. */
  itemId: ItemId | null;
  name: string;
  amount: number;
}

/** Which milestone / MAM research unlocks a building. */
export interface BuildingUnlock {
  schematic: string;
  tier: number | null;
  /** Milestone | MAM | Tutorial | Alternate | ... (EST_ prefix stripped). */
  type: string;
}

/** A constructable building/machine/structure shown in the Codex. */
export interface Building {
  id: string;
  name: string;
  className: string;
  category: string;
  description: string;
  imageUrl: string;
  /** Base power draw in MW (0 for passive structures and generators). */
  powerConsumption: number;
  buildCost: BuildCostItem[];
  unlock: BuildingUnlock | null;
}

// Re-export the data loaded from JSON files with strong types
export const items = itemsData as Record<ItemId, Item>;
export const machines = machinesData as Record<MachineId, Machine>;
export const recipes = recipesData as Recipe[];
export const belts = beltsData as Record<BeltId, Belt>;
export const buildings = buildingsData as unknown as Record<string, Building>;

/**
 * Maps a production/extraction building (by its game className) to the recipe
 * `machineId` it runs, so the building codex can list every recipe it can make.
 * Returns null for passive structures (walls, foundations, …). All miner tiers
 * share the `miner_mk1` ore recipes (the solver scales output by tier).
 */
const BUILDING_CLASS_TO_MACHINE: Record<string, MachineId> = {
  Desc_ConstructorMk1_C: 'constructor',
  Desc_AssemblerMk1_C: 'assembler',
  Desc_ManufacturerMk1_C: 'manufacturer',
  Desc_SmelterMk1_C: 'smelter',
  Desc_FoundryMk1_C: 'foundry',
  Desc_OilRefinery_C: 'refinery',
  Desc_Packager_C: 'packager',
  Desc_Blender_C: 'blender',
  Desc_HadronCollider_C: 'particle_accelerator',
  Desc_QuantumEncoder_C: 'quantum_encoder',
  Desc_Converter_C: 'converter',
  Desc_MinerMk1_C: 'miner_mk1',
  Desc_MinerMk2_C: 'miner_mk1',
  Desc_MinerMk3_C: 'miner_mk1',
  Desc_WaterPump_C: 'water_extractor',
  Desc_OilPump_C: 'oil_extractor',
  Desc_FrackingExtractor_C: 'resource_well_pressurizer',
};

/** The recipe machineId a building runs, or null if it produces nothing. */
export function getBuildingMachineId(building: Building): MachineId | null {
  return BUILDING_CLASS_TO_MACHINE[building.className] ?? null;
}

/** A milestone unlock target — links to a building or item in the codex. */
export interface TierUnlock {
  type: 'building' | 'item';
  id: string | null;
  name: string;
}

/** A HUB milestone within a tier. */
export interface Milestone {
  name: string;
  schematic: string;
  cost: BuildCostItem[];
  unlocks: TierUnlock[];
}

/** One HUB tier (1-9) and its milestones. */
export interface Tier {
  tier: number;
  milestones: Milestone[];
}

export const tiers = tiersData as unknown as Tier[];

/** Item categories that are transported through pipes (fluids & gases) rather than belts. */
export const FLUID_CATEGORIES: ReadonlySet<string> = new Set(['Liquids', 'Gas']);

/** True when an item flows through pipes (liquid or gas) instead of belts. */
export function isFluidItem(itemId: ItemId): boolean {
  const category = items[itemId]?.category;
  return category ? FLUID_CATEGORIES.has(category) : false;
}

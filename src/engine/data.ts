import itemsData from '../../data/items.json';
import machinesData from '../../data/machines.json';
import recipesData from '../../data/recipes.json';
import beltsData from '../../data/belts.json';

export type ItemId = string;
export type MachineId = string;
export type RecipeId = string;

export interface Item {
  id: ItemId;
  name: string;
  imageUrl?: string;
  category: string;
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

// Re-export the data loaded from JSON files with strong types
export const items = itemsData as Record<ItemId, Item>;
export const machines = machinesData as Record<MachineId, Machine>;
export const recipes = recipesData as Recipe[];
export const belts = beltsData as Record<BeltId, Belt>;

/** Item categories that are transported through pipes (fluids & gases) rather than belts. */
export const FLUID_CATEGORIES: ReadonlySet<string> = new Set(['Liquids', 'Gas']);

/** True when an item flows through pipes (liquid or gas) instead of belts. */
export function isFluidItem(itemId: ItemId): boolean {
  const category = items[itemId]?.category;
  return category ? FLUID_CATEGORIES.has(category) : false;
}

import { ItemId, MachineId, items, machines, recipes } from './data';

export interface SolverNode {
  itemId: ItemId;
  rate: number;
  machines: number;
  machineId: MachineId;
  inputs: SolverNode[];
}

function getRecipeForItem(itemId: ItemId): typeof recipes[0] | undefined {
  return recipes.find((r) => r.outputItemId === itemId);
}

export function solve(itemId: ItemId, requiredRate: number, minerId: MachineId = "miner_mk1"): SolverNode {
  const recipe = getRecipeForItem(itemId);
  
  if (!recipe) {
    throw new Error(`No recipe found for item: ${items[itemId]?.name || itemId}`);
  }

  let outputRate = recipe.outputRate;
  let machineIdToUse = recipe.machineId;

  // Adjust extraction rate for miners
  if (recipe.inputs.length === 0) {
    machineIdToUse = minerId;
    if (minerId === "miner_mk2") outputRate = 120;
    else if (minerId === "miner_mk3") outputRate = 240;
    else outputRate = 60; // Default Mk.1
  }

  const machineCount = requiredRate / outputRate;

  const result: SolverNode = {
    itemId,
    rate: requiredRate,
    machines: machineCount,
    machineId: machineIdToUse,
    inputs: []
  };

  for (const input of recipe.inputs) {
    const requiredInputRate = input.rate * machineCount;
    result.inputs.push(solve(input.itemId, requiredInputRate, minerId));
  }

  return result;
}

/** Details about what a specific building type produces */
export interface BuildingDetail {
  machineId: MachineId;
  count: number;
  /** Items this building type produces: itemId -> rate */
  produces: Record<string, number>;
  /** Items this building type consumes for construction: itemId -> total quantity */
  buildCost: Record<string, number>;
}

export interface SummaryData {
  machineCounts: Record<string, number>;
  rawInputs: Record<string, number>;
  producedItems: Record<string, number>;
  totalPower: number;
  /** Total units/min for every item in the production chain (intermediate + raw) */
  allItemRates: Record<string, number>;
  /** Per-building-type breakdown */
  buildingDetails: Record<string, BuildingDetail>;
}

export function calculateSummary(rootNode: SolverNode): SummaryData {
  const machineCounts: Record<string, number> = Object.create(null);
  const rawInputs: Record<string, number> = Object.create(null);
  const producedItems: Record<string, number> = Object.create(null);
  const allItemRates: Record<string, number> = Object.create(null);
  const buildingDetails: Record<string, BuildingDetail> = Object.create(null);
  let totalPower = 0;

  producedItems[rootNode.itemId] = rootNode.rate;

  function traverse(node: SolverNode) {
    machineCounts[node.machineId] = (machineCounts[node.machineId] || 0) + node.machines;
    totalPower += node.machines * machines[node.machineId].powerUsage;

    // Aggregate all item rates (every node produces something)
    allItemRates[node.itemId] = (allItemRates[node.itemId] || 0) + node.rate;

    // Aggregate building details
    if (!buildingDetails[node.machineId]) {
      buildingDetails[node.machineId] = {
        machineId: node.machineId,
        count: 0,
        produces: {},
        buildCost: {},
      };
    }
    const detail = buildingDetails[node.machineId];
    // Defensive: ensure produces/buildCost exist in case of a stale or partial object
    if (!detail.produces) detail.produces = {};
    if (!detail.buildCost) detail.buildCost = {};
    detail.count += node.machines;
    detail.produces[node.itemId] = (detail.produces[node.itemId] || 0) + node.rate;

    if (node.inputs.length === 0) {
      rawInputs[node.itemId] = (rawInputs[node.itemId] || 0) + node.rate;
    } else {
      for (const child of node.inputs) {
        traverse(child);
      }
    }
  }

  traverse(rootNode);

  return { machineCounts, rawInputs, producedItems, totalPower, allItemRates, buildingDetails };
}

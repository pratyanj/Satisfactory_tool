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

export interface SummaryData {
  machineCounts: Record<string, number>;
  rawInputs: Record<string, number>;
  producedItems: Record<string, number>;
  totalPower: number;
}

export function calculateSummary(rootNode: SolverNode): SummaryData {
  const machineCounts: Record<string, number> = {};
  const rawInputs: Record<string, number> = {};
  const producedItems: Record<string, number> = {};
  let totalPower = 0;

  producedItems[rootNode.itemId] = rootNode.rate;

  function traverse(node: SolverNode) {
    machineCounts[node.machineId] = (machineCounts[node.machineId] || 0) + node.machines;
    totalPower += node.machines * machines[node.machineId].powerUsage;

    if (node.inputs.length === 0) {
      rawInputs[node.itemId] = (rawInputs[node.itemId] || 0) + node.rate;
    } else {
      for (const child of node.inputs) {
        traverse(child);
      }
    }
  }

  traverse(rootNode);

  return { machineCounts, rawInputs, producedItems, totalPower };
}

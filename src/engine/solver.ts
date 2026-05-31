import { ItemId, MachineId, Recipe, RecipeId, items, machines, recipes } from './data';

export interface SolverNode {
  itemId: ItemId;
  recipeId: RecipeId;
  rate: number;
  machines: number;
  machineId: MachineId;
  inputs: SolverNode[];
  byproducts?: { itemId: ItemId; rate: number }[];
}

export type RecipeSelectionMap = Partial<Record<ItemId, RecipeId>>;

interface AlternateRecipeCandidate {
  itemId: ItemId;
  recipes: Recipe[];
  selectedRecipeId: RecipeId;
}

function getRecipesForItem(itemId: ItemId): Recipe[] {
  return recipes.filter((r) => r.outputItemId === itemId);
}

function getRecipeForItem(itemId: ItemId, recipeSelections: RecipeSelectionMap = {}): Recipe | undefined {
  const candidates = getRecipesForItem(itemId);
  if (candidates.length === 0) return undefined;

  const selectedId = recipeSelections[itemId];
  if (!selectedId) return candidates[0];

  return candidates.find((r) => r.id === selectedId) || candidates[0];
}

export function getAlternateRecipeCandidates(rootItemId: ItemId, recipeSelections: RecipeSelectionMap = {}): AlternateRecipeCandidate[] {
  const visited = new Set<ItemId>();
  const result: AlternateRecipeCandidate[] = [];

  const walk = (itemId: ItemId) => {
    if (visited.has(itemId)) return;
    visited.add(itemId);

    const itemRecipes = getRecipesForItem(itemId);
    if (itemRecipes.length === 0) return;

    const selectedRecipe = getRecipeForItem(itemId, recipeSelections);
    if (itemRecipes.length > 1 && selectedRecipe) {
      result.push({
        itemId,
        recipes: itemRecipes,
        selectedRecipeId: selectedRecipe.id,
      });
    }

    if (!selectedRecipe) return;
    for (const input of selectedRecipe.inputs) {
      walk(input.itemId);
    }
  };

  walk(rootItemId);
  return result;
}

export function solve(
  itemIdOrTargets: ItemId | Record<ItemId, number>,
  requiredRate?: number,
  minerId: MachineId = "miner_mk1",
  recipeSelections: RecipeSelectionMap = {}
): SolverNode {
  const targets: Record<ItemId, number> = typeof itemIdOrTargets === 'string'
    ? { [itemIdOrTargets]: requiredRate ?? 0 }
    : itemIdOrTargets;

  const activeStack = new Set<ItemId>();
  let byproductPool: Record<ItemId, number> = {};
  let finalRoot: SolverNode | null = null;

  // Numerical Fixed-Point Convergence (converges within 5 passes)
  for (let pass = 0; pass < 5; pass++) {
    const poolCopy = { ...byproductPool };
    const solvedInputs: SolverNode[] = [];

    for (const [targetId, targetRate] of Object.entries(targets)) {
      activeStack.clear();

      function solveNode(currentId: ItemId, rate: number): SolverNode {
        if (activeStack.has(currentId)) {
          throw new Error(`Circular dependency detected in recipe chain for item: ${items[currentId]?.name || currentId}`);
        }
        activeStack.add(currentId);

        try {
          const recipe = getRecipeForItem(currentId, recipeSelections);
          if (!recipe) {
            throw new Error(`No recipe found for item: ${items[currentId]?.name || currentId}`);
          }

          let outputRate = recipe.outputRate;
          let machineIdToUse = recipe.machineId;

          if (recipe.inputs.length === 0) {
            if (machineIdToUse.startsWith('miner')) {
              machineIdToUse = minerId;
              if (minerId === "miner_mk2") outputRate = 120;
              else if (minerId === "miner_mk3") outputRate = 240;
              else outputRate = 60;
            }
          }

          // Consume from byproducts pool if available
          let reusedFromPool = 0;
          if (poolCopy[currentId] > 0) {
            reusedFromPool = Math.min(rate, poolCopy[currentId]);
            poolCopy[currentId] -= reusedFromPool;
          }

          const remainingRate = rate - reusedFromPool;
          const machineCount = remainingRate / outputRate;

          const nodeInputs: SolverNode[] = [];

          for (const input of recipe.inputs) {
            const requiredInputRate = input.rate * machineCount;
            if (requiredInputRate > 0.001) {
              nodeInputs.push(solveNode(input.itemId, requiredInputRate));
            }
          }

          if (reusedFromPool > 0) {
            nodeInputs.push({
              itemId: currentId,
              recipeId: 'byproduct_reuse',
              rate: reusedFromPool,
              machines: 0,
              machineId: 'byproduct_reused',
              inputs: [],
            });
          }

          const byproducts = (recipe.byproducts || []).map(bp => ({
            itemId: bp.itemId,
            rate: bp.rate * machineCount
          }));

          return {
            itemId: currentId,
            recipeId: recipe.id,
            rate,
            machines: machineCount,
            machineId: machineIdToUse,
            inputs: nodeInputs,
            byproducts,
          };
        } finally {
          activeStack.delete(currentId);
        }
      }

      solvedInputs.push(solveNode(targetId, targetRate));
    }

    // Recalculate byproduct pool from output results
    const newByproducts: Record<ItemId, number> = {};
    function collectByproducts(node: SolverNode) {
      if (node.byproducts) {
        for (const bp of node.byproducts) {
          newByproducts[bp.itemId] = (newByproducts[bp.itemId] || 0) + bp.rate;
        }
      }
      for (const input of node.inputs) {
        collectByproducts(input);
      }
    }
    solvedInputs.forEach(collectByproducts);

    let isStable = true;
    for (const [itemId, rate] of Object.entries(newByproducts)) {
      if (Math.abs((byproductPool[itemId] ?? 0) - rate) > 0.01) {
        isStable = false;
        break;
      }
    }

    byproductPool = newByproducts;

    finalRoot = {
      itemId: 'planned_outputs',
      recipeId: 'recipe_planned_outputs',
      rate: 0,
      machines: 0,
      machineId: 'planned_outputs',
      inputs: solvedInputs,
    };

    if (isStable) break;
  }

  // Route any excess byproducts to the AWESOME Sink
  if (finalRoot) {
    const excessByproducts: { itemId: ItemId; rate: number }[] = [];
    const totalProduced: Record<ItemId, number> = {};
    const totalReused: Record<ItemId, number> = {};

    function countFlows(node: SolverNode) {
      if (node.recipeId === 'byproduct_reuse') {
        totalReused[node.itemId] = (totalReused[node.itemId] || 0) + node.rate;
      }
      if (node.byproducts) {
        for (const bp of node.byproducts) {
          totalProduced[bp.itemId] = (totalProduced[bp.itemId] || 0) + bp.rate;
        }
      }
      for (const input of node.inputs) {
        countFlows(input);
      }
    }
    finalRoot.inputs.forEach(countFlows);

    for (const [itemId, producedRate] of Object.entries(totalProduced)) {
      const reusedRate = totalReused[itemId] ?? 0;
      const excess = producedRate - reusedRate;
      if (excess > 0.01) {
        excessByproducts.push({ itemId, rate: excess });
      }
    }

    if (excessByproducts.length > 0) {
      const sinkInputs = excessByproducts.map(ep => ({
        itemId: ep.itemId,
        recipeId: `sink_${ep.itemId}`,
        rate: ep.rate,
        machines: 0,
        machineId: 'awesome_sink',
        inputs: [],
      }));

      finalRoot.inputs.push({
        itemId: 'awesome_sink',
        recipeId: 'recipe_awesome_sink',
        rate: excessByproducts.reduce((acc, ep) => acc + ep.rate, 0),
        machines: excessByproducts.reduce((acc, ep) => acc + ep.rate, 0) / 60,
        machineId: 'awesome_sink',
        inputs: sinkInputs,
      });
    }
  }

  // Preserve 100% single-item backward compatibility if possible
  if (typeof itemIdOrTargets === 'string' && finalRoot && finalRoot.inputs.length === 1 && !finalRoot.inputs.some(inp => inp.itemId === 'awesome_sink')) {
    return finalRoot.inputs[0];
  }

  return finalRoot || {
    itemId: 'planned_outputs',
    recipeId: 'recipe_planned_outputs',
    rate: 0,
    machines: 0,
    machineId: 'planned_outputs',
    inputs: [],
  };
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
    if (node.machineId !== 'planned_outputs' && node.machineId !== 'byproduct_reused') {
      const machineInfo = machines[node.machineId] || { name: node.machineId, powerUsage: 0 };
      machineCounts[node.machineId] = (machineCounts[node.machineId] || 0) + node.machines;
      totalPower += node.machines * machineInfo.powerUsage;

      if (!buildingDetails[node.machineId]) {
        buildingDetails[node.machineId] = {
          machineId: node.machineId,
          count: 0,
          produces: {},
          buildCost: {},
        };
      }
      const detail = buildingDetails[node.machineId];
      if (!detail.produces) detail.produces = {};
      if (!detail.buildCost) detail.buildCost = {};
      detail.count += node.machines;
      detail.produces[node.itemId] = (detail.produces[node.itemId] || 0) + node.rate;
    }

    allItemRates[node.itemId] = (allItemRates[node.itemId] || 0) + node.rate;
    
    if (node.byproducts) {
      for (const bp of node.byproducts) {
        allItemRates[bp.itemId] = (allItemRates[bp.itemId] || 0) + bp.rate;
        producedItems[bp.itemId] = (producedItems[bp.itemId] || 0) + bp.rate;
      }
    }

    if (node.inputs.length === 0) {
      if (node.machineId !== 'planned_outputs' && node.machineId !== 'byproduct_reused') {
        rawInputs[node.itemId] = (rawInputs[node.itemId] || 0) + node.rate;
      }
    } else {
      for (const child of node.inputs) {
        traverse(child);
      }
    }
  }

  traverse(rootNode);

  return { machineCounts, rawInputs, producedItems, totalPower, allItemRates, buildingDetails };
}

import { ItemId, MachineId, Recipe, RecipeId, items, machines, recipes, isFluidItem } from './data';

export interface SolverNode {
  itemId: ItemId;
  recipeId: RecipeId;
  rate: number;
  machines: number;
  machineId: MachineId;
  inputs: SolverNode[];
  byproducts?: { itemId: ItemId; rate: number }[];
  clockSpeed?: number;      // e.g. 100, 150, 200, 250
  somerslooped?: boolean;   // if true, 2x output
  /** In whole-machine mode: units/min produced ABOVE what downstream needs. */
  overflowRate?: number;
  /** True when this node runs a single machine below 100% clock (fractional need). */
  isUnderclocked?: boolean;
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

/** Machine types that extract fluids (water / oil / nitrogen) rather than mining solids. */
export const EXTRACTOR_MACHINE_IDS: MachineId[] = ['water_extractor', 'oil_extractor', 'resource_well_pressurizer'];

export interface ChainUsage {
  /** Every machine type used anywhere in the production chain. */
  machineIds: Set<MachineId>;
  /** True when the chain relies on a fluid extractor (water / oil / nitrogen). */
  usesExtractor: boolean;
  /** True when the chain transports any fluid (liquid or gas) — i.e. needs pipes. */
  usesFluid: boolean;
}

/**
 * Walk the recipe tree for the given targets and report which machine types and
 * transport modes the chain actually uses. Lets the UI surface only the controls
 * (extractor tier, pipe tier) that are relevant to the current plan.
 */
export function analyzeChainUsage(
  targetItemIds: ItemId[],
  recipeSelections: RecipeSelectionMap = {}
): ChainUsage {
  const machineIds = new Set<MachineId>();
  let usesFluid = false;
  const visited = new Set<ItemId>();

  const walk = (itemId: ItemId) => {
    if (visited.has(itemId)) return;
    visited.add(itemId);
    if (isFluidItem(itemId)) usesFluid = true;

    const recipe = getRecipeForItem(itemId, recipeSelections);
    if (!recipe) return;
    machineIds.add(recipe.machineId);
    for (const input of recipe.inputs) walk(input.itemId);
  };
  targetItemIds.forEach(walk);

  const usesExtractor = EXTRACTOR_MACHINE_IDS.some((id) => machineIds.has(id));
  return { machineIds, usesExtractor, usesFluid };
}

export function solve(
  itemIdOrTargets: ItemId | Record<ItemId, number>,
  requiredRate?: number,
  minerId: MachineId = "miner_mk1",
  recipeSelections: RecipeSelectionMap = {},
  beltId: string = "mk1",
  pipeTier: 'mk1' | 'mk2' = 'mk1',
  extractorOverclock: number = 100,
  globalOverclock: number = 100,
  somersloopMultiplier: number = 1,
  perMachineSettings?: Record<string, { clockSpeed?: number; somerslooped?: boolean }>,
  wholeMachineMode: boolean = false
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

          const customSettings = perMachineSettings?.[currentId];
          const nodeOverclock = customSettings?.clockSpeed ?? (
            machineIdToUse.startsWith('miner')
              ? 100
              : (machineIdToUse === 'water_extractor' || machineIdToUse === 'oil_extractor')
                ? extractorOverclock
                : globalOverclock
          );
          const nodeSomersloop = customSettings?.somerslooped !== undefined
            ? customSettings.somerslooped
            : (somersloopMultiplier > 1 && recipe.inputs.length > 0);

          const effectiveSomersloopMultiplier = nodeSomersloop ? 2 : 1;

          if (recipe.inputs.length === 0) {
            if (machineIdToUse.startsWith('miner')) {
              machineIdToUse = minerId;
              if (minerId === "miner_mk2") outputRate = 120;
              else if (minerId === "miner_mk3") outputRate = 240;
              else outputRate = 60;
              
              if (customSettings?.clockSpeed !== undefined) {
                outputRate = outputRate * (nodeOverclock / 100);
              }
            } else if (machineIdToUse === 'water_extractor' || machineIdToUse === 'oil_extractor') {
              outputRate = 120 * (nodeOverclock / 100);
            }
          } else {
            // Production machines can be overclocked and Somerslooped
            outputRate = outputRate * (nodeOverclock / 100) * effectiveSomersloopMultiplier;
          }

          // Consume from byproducts pool if available
          let reusedFromPool = 0;
          if (poolCopy[currentId] > 0) {
            reusedFromPool = Math.min(rate, poolCopy[currentId]);
            poolCopy[currentId] -= reusedFromPool;
          }

          const remainingRate = rate - reusedFromPool;
          const exactMachineCount = remainingRate / outputRate;

          // Raw taps (miners / fluid extractors) scale freely — never ceil them.
          const isRawTap = recipe.inputs.length === 0;

          // ── Resolve effective machine count, clock and the rate actually produced ──
          let nodeMachines = exactMachineCount;
          let nodeRate = remainingRate;        // units/min this node actually produces
          let nodeClock = nodeOverclock;
          let isUnderclocked = false;
          let overflowRate = 0;

          if (wholeMachineMode && !isRawTap) {
            // Round up to whole machines; the extra production is overflow.
            const wholeMachines = Math.max(1, Math.ceil(exactMachineCount - 1e-9));
            const producedRate = wholeMachines * outputRate;
            overflowRate = Math.max(0, producedRate - remainingRate);
            nodeMachines = wholeMachines;
            nodeRate = producedRate;           // inputs are sized for the ceiled output
            nodeClock = nodeOverclock;         // whole machines run at full clock
          } else if (!isRawTap && exactMachineCount > 0 && exactMachineCount < 1) {
            // Sub-1 machine in normal mode → a single machine underclocked to the
            // exact fractional need (e.g. 0.4 machines → 1 machine @ 40%).
            nodeMachines = 1;
            isUnderclocked = true;
            // Display clock reflects the actual throughput fraction.
            nodeClock = Math.round(exactMachineCount * nodeOverclock * 1000) / 1000;
          }

          const nodeInputs: SolverNode[] = [];

          // Input demand scales with the rate this node actually produces. In whole-
          // machine mode that's the ceiled rate (so upstream over-produces to feed it).
          const inputScale = nodeRate / outputRate; // == nodeMachines for production machines
          for (const input of recipe.inputs) {
            // Overclocking scales input rate linearly. Somerslooping does not increase input consumption!
            const machineInputRate = input.rate * (nodeOverclock / 100);
            const requiredInputRate = machineInputRate * inputScale;
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
            rate: bp.rate * (nodeOverclock / 100) * effectiveSomersloopMultiplier * inputScale
          }));

          return {
            itemId: currentId,
            recipeId: recipe.id,
            rate: nodeRate + reusedFromPool,
            machines: nodeMachines,
            machineId: machineIdToUse,
            inputs: nodeInputs,
            byproducts,
            clockSpeed: nodeClock,
            somerslooped: nodeSomersloop,
            overflowRate: overflowRate > 0.001 ? overflowRate : undefined,
            isUnderclocked: isUnderclocked || undefined,
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

  // Route any excess byproducts — and whole-machine-mode overflow — to the AWESOME Sink
  if (finalRoot) {
    const excessByproducts: { itemId: ItemId; rate: number }[] = [];
    const totalProduced: Record<ItemId, number> = {};
    const totalReused: Record<ItemId, number> = {};
    const overflow: Record<ItemId, number> = {};

    function countFlows(node: SolverNode) {
      if (node.recipeId === 'byproduct_reuse') {
        totalReused[node.itemId] = (totalReused[node.itemId] || 0) + node.rate;
      }
      if (node.byproducts) {
        for (const bp of node.byproducts) {
          totalProduced[bp.itemId] = (totalProduced[bp.itemId] || 0) + bp.rate;
        }
      }
      if (node.overflowRate && node.overflowRate > 0.001) {
        overflow[node.itemId] = (overflow[node.itemId] || 0) + node.overflowRate;
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
    // Whole-machine overflow joins the same sink stream.
    for (const [itemId, rate] of Object.entries(overflow)) {
      if (rate > 0.01) {
        const existing = excessByproducts.find(e => e.itemId === itemId);
        if (existing) existing.rate += rate;
        else excessByproducts.push({ itemId, rate });
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

      const sinkTotalRate = excessByproducts.reduce((acc, ep) => acc + ep.rate, 0);
      finalRoot.inputs.push({
        itemId: 'awesome_sink',
        recipeId: 'recipe_awesome_sink',
        rate: sinkTotalRate,
        // One AWESOME Sink consumes a full belt (~780/min on Mk.5+). Show whole
        // sinks, never a confusing fraction — 1 sink for any normal overflow.
        machines: Math.max(1, Math.ceil(sinkTotalRate / 780)),
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
  /** Whole-machine mode: surplus units/min routed to Awesome Sink / storage. */
  overflowItems: Record<string, number>;
}

export function calculateSummary(rootNode: SolverNode): SummaryData {
  const machineCounts: Record<string, number> = Object.create(null);
  const rawInputs: Record<string, number> = Object.create(null);
  const producedItems: Record<string, number> = Object.create(null);
  const allItemRates: Record<string, number> = Object.create(null);
  const buildingDetails: Record<string, BuildingDetail> = Object.create(null);
  const overflowItems: Record<string, number> = Object.create(null);
  let totalPower = 0;

  producedItems[rootNode.itemId] = rootNode.rate;

  function traverse(node: SolverNode) {
    if (node.overflowRate && node.overflowRate > 0.001) {
      overflowItems[node.itemId] = (overflowItems[node.itemId] || 0) + node.overflowRate;
    }
    if (node.machineId !== 'planned_outputs' && node.machineId !== 'byproduct_reused') {
      const machineInfo = machines[node.machineId] || { name: node.machineId, powerUsage: 0 };
      machineCounts[node.machineId] = (machineCounts[node.machineId] || 0) + node.machines;
      
      const clock = node.clockSpeed ?? 100;
      const isSomerslooped = node.somerslooped ?? false;
      
      // Power = basePower * (clockSpeed / 100)^1.6
      let powerPerMachine = machineInfo.powerUsage * Math.pow(clock / 100, 1.6);
      if (isSomerslooped) {
        powerPerMachine *= 4; // Somerslooping costs 4x power!
      }
      
      totalPower += node.machines * powerPerMachine;

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

  return { machineCounts, rawInputs, producedItems, totalPower, allItemRates, buildingDetails, overflowItems };
}

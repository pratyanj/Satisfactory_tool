/**
 * FICSIT Sandbox — Simulation Engine
 *
 * Derives live factory statistics from the placed machine + belt state.
 * Pure functions — no side effects, no React dependencies.
 */

import { recipes, machines } from '../data';
import type { ItemId } from '../data';
import type {
  SandboxState,
  SandboxMachine,
  SandboxBelt,
  MachineThroughput,
  BeltLoad,
  FactoryStats,
} from './types';

// ─── Overclock Math ───────────────────────────────────────────────────────────

/**
 * Overclock multiplier applied to rate. Rate scales linearly with clock.
 * Power scales as clock^1.321 per the game formula.
 */
function overclockRateMultiplier(pct: number): number {
  return pct / 100;
}

function overclockPowerMultiplier(pct: number): number {
  return Math.pow(pct / 100, 1.321);
}

// ─── Per-Machine Throughput ───────────────────────────────────────────────────

/**
 * Compute the throughput and power draw of a single placed machine.
 * Returns null if the machine has no recipe assigned.
 */
export function computeMachineThroughput(machine: SandboxMachine): MachineThroughput | null {
  if (!machine.recipeId) return null;

  const recipe = recipes.find((r) => r.id === machine.recipeId);
  if (!recipe) return null;

  const machineData = machines[machine.machineId];
  if (!machineData) return null;

  const clockPct   = machine.overclock ?? 100;
  const rateMult   = overclockRateMultiplier(clockPct);
  const powerMult  = overclockPowerMultiplier(clockPct);

  const outputRate = recipe.outputRate * rateMult;
  const powerMW    = machineData.powerUsage * powerMult;

  const inputRates: Record<ItemId, number> = {};
  for (const input of recipe.inputs) {
    inputRates[input.itemId] = input.rate * rateMult;
  }

  return {
    inputRates,
    outputRate,
    powerMW,
    isStarved: false,    // Phase 2: set via belt load analysis
    isOverloaded: false,
  };
}

/** Belt tier capacities (items/min). Matches BELT_TIERS in BeltInspector.tsx */
const BELT_CAPACITY: Record<string, number> = {
  mk1: 60,
  mk2: 120,
  mk3: 270,
  mk4: 480,
  mk5: 780,
  mk6: 1200,
};

/**
 * Compute the load on a single belt based on the output rate of its source machine.
 */
export function computeBeltLoad(
  belt: SandboxBelt,
  throughputs: Map<string, MachineThroughput | null>
): BeltLoad {
  const capacity = BELT_CAPACITY[belt.tier] ?? 60;

  // Find the output rate of the source machine
  const sourceThroughput = throughputs.get(belt.from.machineInstanceId);
  const actualLoad = sourceThroughput?.outputRate ?? 0;

  const ratio = capacity > 0 ? actualLoad / capacity : 0;
  let saturation: BeltLoad['saturation'] = 'ok';
  if (ratio >= 1.0) saturation = 'full';
  else if (ratio >= 0.8) saturation = 'warn';

  return { capacity, actualLoad, saturation };
}

// ─── Factory-Wide Stats ───────────────────────────────────────────────────────

/**
 * Compute summary statistics for the entire placed factory.
 */
export function computeFactoryStats(state: SandboxState): FactoryStats {
  const machineThroughputs: Record<string, MachineThroughput> = {};
  const throughputMap = new Map<string, MachineThroughput | null>();
  let totalPowerMW = 0;
  let activeMachines = 0;

  for (const machine of state.machines) {
    const tp = computeMachineThroughput(machine);
    throughputMap.set(machine.instanceId, tp);
    if (tp) {
      machineThroughputs[machine.instanceId] = tp;
      totalPowerMW += tp.powerMW;
      activeMachines++;
    }
  }

  const beltLoads: Record<string, BeltLoad> = {};
  let bottleneckCount = 0;

  for (const belt of state.belts) {
    const load = computeBeltLoad(belt, throughputMap);
    beltLoads[belt.beltId] = load;
    if (load.saturation === 'full') bottleneckCount++;
  }

  // Efficiency: ratio of machines that have a recipe assigned and are not bottlenecked
  const efficiencyPct = state.machines.length === 0
    ? 0
    : Math.round((activeMachines / state.machines.length) * 100);

  return {
    totalMachines: state.machines.length,
    totalPowerMW,
    efficiencyPct,
    bottleneckCount,
    machineThroughputs,
    beltLoads,
  };
}

// ─── Recipe Filtering ─────────────────────────────────────────────────────────

/**
 * Get all recipes that can be used in a specific machine.
 */
export function getRecipesForMachine(machineId: string) {
  return recipes.filter((r) => r.machineId === machineId);
}

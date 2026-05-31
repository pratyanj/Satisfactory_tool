/**
 * FICSIT Sandbox — Simulation Engine
 *
 * Derives live factory statistics from the placed machine + belt state.
 * Pure functions — no side effects, no React dependencies.
 */

import { recipes, machines } from '../data';
import type { ItemId } from '../data';
import { getMachinePowerUsage, getMachinePowerProduction } from './machineRegistry';
import type {
  SandboxState,
  SandboxMachine,
  SandboxBelt,
  MachineThroughput,
  BeltLoad,
  FactoryStats,
  MachinePowerStatus,
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
  const throughputMap = new Map<string, MachineThroughput | null>();
  const nominalThroughputs = new Map<string, MachineThroughput>();
  let activeMachines = 0;

  for (const machine of state.machines) {
    const tp = computeMachineThroughput(machine);
    throughputMap.set(machine.instanceId, tp);
    if (tp) {
      nominalThroughputs.set(machine.instanceId, tp);
    }
  }

  // 1. Build adjacency list for the power network
  const adj = new Map<string, string[]>();
  for (const m of state.machines) {
    adj.set(m.instanceId, []);
  }
  const powerLines = state.powerLines ?? [];
  for (const pl of powerLines) {
    if (adj.has(pl.fromMachineId) && adj.has(pl.toMachineId)) {
      const fromMach = state.machines.find(m => m.instanceId === pl.fromMachineId);
      const toMach   = state.machines.find(m => m.instanceId === pl.toMachineId);
      
      const fromIsSwitchOff = fromMach?.machineId === 'power_switch' && fromMach?.switchOn === false;
      const toIsSwitchOff   = toMach?.machineId === 'power_switch' && toMach?.switchOn === false;

      if (!fromIsSwitchOff && !toIsSwitchOff) {
        adj.get(pl.fromMachineId)!.push(pl.toMachineId);
        adj.get(pl.toMachineId)!.push(pl.fromMachineId);
      }
    }
  }

  // 2. Traversal to find connected components (grids)
  const visited = new Set<string>();
  const grids: {
    machineIds: string[];
    totalCapacity: number;
    totalLoad: number;
    isTripped: boolean;
  }[] = [];

  for (const m of state.machines) {
    if (visited.has(m.instanceId)) continue;

    const componentMachineIds: string[] = [];
    const queue = [m.instanceId];
    visited.add(m.instanceId);

    let idx = 0;
    while (idx < queue.length) {
      const currentId = queue[idx++];
      componentMachineIds.push(currentId);

      const neighbors = adj.get(currentId) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    let gridCapacity = 0;
    let gridLoad = 0;

    for (const id of componentMachineIds) {
      const mach = state.machines.find((x) => x.instanceId === id);
      if (!mach) continue;
      const prod = getMachinePowerProduction(mach.machineId, mach.fuelId);
      if (prod > 0) {
        gridCapacity += prod * ((mach.overclock ?? 100) / 100);
      }
      const tp = nominalThroughputs.get(id);
      if (tp) {
        gridLoad += tp.powerMW;
      }
    }

    // A grid is tripped if it has generators and load exceeds capacity
    const isTripped = gridCapacity > 0 && gridLoad > gridCapacity;

    grids.push({
      machineIds: componentMachineIds,
      totalCapacity: gridCapacity,
      totalLoad: gridLoad,
      isTripped,
    });
  }

  // 3. Populate power statuses and check powered state
  let totalPowerProductionMW = 0;
  let totalPowerConsumptionMW = 0;
  let trippedGridCount = 0;
  let unpoweredMachineCount = 0;
  const machinePowerGridStatus: Record<string, MachinePowerStatus> = {};

  for (const grid of grids) {
    totalPowerProductionMW += grid.totalCapacity;
    totalPowerConsumptionMW += grid.totalLoad;
    if (grid.isTripped) {
      trippedGridCount++;
    }

    for (const id of grid.machineIds) {
      const mach = state.machines.find((x) => x.instanceId === id);
      if (!mach) continue;
      const nominalCons = getMachinePowerUsage(mach.machineId);
      const nominalProd = getMachinePowerProduction(mach.machineId, mach.fuelId);

      const hasConnections = (adj.get(id) ?? []).length > 0;

      if (nominalCons > 0) {
        if (!hasConnections) {
          machinePowerGridStatus[id] = { isPowered: false, reason: 'no_power' };
          unpoweredMachineCount++;
        } else if (grid.isTripped) {
          machinePowerGridStatus[id] = { isPowered: false, reason: 'fuse_tripped' };
          unpoweredMachineCount++;
        } else if (grid.totalCapacity === 0) {
          machinePowerGridStatus[id] = { isPowered: false, reason: 'no_power' };
          unpoweredMachineCount++;
        } else {
          machinePowerGridStatus[id] = { isPowered: true };
        }
      } else if (nominalProd > 0) {
        if (!hasConnections) {
          // generator is healthy but disconnected
          machinePowerGridStatus[id] = { isPowered: true };
        } else if (grid.isTripped) {
          machinePowerGridStatus[id] = { isPowered: false, reason: 'fuse_tripped' };
        } else {
          machinePowerGridStatus[id] = { isPowered: true };
        }
      } else {
        machinePowerGridStatus[id] = { isPowered: true };
      }
    }
  }

  // 4. Adjust active machine throughputs based on power status
  const machineThroughputs: Record<string, MachineThroughput> = {};

  for (const machine of state.machines) {
    const tp = nominalThroughputs.get(machine.instanceId);
    if (tp) {
      const pStatus = machinePowerGridStatus[machine.instanceId];
      if (pStatus && !pStatus.isPowered) {
        machineThroughputs[machine.instanceId] = {
          inputRates: Object.keys(tp.inputRates).reduce((acc, k) => {
            acc[k] = 0;
            return acc;
          }, {} as Record<string, number>),
          outputRate: 0,
          powerMW: tp.powerMW,
          isStarved: false,
          isOverloaded: false,
        };
      } else {
        machineThroughputs[machine.instanceId] = tp;
        activeMachines++;
      }
    }
  }

  const beltLoads: Record<string, BeltLoad> = {};
  let bottleneckCount = 0;

  for (const belt of state.belts) {
    const load = computeBeltLoad(belt, throughputMap);
    beltLoads[belt.beltId] = load;
    if (load.saturation === 'full') bottleneckCount++;
  }

  const efficiencyPct = state.machines.length === 0
    ? 0
    : Math.round((activeMachines / state.machines.length) * 100);

  return {
    totalMachines: state.machines.length,
    totalPowerMW: totalPowerConsumptionMW,
    totalPowerProductionMW,
    totalPowerConsumptionMW,
    trippedGridCount,
    unpoweredMachineCount,
    machinePowerGridStatus,
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

import { items, machines, recipes, type Recipe } from '../../data';
import type { PlacedSandboxMachine } from '../types';

export interface MachineRateLine {
  itemId: string;
  itemName: string;
  ratePerMin: number;
  imageUrl?: string;
}

export interface SandboxMachineAnalysis {
  machineName: string;
  machinePowerMW: number;
  recipeOptions: Recipe[];
  activeRecipe: Recipe | null;
  status: 'idle' | 'starved' | 'running';
  outputs: MachineRateLine[];
  inputs: MachineRateLine[];
  byproducts: MachineRateLine[];
}

export function getRecipesForSandboxMachine(templateId: string): Recipe[] {
  return recipes.filter((recipe) => recipe.machineId === templateId);
}

export function chooseDefaultRecipe(templateId: string): string | undefined {
  const options = getRecipesForSandboxMachine(templateId);
  return options[0]?.id;
}

function resolveMachineStatus(activeRecipe: Recipe | null, inputs: MachineRateLine[]): 'idle' | 'starved' | 'running' {
  if (!activeRecipe) return 'idle';
  if (inputs.length > 0) return 'starved';
  return 'running';
}

export function analyzeSandboxMachine(machine: PlacedSandboxMachine): SandboxMachineAnalysis {
  const recipeOptions = getRecipesForSandboxMachine(machine.templateId);
  const activeRecipe = recipeOptions.find((recipe) => recipe.id === machine.recipeId) || recipeOptions[0] || null;
  const machineName = machines[machine.templateId]?.name || machine.templateId;
  const machinePowerBase = machines[machine.templateId]?.powerUsage ?? 0;
  const clockRatio = Math.max(0.01, machine.clockSpeed / 100);
  const machinePowerMW = machinePowerBase * Math.pow(clockRatio, 1.6);

  if (!activeRecipe) {
    return {
      machineName,
      machinePowerMW,
      recipeOptions,
      activeRecipe: null,
      status: 'idle',
      outputs: [],
      inputs: [],
      byproducts: [],
    };
  }

  const outputRate = activeRecipe.outputRate * clockRatio;
  const outputs: MachineRateLine[] = [{
    itemId: activeRecipe.outputItemId,
    itemName: items[activeRecipe.outputItemId]?.name || activeRecipe.outputItemId,
    ratePerMin: outputRate,
    imageUrl: items[activeRecipe.outputItemId]?.imageUrl,
  }];

  const inputs: MachineRateLine[] = activeRecipe.inputs.map((input) => ({
    itemId: input.itemId,
    itemName: items[input.itemId]?.name || input.itemId,
    ratePerMin: input.rate * clockRatio,
    imageUrl: items[input.itemId]?.imageUrl,
  }));

  const byproducts: MachineRateLine[] = (activeRecipe.byproducts || []).map((bp) => ({
    itemId: bp.itemId,
    itemName: items[bp.itemId]?.name || bp.itemId,
    ratePerMin: bp.rate * clockRatio,
    imageUrl: items[bp.itemId]?.imageUrl,
  }));

  return {
    machineName,
    machinePowerMW,
    recipeOptions,
    activeRecipe,
    status: resolveMachineStatus(activeRecipe, inputs),
    outputs,
    inputs,
    byproducts,
  };
}

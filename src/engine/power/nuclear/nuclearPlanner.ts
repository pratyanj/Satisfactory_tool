import type { NuclearPlannerInput, NuclearPlannerResult, PowerPlannerInput } from '../../../types/power';
import { planPower } from '../planner/powerPlanner';

const URANIUM_WASTE_PER_PLANT_PER_MIN = 10;
const INDUSTRIAL_CONTAINER_WASTE_CAPACITY = 24000;

export function planNuclearPower(input: NuclearPlannerInput): NuclearPlannerResult {
  const plannerInput: PowerPlannerInput = {
    targetPower: input.targetPower,
    unit: input.unit,
    fuelType: 'nuclear',
    reservePercent: input.reservePercent,
    allowOverclock: true,
    generatorClockSpeed: input.generatorClockSpeed,
    allowAlternateRecipes: input.allowAlternateRecipes,
    preferredComplexity: input.allowAlternateRecipes ? 'high' : 'balanced',
    minerId: 'miner_mk3',
  };

  const plan = planPower(plannerInput);
  const uraniumWastePerMinFromPlants = plan.generatorCount * URANIUM_WASTE_PER_PLANT_PER_MIN;
  const uraniumWastePerMinFromChain = plan.fuelChainSummary?.producedItems.uranium_waste ?? 0;
  const uraniumWastePerMin = Math.max(uraniumWastePerMinFromPlants, uraniumWastePerMinFromChain);
  const plutoniumWastePerMin = plan.fuelChainSummary?.producedItems.plutonium_waste ?? 0;

  const industrialContainersPerHour = (uraniumWastePerMin * 60) / INDUSTRIAL_CONTAINER_WASTE_CAPACITY;

  let timeToFillCurrentStorageMinutes: number | null = null;
  if (input.currentWasteContainers && input.currentWasteContainers > 0 && uraniumWastePerMin > 0) {
    const totalCapacity = input.currentWasteContainers * INDUSTRIAL_CONTAINER_WASTE_CAPACITY;
    timeToFillCurrentStorageMinutes = totalCapacity / uraniumWastePerMin;
  }

  return {
    plan,
    uraniumWastePerMin,
    plutoniumWastePerMin,
    industrialContainersPerHour,
    timeToFillCurrentStorageMinutes,
  };
}

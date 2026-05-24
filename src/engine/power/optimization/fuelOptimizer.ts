import type { FuelOptimizationResult, PowerOptimizeGoal, PowerPlannerInput, PowerStrategyMetrics } from '../../../types/power';
import { getPlanComplexityScore, planPower } from '../planner/powerPlanner';

const STRATEGY_FUELS: PowerPlannerInput['fuelType'][] = [
  'fuel',
  'turbofuel',
  'rocket_fuel',
  'nuclear',
  'coal',
  'geothermal',
  'biomass',
];

function sumMachines(machineCounts: Record<string, number>): number {
  let total = 0;
  for (const count of Object.values(machineCounts)) {
    total += Math.ceil(count);
  }
  return total;
}

function toMetric(input: PowerPlannerInput, fuelType: PowerPlannerInput['fuelType']): PowerStrategyMetrics {
  const plan = planPower({ ...input, fuelType });
  const oilPerMin = plan.rawResourceInputs.crude_oil ?? 0;
  const sulfurPerMin = plan.rawResourceInputs.sulfur ?? 0;
  const uraniumPerMin = plan.rawResourceInputs.uranium ?? 0;
  const machineCount = sumMachines(plan.machineCounts);

  return {
    fuelType,
    label: plan.generatorMachineName,
    plannedPowerMW: plan.plannedPowerMW,
    oilPerMin,
    sulfurPerMin,
    uraniumPerMin,
    machineCount,
    startupPowerMW: plan.startupPowerMW,
    powerPerOil: oilPerMin > 0 ? plan.plannedPowerMW / oilPerMin : Number.POSITIVE_INFINITY,
    powerPerSulfur: sulfurPerMin > 0 ? plan.plannedPowerMW / sulfurPerMin : Number.POSITIVE_INFINITY,
    powerDensity: machineCount > 0 ? plan.plannedPowerMW / machineCount : 0,
    complexityScore: getPlanComplexityScore(plan),
    reservePercent: plan.reservePercentActual,
  };
}

function pickBest(strategies: PowerStrategyMetrics[], optimizeFor: PowerOptimizeGoal): PowerStrategyMetrics | null {
  if (strategies.length === 0) return null;

  const safeMin = (value: number) => (Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER);
  const safeMax = (value: number) => (Number.isFinite(value) ? value : Number.MIN_SAFE_INTEGER);

  const sorted = [...strategies].sort((a, b) => {
    if (optimizeFor === 'lowest_oil') return safeMin(a.oilPerMin) - safeMin(b.oilPerMin);
    if (optimizeFor === 'lowest_sulfur') return safeMin(a.sulfurPerMin) - safeMin(b.sulfurPerMin);
    if (optimizeFor === 'highest_density') return safeMax(b.powerDensity) - safeMax(a.powerDensity);
    if (optimizeFor === 'lowest_startup_power') return safeMin(a.startupPowerMW) - safeMin(b.startupPowerMW);

    const scoreA = a.plannedPowerMW / (1 + a.complexityScore + a.startupPowerMW / 100);
    const scoreB = b.plannedPowerMW / (1 + b.complexityScore + b.startupPowerMW / 100);
    return scoreB - scoreA;
  });

  return sorted[0] ?? null;
}

function buildRecommendation(best: PowerStrategyMetrics | null, goal: PowerOptimizeGoal): string {
  if (!best) return 'No strategy available for the selected constraints.';

  if (goal === 'lowest_oil') {
    return `${best.fuelType} minimizes oil usage (${best.oilPerMin.toFixed(1)}/min) for this target power.`;
  }
  if (goal === 'lowest_sulfur') {
    return `${best.fuelType} minimizes sulfur usage (${best.sulfurPerMin.toFixed(1)}/min) for this target power.`;
  }
  if (goal === 'highest_density') {
    return `${best.fuelType} gives the highest power density (${best.powerDensity.toFixed(1)} MW per building).`;
  }
  if (goal === 'lowest_startup_power') {
    return `${best.fuelType} has the lowest startup load (${best.startupPowerMW.toFixed(1)} MW).`;
  }
  return `${best.fuelType} is the best balanced option for the selected power target.`;
}

export function optimizeFuelStrategies(
  input: PowerPlannerInput,
  optimizeFor: PowerOptimizeGoal = 'balanced',
): FuelOptimizationResult {
  const strategies = STRATEGY_FUELS.map((fuelType) => toMetric(input, fuelType));
  const best = pickBest(strategies, optimizeFor);

  return {
    optimizeFor,
    strategies,
    best,
    recommendation: buildRecommendation(best, optimizeFor),
  };
}

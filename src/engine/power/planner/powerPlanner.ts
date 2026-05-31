import type { ItemId } from '../../data';
import { items, machines } from '../../data';
import { calculateSummary, type RecipeSelectionMap, solve } from '../../solver';
import type {
  PowerComplexityPreference,
  PowerFuelType,
  PowerPlanResult,
  PowerPlannerInput,
  PowerUnit,
} from '../../../types/power';

interface PowerFuelProfile {
  id: PowerFuelType;
  label: string;
  generatorId: string;
  generatorMachineName: string;
  basePowerMW: number;
  fuelItemId: ItemId | null;
  fuelPerGeneratorPerMin: number;
  generatorWaterPerMin: number;
  standardRecipes: RecipeSelectionMap;
  alternateRecipes: RecipeSelectionMap;
}

const WATER_EXTRACTOR_RATE_PER_MIN = 120;
const MAX_GENERATOR_CLOCK = 2.5;
const MIN_GENERATOR_CLOCK = 1;

export const POWER_FUEL_PROFILES: Record<PowerFuelType, PowerFuelProfile> = {
  biomass: {
    id: 'biomass',
    label: 'Biomass Burners',
    generatorId: 'biomass_burner',
    generatorMachineName: 'Biomass Burner',
    basePowerMW: 30,
    fuelItemId: 'solid_biofuel',
    fuelPerGeneratorPerMin: 4.5,
    generatorWaterPerMin: 0,
    standardRecipes: { solid_biofuel: 'recipe_solid_biofuel' },
    alternateRecipes: { solid_biofuel: 'recipe_solid_biofuel' },
  },
  coal: {
    id: 'coal',
    label: 'Coal Generators',
    generatorId: 'coal_generator',
    generatorMachineName: 'Coal Generator',
    basePowerMW: 75,
    fuelItemId: 'coal',
    fuelPerGeneratorPerMin: 15,
    generatorWaterPerMin: 45,
    standardRecipes: { coal: 'recipe_coal' },
    alternateRecipes: { coal: 'recipe_coal' },
  },
  fuel: {
    id: 'fuel',
    label: 'Fuel Generators (Fuel)',
    generatorId: 'fuel_generator',
    generatorMachineName: 'Fuel Generator',
    basePowerMW: 250,
    fuelItemId: 'fuel',
    fuelPerGeneratorPerMin: 20,
    generatorWaterPerMin: 0,
    standardRecipes: { fuel: 'recipe_fuel' },
    alternateRecipes: { fuel: 'recipe_alternate_dilutedfuel_c' },
  },
  turbofuel: {
    id: 'turbofuel',
    label: 'Fuel Generators (Turbofuel)',
    generatorId: 'fuel_generator',
    generatorMachineName: 'Fuel Generator',
    basePowerMW: 250,
    fuelItemId: 'turbofuel',
    fuelPerGeneratorPerMin: 7.5,
    generatorWaterPerMin: 0,
    standardRecipes: { turbofuel: 'recipe_turbofuel' },
    alternateRecipes: {
      fuel: 'recipe_alternate_dilutedfuel_c',
      turbofuel: 'recipe_alternate_turboblendfuel_c',
    },
  },
  rocket_fuel: {
    id: 'rocket_fuel',
    label: 'Fuel Generators (Rocket Fuel)',
    generatorId: 'fuel_generator',
    generatorMachineName: 'Fuel Generator',
    basePowerMW: 250,
    fuelItemId: 'rocket_fuel',
    fuelPerGeneratorPerMin: 25 / 6,
    generatorWaterPerMin: 0,
    standardRecipes: { rocket_fuel: 'recipe_rocket_fuel' },
    alternateRecipes: {
      fuel: 'recipe_alternate_dilutedfuel_c',
      turbofuel: 'recipe_alternate_turboblendfuel_c',
      rocket_fuel: 'recipe_alternate_rocketfuel_nitro_c',
    },
  },
  ionized_fuel: {
    id: 'ionized_fuel',
    label: 'Fuel Generators (Ionized Fuel)',
    generatorId: 'fuel_generator',
    generatorMachineName: 'Fuel Generator',
    basePowerMW: 250,
    fuelItemId: 'ionized_fuel',
    fuelPerGeneratorPerMin: 3,
    generatorWaterPerMin: 0,
    standardRecipes: {
      ionized_fuel: 'recipe_ionized_fuel',
      rocket_fuel: 'recipe_rocket_fuel',
      power_shard: 'recipe_synthetic_power_shard',
    },
    alternateRecipes: {
      ionized_fuel: 'recipe_alternate_dark_ion_fuel',
      rocket_fuel: 'recipe_alternate_rocket_fuel',
    },
  },
  nuclear: {
    id: 'nuclear',
    label: 'Nuclear Power Plants',
    generatorId: 'nuclear_power_plant',
    generatorMachineName: 'Nuclear Power Plant',
    basePowerMW: 2500,
    fuelItemId: 'uranium_fuel_rod',
    fuelPerGeneratorPerMin: 0.2,
    generatorWaterPerMin: 240,
    standardRecipes: { uranium_fuel_rod: 'recipe_uranium_fuel_rod' },
    alternateRecipes: {
      uranium_fuel_rod: 'recipe_alternate_nuclearfuelrod_1_c',
      encased_uranium_cell: 'recipe_alternate_uraniumcell_1_c',
    },
  },
  geothermal: {
    id: 'geothermal',
    label: 'Geothermal Generators',
    generatorId: 'geothermal_generator',
    generatorMachineName: 'Geothermal Generator',
    basePowerMW: 200,
    fuelItemId: null,
    fuelPerGeneratorPerMin: 0,
    generatorWaterPerMin: 0,
    standardRecipes: {},
    alternateRecipes: {},
  },
};

export function convertToMW(value: number, unit: PowerUnit): number {
  if (unit === 'GW') return value * 1000;
  if (unit === 'TW') return value * 1_000_000;
  return value;
}

function clampGeneratorClock(input: PowerPlannerInput): number {
  if (!input.allowOverclock) return 1;
  return Math.min(MAX_GENERATOR_CLOCK, Math.max(MIN_GENERATOR_CLOCK, input.generatorClockSpeed || 1));
}

function chooseRecipes(
  profile: PowerFuelProfile,
  allowAlternateRecipes: boolean,
  preferredComplexity: PowerComplexityPreference,
): RecipeSelectionMap {
  if (!allowAlternateRecipes) return { ...profile.standardRecipes };
  if (preferredComplexity === 'low') return { ...profile.standardRecipes };
  if (preferredComplexity === 'balanced') {
    if (profile.id === 'fuel') return { ...profile.alternateRecipes };
    return { ...profile.standardRecipes };
  }
  return { ...profile.alternateRecipes };
}

function sumValues(record: Record<string, number>): number {
  let total = 0;
  for (const value of Object.values(record)) {
    total += value;
  }
  return total;
}

function buildWarnings(
  rawInputs: Record<string, number>,
  limits: Partial<Record<ItemId, number>> | undefined,
): string[] {
  if (!limits) return [];
  const warnings: string[] = [];
  for (const [itemId, maxRate] of Object.entries(limits)) {
    if (!maxRate || maxRate <= 0) continue;
    const used = rawInputs[itemId] ?? 0;
    if (used > maxRate) {
      warnings.push(
        `${items[itemId]?.name || itemId} usage (${used.toFixed(1)}/min) exceeds limit (${maxRate.toFixed(1)}/min).`,
      );
    }
  }
  return warnings;
}

export function planPower(input: PowerPlannerInput): PowerPlanResult {
  const profile = POWER_FUEL_PROFILES[input.fuelType];
  const targetPowerMW = convertToMW(input.targetPower, input.unit);
  const requiredPowerMW = targetPowerMW * (1 + Math.max(0, input.reservePercent) / 100);
  const clock = clampGeneratorClock(input);
  const perGeneratorPowerMW = profile.basePowerMW * clock;
  const generatorCount = Math.max(1, Math.ceil(requiredPowerMW / perGeneratorPowerMW));
  const plannedPowerMW = generatorCount * perGeneratorPowerMW;
  const reserveMW = plannedPowerMW - targetPowerMW;
  const reservePercentActual = targetPowerMW > 0 ? (reserveMW / targetPowerMW) * 100 : 0;
  const efficiencyPercent = plannedPowerMW > 0 ? (targetPowerMW / plannedPowerMW) * 100 : 0;

  const fuelRatePerMin = generatorCount * profile.fuelPerGeneratorPerMin * clock;
  const generatorWaterPerMin = generatorCount * profile.generatorWaterPerMin * clock;

  const selectedRecipes = chooseRecipes(profile, input.allowAlternateRecipes, input.preferredComplexity);
  let fuelChainRoot: PowerPlanResult['fuelChainRoot'] = null;
  let fuelChainSummary: PowerPlanResult['fuelChainSummary'] = null;
  let chainWarnings: string[] = [];

  try {
    if (profile.fuelItemId && fuelRatePerMin > 0) {
      fuelChainRoot = solve(profile.fuelItemId, fuelRatePerMin, input.minerId, selectedRecipes);
      fuelChainSummary = calculateSummary(fuelChainRoot);
    }
  } catch (error: any) {
    chainWarnings = [
      `Fuel chain solve failed for ${profile.label}: ${error?.message || 'Unknown solver error.'}`,
    ];
  }

  const rawResourceInputs = { ...(fuelChainSummary?.rawInputs ?? {}) };
  const fuelChainWaterRatePerMin = rawResourceInputs.water ?? 0;
  const waterRatePerMin = generatorWaterPerMin + fuelChainWaterRatePerMin;
  rawResourceInputs.water = waterRatePerMin;

  const machineCounts: Record<string, number> = { ...(fuelChainSummary?.machineCounts ?? {}) };
  machineCounts[profile.generatorId] = (machineCounts[profile.generatorId] ?? 0) + generatorCount;

  const extraWaterExtractors = Math.ceil(generatorWaterPerMin / WATER_EXTRACTOR_RATE_PER_MIN);
  if (extraWaterExtractors > 0) {
    machineCounts.water_extractor = (machineCounts.water_extractor ?? 0) + extraWaterExtractors;
  }

  const startupPowerFromFuelChain = fuelChainSummary?.totalPower ?? 0;
  const extraWaterPower = extraWaterExtractors * (machines.water_extractor?.powerUsage ?? 20);
  const startupPowerMW = startupPowerFromFuelChain + extraWaterPower;

  const buildingCounts = Object.entries(machineCounts)
    .map(([id, count]) => ({
      id,
      name: machines[id]?.name || (id === profile.generatorId ? profile.generatorMachineName : id),
      count: Math.ceil(count),
    }))
    .sort((a, b) => b.count - a.count);

  const warnings = [
    ...chainWarnings,
    ...buildWarnings(rawResourceInputs, input.maxResourceLimits),
  ];

  if (profile.id === 'geothermal') {
    warnings.push('Geothermal output fluctuates in-game; include batteries for stable output.');
  }

  return {
    input,
    targetPowerMW,
    requiredPowerMW,
    plannedPowerMW,
    reserveMW,
    reservePercentActual,
    efficiencyPercent,
    generatorMachineName: profile.generatorMachineName,
    generatorCount,
    perGeneratorPowerMW,
    fuelItemId: profile.fuelItemId,
    fuelRatePerMin,
    waterRatePerMin,
    generatorWaterRatePerMin: generatorWaterPerMin,
    fuelChainWaterRatePerMin,
    startupPowerMW,
    buildingCounts,
    rawResourceInputs,
    machineCounts,
    selectedRecipes,
    fuelChainRoot,
    fuelChainSummary,
    warnings,
  };
}

export function getPlanComplexityScore(result: PowerPlanResult): number {
  const machineTypes = Object.keys(result.machineCounts).length;
  const rawInputs = Object.keys(result.rawResourceInputs).length;
  const totalMachines = sumValues(result.machineCounts);
  return machineTypes * 4 + rawInputs * 3 + Math.log10(1 + totalMachines) * 10;
}

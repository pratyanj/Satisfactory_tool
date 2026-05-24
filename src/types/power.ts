import type { ItemId, MachineId } from '../engine/data';
import type { RecipeSelectionMap, SolverNode, SummaryData } from '../engine/solver';

export type PowerUnit = 'MW' | 'GW' | 'TW';

export type PowerFuelType =
  | 'biomass'
  | 'coal'
  | 'fuel'
  | 'turbofuel'
  | 'rocket_fuel'
  | 'nuclear'
  | 'geothermal';

export type PowerComplexityPreference = 'low' | 'balanced' | 'high';

export type PowerOptimizeGoal =
  | 'balanced'
  | 'lowest_oil'
  | 'lowest_sulfur'
  | 'highest_density'
  | 'lowest_startup_power';

export interface PowerPlannerInput {
  targetPower: number;
  unit: PowerUnit;
  fuelType: PowerFuelType;
  reservePercent: number;
  allowOverclock: boolean;
  generatorClockSpeed: number;
  allowAlternateRecipes: boolean;
  preferredComplexity: PowerComplexityPreference;
  minerId: MachineId;
  maxResourceLimits?: Partial<Record<ItemId, number>>;
}

export interface PowerBuildingCount {
  id: string;
  name: string;
  count: number;
}

export interface PowerPlanResult {
  input: PowerPlannerInput;
  targetPowerMW: number;
  requiredPowerMW: number;
  plannedPowerMW: number;
  reserveMW: number;
  reservePercentActual: number;
  efficiencyPercent: number;
  generatorMachineName: string;
  generatorCount: number;
  perGeneratorPowerMW: number;
  fuelItemId: ItemId | null;
  fuelRatePerMin: number;
  waterRatePerMin: number;
  generatorWaterRatePerMin: number;
  fuelChainWaterRatePerMin: number;
  startupPowerMW: number;
  buildingCounts: PowerBuildingCount[];
  rawResourceInputs: Record<string, number>;
  machineCounts: Record<string, number>;
  selectedRecipes: RecipeSelectionMap;
  fuelChainRoot: SolverNode | null;
  fuelChainSummary: SummaryData | null;
  warnings: string[];
}

export interface PowerStrategyMetrics {
  fuelType: PowerFuelType;
  label: string;
  plannedPowerMW: number;
  oilPerMin: number;
  sulfurPerMin: number;
  uraniumPerMin: number;
  machineCount: number;
  startupPowerMW: number;
  powerPerOil: number;
  powerPerSulfur: number;
  powerDensity: number;
  complexityScore: number;
  reservePercent: number;
}

export interface FuelOptimizationResult {
  optimizeFor: PowerOptimizeGoal;
  strategies: PowerStrategyMetrics[];
  best: PowerStrategyMetrics | null;
  recommendation: string;
}

export interface SimulationSpikeEvent {
  startMinute: number;
  durationMinutes: number;
  deltaMW: number;
  label: string;
}

export interface PowerSimulationInput {
  durationMinutes: number;
  baselineConsumptionMW: number;
  plannedProductionMW: number;
  batteryCount: number;
  batteryStoredMWh: number;
  batteryMaxOutputMW: number;
  spikes: SimulationSpikeEvent[];
  fuelStarvationAtMinute?: number;
}

export interface SimulationTimelinePoint {
  minute: number;
  productionMW: number;
  consumptionMW: number;
  reserveMW: number;
  batteryOutputMW: number;
  batteryStoredMWh: number;
  blackout: boolean;
}

export interface PowerSimulationResult {
  timeline: SimulationTimelinePoint[];
  blackoutMinute: number | null;
  minimumReserveMW: number;
  survivedDurationMinutes: number;
  summary: string;
}

export interface NuclearPlannerInput {
  targetPower: number;
  unit: PowerUnit;
  reservePercent: number;
  allowAlternateRecipes: boolean;
  generatorClockSpeed: number;
  currentWasteContainers?: number;
}

export interface NuclearPlannerResult {
  plan: PowerPlanResult;
  uraniumWastePerMin: number;
  plutoniumWastePerMin: number;
  industrialContainersPerHour: number;
  timeToFillCurrentStorageMinutes: number | null;
}

export interface SavePowerRecommendation {
  id: string;
  message: string;
  priority: 'critical' | 'warning' | 'info';
}

export interface SavePowerAnalysisResult {
  productionMW: number;
  consumptionMW: number;
  reserveMW: number;
  reservePercent: number;
  gridStability: number;
  healthScore: number;
  recommendations: SavePowerRecommendation[];
}

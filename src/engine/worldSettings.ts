import { isFluidItem, type ResourceInput } from './data';

/** Node purity options available for Satisfactory resource extraction & 1.2 world settings. */
export type NodePurity = 'impure' | 'normal' | 'pure';

/** Global Satisfactory 1.2 Game Mode / World Settings affecting factory planning. */
export interface WorldSettings {
  recipeCostMultiplier: number;
  powerMultiplier: number;
  defaultNodePurity: NodePurity;
}

/** Official Satisfactory 1.2 Game Mode presets for Recipe Parts Cost Multiplier. */
export const RECIPE_COST_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/** Official Satisfactory 1.2 Game Mode presets for Power Consumption Multiplier. */
export const POWER_MULTIPLIER_PRESETS = [0.25, 0.5, 0.75, 1, 2, 5] as const;

/** Bounds for optional custom multiplier overrides (supports modded/legacy >2x values). */
export const MIN_WORLD_MULTIPLIER = 0.1;
export const MAX_WORLD_MULTIPLIER = 100;

export const NODE_PURITY_MULTIPLIERS: Record<NodePurity, number> = {
  impure: 0.5,
  normal: 1.0,
  pure: 2.0,
};

export const NODE_PURITY_OPTIONS: readonly { value: NodePurity; label: string; badge: string }[] = [
  { value: 'impure', label: 'Impure (0.5×)', badge: 'All Impure' },
  { value: 'normal', label: 'Normal (1×)', badge: 'Default' },
  { value: 'pure', label: 'Pure (2×)', badge: 'All Pure' },
];

/** Satisfactory 0.7+ machine overclock power exponent: log2(2.5) ≈ 1.321928. */
export const OVERCLOCK_POWER_EXPONENT = Math.log2(2.5);

export const DEFAULT_WORLD_SETTINGS: Readonly<WorldSettings> = {
  recipeCostMultiplier: 1,
  powerMultiplier: 1,
  defaultNodePurity: 'normal',
};

/**
 * Clamp and validate a world multiplier, falling back to `fallback` for invalid inputs.
 */
export function normalizeMultiplier(value: unknown, fallback: number = 1): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  const clamped = Math.min(MAX_WORLD_MULTIPLIER, Math.max(MIN_WORLD_MULTIPLIER, num));
  return Math.round(clamped * 1000) / 1000;
}

export function isValidNodePurity(value: unknown): value is NodePurity {
  return value === 'impure' || value === 'normal' || value === 'pure';
}

export function getNodePurityMultiplier(purity: NodePurity = 'normal'): number {
  return NODE_PURITY_MULTIPLIERS[purity] ?? 1.0;
}

/**
 * Compute the effective per-machine input rate (items or m³ per minute) at 100% clock
 * under Satisfactory 1.2's Recipe Parts Cost Multiplier:
 * - At 1×: returns the vanilla `input.rate`.
 * - Fluids (liquids/gases): scale continuously (`input.rate * costMultiplier`), matching in-game mL precision.
 * - Solids with cycle metadata: scales the per-cycle integer `amount`, rounds to nearest integer
 *   with a hard floor of 1 (`max(1, round(amount * mult))`), then converts back via `60 / cycleTime`.
 * - Fallback (recipes lacking cycle metadata): linear `input.rate * costMultiplier`.
 */
export function getEffectiveInputRate(
  input: ResourceInput,
  cycleTime: number | undefined,
  recipeCostMultiplier: number = 1
): number {
  const mult = normalizeMultiplier(recipeCostMultiplier, 1);
  if (Math.abs(mult - 1) < 1e-9) {
    return input.rate;
  }

  if (isFluidItem(input.itemId)) {
    return Math.round(input.rate * mult * 1e6) / 1e6;
  }

  if (
    typeof input.amount === 'number' &&
    Number.isFinite(input.amount) &&
    input.amount > 0 &&
    typeof cycleTime === 'number' &&
    Number.isFinite(cycleTime) &&
    cycleTime > 0
  ) {
    const scaledPerCycle = Math.max(1, Math.round(input.amount * mult));
    return Math.round(((scaledPerCycle * 60) / cycleTime) * 1e6) / 1e6;
  }

  return Math.round(input.rate * mult * 1e6) / 1e6;
}

/**
 * Compute power consumption (MW) for a single machine accounting for clock speed,
 * Somersloop amplification (4×), and global World Power Consumption Multiplier.
 */
export function getMachinePowerMW(
  basePowerMW: number,
  clockSpeed: number = 100,
  isSomerslooped: boolean = false,
  powerMultiplier: number = 1
): number {
  const mult = normalizeMultiplier(powerMultiplier, 1);
  const safeClock = Number.isFinite(clockSpeed) && clockSpeed >= 0 ? clockSpeed : 100;
  return (
    basePowerMW *
    mult *
    Math.pow(safeClock / 100, OVERCLOCK_POWER_EXPONENT) *
    (isSomerslooped ? 4 : 1)
  );
}

/**
 * True when any World Setting differs from Satisfactory's default 1× / Normal rules.
 */
export function hasActiveWorldSettings(settings: Partial<WorldSettings>): boolean {
  const cost = normalizeMultiplier(settings.recipeCostMultiplier ?? 1, 1);
  const power = normalizeMultiplier(settings.powerMultiplier ?? 1, 1);
  const purity = settings.defaultNodePurity ?? 'normal';
  return Math.abs(cost - 1) > 1e-9 || Math.abs(power - 1) > 1e-9 || purity !== 'normal';
}

/**
 * Format a multiplier cleanly without trailing zeros (e.g. 1 -> "1", 1.25 -> "1.25", 0.5 -> "0.5").
 */
export function formatMultiplier(value: number): string {
  return Number(normalizeMultiplier(value, 1).toFixed(3)).toString();
}

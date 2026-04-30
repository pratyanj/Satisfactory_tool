/**
 * buildingClassifier.ts
 * Maps Satisfactory Unreal class paths → human-readable display info.
 * Sprint 4: massively expanded CLASS_MAP to eliminate '?' unknown markers.
 */

export type BuildingCategory =
  | 'extraction'
  | 'smelting'
  | 'production'
  | 'power'
  | 'storage'
  | 'logistics'
  | 'special'
  | 'unknown';

export interface BuildingInfo {
  name: string;
  shortName: string;
  category: BuildingCategory;
  /** Hex color for map marker */
  color: string;
  /** Emoji icon for popups */
  emoji: string;
}

/** Partial class path string → info. Checked with includes(). */
const CLASS_MAP: Array<[string, BuildingInfo]> = [
  // === EXTRACTION ===
  ['Build_MinerMk1',              { name: 'Miner Mk.1',                shortName: 'Miner 1',       category: 'extraction', color: '#f97316', emoji: '⛏️' }],
  ['Build_MinerMk2',              { name: 'Miner Mk.2',                shortName: 'Miner 2',       category: 'extraction', color: '#fb923c', emoji: '⛏️' }],
  ['Build_MinerMk3',              { name: 'Miner Mk.3',                shortName: 'Miner 3',       category: 'extraction', color: '#fdba74', emoji: '⛏️' }],
  ['Build_OilPump',               { name: 'Oil Extractor',              shortName: 'Oil Pump',      category: 'extraction', color: '#7c3aed', emoji: '🛢️' }],
  ['Build_WaterPump',             { name: 'Water Extractor',            shortName: 'Water Pump',    category: 'extraction', color: '#0ea5e9', emoji: '💧' }],
  ['Build_FrackingExtractor',     { name: 'Resource Well Extractor',    shortName: 'Extractor',     category: 'extraction', color: '#a78bfa', emoji: '🔩' }],
  ['Build_FrackingActivator',     { name: 'Resource Well Pressurizer',  shortName: 'Pressurizer',   category: 'extraction', color: '#8b5cf6', emoji: '⚡' }],
  ['GeyserBase',                  { name: 'Geothermal Source',          shortName: 'Geyser',        category: 'extraction', color: '#fb923c', emoji: '♨️' }],

  // === SMELTING / FOUNDRY ===
  ['Build_SmelterMk1',            { name: 'Smelter',                    shortName: 'Smelter',       category: 'smelting',   color: '#ef4444', emoji: '🔥' }],
  ['Build_FoundryMk1',            { name: 'Foundry',                    shortName: 'Foundry',       category: 'smelting',   color: '#dc2626', emoji: '🏭' }],

  // === PRODUCTION ===
  ['Build_ConstructorMk1',        { name: 'Constructor',                shortName: 'Constructor',   category: 'production', color: '#22c55e', emoji: '🔧' }],
  ['Build_AssemblerMk1',          { name: 'Assembler',                  shortName: 'Assembler',     category: 'production', color: '#16a34a', emoji: '⚙️' }],
  ['Build_ManufacturerMk1',       { name: 'Manufacturer',               shortName: 'Manufacturer',  category: 'production', color: '#15803d', emoji: '🏗️' }],
  ['Build_Packager',              { name: 'Packager',                   shortName: 'Packager',      category: 'production', color: '#84cc16', emoji: '📦' }],
  ['Build_OilRefinery',           { name: 'Refinery',                   shortName: 'Refinery',      category: 'production', color: '#a3e635', emoji: '🏭' }],
  ['Build_Refinery',              { name: 'Refinery',                   shortName: 'Refinery',      category: 'production', color: '#a3e635', emoji: '🏭' }],
  ['Build_Blender',               { name: 'Blender',                    shortName: 'Blender',       category: 'production', color: '#bef264', emoji: '🔬' }],
  ['Build_HadronCollider',        { name: 'Particle Accelerator',       shortName: 'Particle Acc.', category: 'production', color: '#f0abfc', emoji: '⚛️' }],
  ['Build_QuantumEncoder',        { name: 'Quantum Encoder',            shortName: 'Q. Encoder',    category: 'production', color: '#e879f9', emoji: '🔮' }],
  ['Build_Converter',             { name: 'Converter',                  shortName: 'Converter',     category: 'production', color: '#d946ef', emoji: '🔄' }],
  ['Build_AlienPowerAugmenter',   { name: 'Alien Power Augmenter',      shortName: 'Augmenter',     category: 'production', color: '#c026d3', emoji: '👽' }],

  // === POWER ===
  ['Build_GeneratorCoal',         { name: 'Coal Generator',             shortName: 'Coal Gen',      category: 'power',      color: '#fbbf24', emoji: '⚡' }],
  ['Build_GeneratorFuel',         { name: 'Fuel Generator',             shortName: 'Fuel Gen',      category: 'power',      color: '#f59e0b', emoji: '⚡' }],
  ['Build_GeneratorNuclear',      { name: 'Nuclear Power Plant',        shortName: 'Nuclear',       category: 'power',      color: '#d97706', emoji: '☢️' }],
  ['Build_GeneratorGeoThermal',   { name: 'Geothermal Generator',       shortName: 'Geothermal',    category: 'power',      color: '#b45309', emoji: '🌋' }],
  ['Build_GeneratorBiomass',      { name: 'Biomass Burner',             shortName: 'Biomass',       category: 'power',      color: '#92400e', emoji: '🌿' }],
  ['Build_GeneratorSteam',        { name: 'Steam Generator',            shortName: 'Steam Gen',     category: 'power',      color: '#a16207', emoji: '♨️' }],
  ['Build_PowerStorageMk1',       { name: 'Power Storage',              shortName: 'Battery',       category: 'power',      color: '#78350f', emoji: '🔋' }],
  ['Build_PowerSwitch',           { name: 'Power Switch',               shortName: 'Switch',        category: 'power',      color: '#fef08a', emoji: '🔌' }],
  ['Build_PowerPoleMk1',          { name: 'Power Pole Mk.1',            shortName: 'Pole 1',        category: 'power',      color: '#fef08a', emoji: '🔌' }],
  ['Build_PowerPoleMk2',          { name: 'Power Pole Mk.2',            shortName: 'Pole 2',        category: 'power',      color: '#fef08a', emoji: '🔌' }],
  ['Build_PowerPoleMk3',          { name: 'Power Pole Mk.3',            shortName: 'Pole 3',        category: 'power',      color: '#fef08a', emoji: '🔌' }],
  ['Build_PowerPoleWall',         { name: 'Wall Power Pole',            shortName: 'Wall Pole',     category: 'power',      color: '#fef08a', emoji: '🔌' }],
  ['Build_PowerTower',            { name: 'Power Tower',                shortName: 'Tower',         category: 'power',      color: '#fde68a', emoji: '🗼' }],
  ['PowerLine',                   { name: 'Power Line',                 shortName: 'Wire',          category: 'power',      color: '#fde68a', emoji: '〰️' }],
  ['PowerPole',                   { name: 'Power Pole',                 shortName: 'Pole',          category: 'power',      color: '#fef08a', emoji: '🔌' }],

  // === LOGISTICS ===
  ['Build_ConveyorBeltMk1',       { name: 'Conveyor Belt Mk.1',         shortName: 'Belt 1',        category: 'logistics',  color: '#94a3b8', emoji: '➡️' }],
  ['Build_ConveyorBeltMk2',       { name: 'Conveyor Belt Mk.2',         shortName: 'Belt 2',        category: 'logistics',  color: '#38bdf8', emoji: '➡️' }],
  ['Build_ConveyorBeltMk3',       { name: 'Conveyor Belt Mk.3',         shortName: 'Belt 3',        category: 'logistics',  color: '#4ade80', emoji: '➡️' }],
  ['Build_ConveyorBeltMk4',       { name: 'Conveyor Belt Mk.4',         shortName: 'Belt 4',        category: 'logistics',  color: '#facc15', emoji: '➡️' }],
  ['Build_ConveyorBeltMk5',       { name: 'Conveyor Belt Mk.5',         shortName: 'Belt 5',        category: 'logistics',  color: '#f97316', emoji: '➡️' }],
  ['Build_ConveyorBeltMk6',       { name: 'Conveyor Belt Mk.6',         shortName: 'Belt 6',        category: 'logistics',  color: '#a855f7', emoji: '➡️' }],
  ['Build_ConveyorLiftMk1',       { name: 'Conveyor Lift Mk.1',         shortName: 'Lift 1',        category: 'logistics',  color: '#64748b', emoji: '⬆️' }],
  ['Build_ConveyorLiftMk2',       { name: 'Conveyor Lift Mk.2',         shortName: 'Lift 2',        category: 'logistics',  color: '#64748b', emoji: '⬆️' }],
  ['Build_ConveyorLiftMk3',       { name: 'Conveyor Lift Mk.3',         shortName: 'Lift 3',        category: 'logistics',  color: '#64748b', emoji: '⬆️' }],
  ['Build_ConveyorLiftMk4',       { name: 'Conveyor Lift Mk.4',         shortName: 'Lift 4',        category: 'logistics',  color: '#64748b', emoji: '⬆️' }],
  ['Build_ConveyorLiftMk5',       { name: 'Conveyor Lift Mk.5',         shortName: 'Lift 5',        category: 'logistics',  color: '#64748b', emoji: '⬆️' }],
  ['Build_ConveyorLift',          { name: 'Conveyor Lift',              shortName: 'Lift',          category: 'logistics',  color: '#64748b', emoji: '⬆️' }],
  ['Build_Pipeline',              { name: 'Pipeline',                   shortName: 'Pipe',          category: 'logistics',  color: '#22d3ee', emoji: '🔵' }],
  ['Build_PipelineMk2',           { name: 'Pipeline Mk.2',              shortName: 'Pipe 2',        category: 'logistics',  color: '#06b6d4', emoji: '🔵' }],
  ['Build_PipelinePump',          { name: 'Pipeline Pump',              shortName: 'Pump',          category: 'logistics',  color: '#0891b2', emoji: '💧' }],
  ['Build_PipelineSupportPole',   { name: 'Pipeline Support',           shortName: 'Pipe Support',  category: 'logistics',  color: '#0369a1', emoji: '🔩' }],
  ['Build_Splitter',              { name: 'Conveyor Splitter',          shortName: 'Splitter',      category: 'logistics',  color: '#f87171', emoji: '🔀' }],
  ['Build_Merger',                { name: 'Conveyor Merger',            shortName: 'Merger',        category: 'logistics',  color: '#fb923c', emoji: '🔀' }],
  ['Build_SmartSplitter',         { name: 'Smart Splitter',             shortName: 'Smart Split',   category: 'logistics',  color: '#f43f5e', emoji: '🧠' }],
  ['Build_ProgrammableSplitter',  { name: 'Programmable Splitter',      shortName: 'Prog. Split',   category: 'logistics',  color: '#e11d48', emoji: '💻' }],
  ['Build_DroneStation',          { name: 'Drone Port',                 shortName: 'Drone Port',    category: 'logistics',  color: '#c026d3', emoji: '🚁' }],
  ['Build_TrainStation',          { name: 'Train Station',              shortName: 'Train Sta.',    category: 'logistics',  color: '#9333ea', emoji: '🚂' }],
  ['Build_TrainDockingStation',   { name: 'Freight Platform',           shortName: 'Freight',       category: 'logistics',  color: '#7e22ce', emoji: '🚃' }],
  ['Build_RailroadTrack',         { name: 'Railroad Track',             shortName: 'Track',         category: 'logistics',  color: '#7c3aed', emoji: '🛤️' }],
  ['Build_TruckStation',          { name: 'Truck Station',              shortName: 'Truck Sta.',    category: 'logistics',  color: '#f59e0b', emoji: '🅿️' }],
  ['Build_RadarTower',            { name: 'Radar Tower',                shortName: 'Radar',         category: 'logistics',  color: '#4ade80', emoji: '📡' }],
  ['Build_HyperTubeEntrance',     { name: 'Hyper Tube Entrance',        shortName: 'HT Entrance',   category: 'logistics',  color: '#0ea5e9', emoji: '🌀' }],
  ['Build_HyperTube',             { name: 'Hyper Tube',                 shortName: 'Hyper Tube',    category: 'logistics',  color: '#38bdf8', emoji: '🌀' }],
  ['Build_JumpPad',               { name: 'Jump Pad',                   shortName: 'Jump Pad',      category: 'logistics',  color: '#facc15', emoji: '⬆️' }],
  ['Build_LandingPad',            { name: 'Landing Pad',                shortName: 'Landing Pad',   category: 'logistics',  color: '#fbbf24', emoji: '🛬' }],
  ['ConveyorPole',                { name: 'Conveyor Pole',              shortName: 'Conv. Pole',    category: 'logistics',  color: '#4b5563', emoji: '🔩' }],
  ['Vehicle_Truck',               { name: 'Truck',                      shortName: 'Truck',         category: 'logistics',  color: '#f59e0b', emoji: '🚛' }],
  ['Vehicle_Tractor',             { name: 'Tractor',                    shortName: 'Tractor',       category: 'logistics',  color: '#f97316', emoji: '🚜' }],
  ['Vehicle_Explorer',            { name: 'Explorer',                   shortName: 'Explorer',      category: 'logistics',  color: '#34d399', emoji: '🚙' }],
  ['Vehicle_CyberWagon',          { name: 'Cyber Wagon',                shortName: 'Cyber',         category: 'logistics',  color: '#60a5fa', emoji: '🚗' }],
  ['Locomotive',                  { name: 'Locomotive',                 shortName: 'Locomotive',    category: 'logistics',  color: '#9333ea', emoji: '🚂' }],
  ['FreightWagon',                { name: 'Freight Wagon',              shortName: 'Wagon',         category: 'logistics',  color: '#7c3aed', emoji: '🚃' }],

  // === STORAGE ===
  ['Build_StorageContainerMk1',   { name: 'Storage Container Mk.1',     shortName: 'Storage',       category: 'storage',    color: '#cbd5e1', emoji: '📦' }],
  ['Build_StorageContainerMk2',   { name: 'Storage Container Mk.2',     shortName: 'Storage 2',     category: 'storage',    color: '#94a3b8', emoji: '📦' }],
  ['Build_IndustrialStorageContainer', { name: 'Industrial Storage',    shortName: 'Ind. Storage',  category: 'storage',    color: '#64748b', emoji: '🏗️' }],
  ['Build_LiquidTank',            { name: 'Fluid Buffer',               shortName: 'Fluid Tank',    category: 'storage',    color: '#38bdf8', emoji: '💧' }],
  ['Build_NuclearWasteContainer', { name: 'Nuclear Waste Storage',      shortName: 'Waste Tank',    category: 'storage',    color: '#4ade80', emoji: '☢️' }],
  ['Build_PipeStorageTank',       { name: 'Industrial Fluid Buffer',    shortName: 'Ind. Buffer',   category: 'storage',    color: '#22d3ee', emoji: '💧' }],
  ['Build_CentralStorage',        { name: 'Central Storage',            shortName: 'Ctrl Storage',  category: 'storage',    color: '#94a3b8', emoji: '📦' }],
  ['Build_StoragePlayer',         { name: 'Personal Storage Box',       shortName: 'Personal Box',  category: 'storage',    color: '#cbd5e1', emoji: '🎒' }],

  // === SPECIAL ===
  ['HubTerminal',                 { name: 'HUB Terminal',               shortName: 'HUB',           category: 'special',    color: '#f472b6', emoji: '🎯' }],
  ['SpaceElevator',               { name: 'Space Elevator',             shortName: 'Space Elev.',   category: 'special',    color: '#818cf8', emoji: '🚀' }],
  ['Build_Workshop',              { name: 'Equipment Workshop',         shortName: 'Workshop',      category: 'special',    color: '#a78bfa', emoji: '🛠️' }],
  ['MAM',                         { name: 'MAM',                        shortName: 'MAM',           category: 'special',    color: '#a78bfa', emoji: '🔭' }],
  ['AwesomeShop',                 { name: 'AWESOME Shop',               shortName: 'A.W.E.S.O.M.E', category: 'special',    color: '#c084fc', emoji: '🌟' }],
  ['AwesomeSink',                 { name: 'AWESOME Sink',               shortName: 'Sink',          category: 'special',    color: '#e879f9', emoji: '♻️' }],
  ['Build_ResourceSink',          { name: 'AWESOME Sink',               shortName: 'Sink',          category: 'special',    color: '#e879f9', emoji: '♻️' }],
  ['Build_ResourceSinkShop',      { name: 'AWESOME Shop',               shortName: 'Shop',          category: 'special',    color: '#c084fc', emoji: '🛍️' }],

  // === STRUCTURES (show as logistics to avoid clutter) ===
  ['Foundation',                  { name: 'Foundation',                 shortName: 'Foundation',    category: 'logistics',  color: '#374151', emoji: '🧱' }],
  ['Wall',                        { name: 'Wall',                       shortName: 'Wall',          category: 'logistics',  color: '#4b5563', emoji: '🧱' }],
  ['Roof',                        { name: 'Roof',                       shortName: 'Roof',          category: 'logistics',  color: '#374151', emoji: '🏠' }],
  ['Pillar',                      { name: 'Pillar',                     shortName: 'Pillar',        category: 'logistics',  color: '#374151', emoji: '🔩' }],
  ['Beam',                        { name: 'Beam',                       shortName: 'Beam',          category: 'logistics',  color: '#374151', emoji: '🔩' }],
  ['Walkway',                     { name: 'Walkway',                    shortName: 'Walkway',       category: 'logistics',  color: '#374151', emoji: '🛤️' }],
  ['Stair',                       { name: 'Stairs',                     shortName: 'Stairs',        category: 'logistics',  color: '#374151', emoji: '🪜' }],
  ['Ramp',                        { name: 'Ramp',                       shortName: 'Ramp',          category: 'logistics',  color: '#374151', emoji: '📐' }],
  ['Door',                        { name: 'Door',                       shortName: 'Door',          category: 'logistics',  color: '#374151', emoji: '🚪' }],
  ['Window',                      { name: 'Window',                     shortName: 'Window',        category: 'logistics',  color: '#374151', emoji: '🪟' }],
];

/** Lookup building info from its Unreal class path. */
export function classifyBuilding(typePath: string): BuildingInfo {
  for (const [key, info] of CLASS_MAP) {
    if (typePath.includes(key)) return info;
  }
  return {
    name: typePath.split('/').pop()?.replace(/_C$/, '') ?? 'Building',
    shortName: 'Building',
    category: 'unknown',
    color: '#6b7280',
    emoji: '🏢',
  };
}

/** Get the color for a belt class path (used by ConveyorLayer). */
export function getBeltColor(typePath: string): string {
  if (typePath.includes('Mk6')) return '#a855f7';
  if (typePath.includes('Mk5')) return '#f97316';
  if (typePath.includes('Mk4')) return '#facc15';
  if (typePath.includes('Mk3')) return '#4ade80';
  if (typePath.includes('Mk2')) return '#38bdf8';
  return '#94a3b8';
}

/** Get pipe color */
export function getPipeColor(typePath: string): string {
  if (typePath.includes('Mk2')) return '#06b6d4';
  return '#22d3ee';
}

/** Get conveyor belt stroke weight by tier (Mk1 thin → Mk6 thick) */
export function getBeltWeight(typePath: string): number {
  if (typePath.includes('Mk6')) return 4;
  if (typePath.includes('Mk5')) return 3.5;
  if (typePath.includes('Mk4')) return 3;
  if (typePath.includes('Mk3')) return 2.5;
  if (typePath.includes('Mk2')) return 2;
  return 1.5;
}

/** Get conveyor lift weight */
export function getLiftWeight(_typePath: string): number {
  return 2;
}

/** All distinct categories for legend/filters */
export const BUILDING_CATEGORIES: BuildingCategory[] = [
  'extraction', 'smelting', 'production', 'power', 'storage', 'logistics', 'special', 'unknown',
];

export const CATEGORY_LABELS: Record<BuildingCategory, string> = {
  extraction: 'Extraction',
  smelting:   'Smelting / Foundry',
  production: 'Production',
  power:      'Power',
  storage:    'Storage',
  logistics:  'Logistics',
  special:    'Special',
  unknown:    'Unknown',
};

export const CATEGORY_COLORS: Record<BuildingCategory, string> = {
  extraction: '#f97316',
  smelting:   '#ef4444',
  production: '#22c55e',
  power:      '#fbbf24',
  storage:    '#cbd5e1',
  logistics:  '#94a3b8',
  special:    '#f472b6',
  unknown:    '#6b7280',
};

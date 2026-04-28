export type ItemId = string;
export type MachineId = string;
export type RecipeId = string;

export interface Item {
  id: ItemId;
  name: string;
  imageUrl?: string;
}

export interface ResourceInput {
  itemId: ItemId;
  rate: number; // per minute
}

export interface Recipe {
  id: RecipeId;
  outputItemId: ItemId;
  outputRate: number; // per minute
  inputs: ResourceInput[];
  machineId: MachineId;
}

export interface Machine {
  id: MachineId;
  name: string;
  powerUsage: number; // MW
  imageUrl: string;
}

// Initial Data
export const items: Record<ItemId, Item> = {
  copper_ore: { id: "copper_ore", name: "Copper Ore", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Copper_Ore.png" },
  copper_ingot: { id: "copper_ingot", name: "Copper Ingot", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Copper_Ingot.png" },
  copper_sheet: { id: "copper_sheet", name: "Copper Sheet", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Copper_Sheet.png" },
  wire: { id: "wire", name: "Wire", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Wire.png" },
  cable: { id: "cable", name: "Cable", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Cable.png" },
  iron_ore: { id: "iron_ore", name: "Iron Ore", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Iron_Ore.png" },
  iron_ingot: { id: "iron_ingot", name: "Iron Ingot", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Iron_Ingot.png" },
  iron_plate: { id: "iron_plate", name: "Iron Plate", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Iron_Plate.png" },
  iron_rod: { id: "iron_rod", name: "Iron Rod", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Iron_Rod.png" },
  screw: { id: "screw", name: "Screw", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Screw.png" },
  reinforced_iron_plate: { id: "reinforced_iron_plate", name: "Reinforced Iron Plate", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Reinforced_Iron_Plate.png" },
  limestone: { id: "limestone", name: "Limestone", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Limestone.png" },
  concrete: { id: "concrete", name: "Concrete", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Concrete.png" },
  coal: { id: "coal", name: "Coal", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Coal.png" },
  steel_ingot: { id: "steel_ingot", name: "Steel Ingot", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Steel_Ingot.png" },
  steel_beam: { id: "steel_beam", name: "Steel Beam", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Steel_Beam.png" },
  steel_pipe: { id: "steel_pipe", name: "Steel Pipe", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Steel_Pipe.png" },
  encased_industrial_beam: { id: "encased_industrial_beam", name: "Encased Industrial Beam", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Encased_Industrial_Beam.png" },
  rotor: { id: "rotor", name: "Rotor", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Rotor.png" },
  stator: { id: "stator", name: "Stator", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Stator.png" },
  motor: { id: "motor", name: "Motor", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Motor.png" },
  modular_frame: { id: "modular_frame", name: "Modular Frame", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Modular_Frame.png" },
  heavy_modular_frame: { id: "heavy_modular_frame", name: "Heavy Modular Frame", imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Heavy_Modular_Frame.png" },
};

export type BeltId = string;

export interface Belt {
  id: BeltId;
  name: string;
  capacity: number; // items per minute
}

export const belts: Record<BeltId, Belt> = {
  mk1: { id: "mk1", name: "Mk.1 Belt", capacity: 60 },
  mk2: { id: "mk2", name: "Mk.2 Belt", capacity: 120 },
  mk3: { id: "mk3", name: "Mk.3 Belt", capacity: 270 },
  mk4: { id: "mk4", name: "Mk.4 Belt", capacity: 480 },
  mk5: { id: "mk5", name: "Mk.5 Belt", capacity: 780 },
};

export const machines: Record<MachineId, Machine> = {
  miner_mk1: { id: "miner_mk1", name: "Miner Mk.1", powerUsage: 5, imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Miner_Mk.1.png" },
  miner_mk2: { id: "miner_mk2", name: "Miner Mk.2", powerUsage: 12, imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Miner_Mk.2.png" },
  miner_mk3: { id: "miner_mk3", name: "Miner Mk.3", powerUsage: 30, imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Miner_Mk.3.png" },
  smelter: { id: "smelter", name: "Smelter", powerUsage: 4, imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Smelter.png" },
  foundry: { id: "foundry", name: "Foundry", powerUsage: 16, imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Foundry.png" },
  constructor: { id: "constructor", name: "Constructor", powerUsage: 4, imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Constructor.png" },
  assembler: { id: "assembler", name: "Assembler", powerUsage: 15, imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Assembler.png" },
  manufacturer: { id: "manufacturer", name: "Manufacturer", powerUsage: 55, imageUrl: "https://satisfactory.wiki.gg/wiki/Special:FilePath/Manufacturer.png" },
};

export const recipes: Recipe[] = [
  {
    id: "recipe_copper_ore",
    outputItemId: "copper_ore",
    outputRate: 60,
    inputs: [],
    machineId: "miner_mk1",
  },
  {
    id: "recipe_copper_ingot",
    outputItemId: "copper_ingot",
    outputRate: 30,
    inputs: [{ itemId: "copper_ore", rate: 30 }],
    machineId: "smelter",
  },
  {
    id: "recipe_copper_sheet",
    outputItemId: "copper_sheet",
    outputRate: 10,
    inputs: [{ itemId: "copper_ingot", rate: 20 }],
    machineId: "constructor",
  },
  {
    id: "recipe_wire",
    outputItemId: "wire",
    outputRate: 30,
    inputs: [{ itemId: "copper_ingot", rate: 15 }],
    machineId: "constructor",
  },
  {
    id: "recipe_cable",
    outputItemId: "cable",
    outputRate: 30,
    inputs: [{ itemId: "wire", rate: 60 }],
    machineId: "constructor",
  },
  {
    id: "recipe_iron_ore",
    outputItemId: "iron_ore",
    outputRate: 60,
    inputs: [],
    machineId: "miner_mk1",
  },
  {
    id: "recipe_iron_ingot",
    outputItemId: "iron_ingot",
    outputRate: 30,
    inputs: [{ itemId: "iron_ore", rate: 30 }],
    machineId: "smelter",
  },
  {
    id: "recipe_iron_plate",
    outputItemId: "iron_plate",
    outputRate: 20,
    inputs: [{ itemId: "iron_ingot", rate: 30 }],
    machineId: "constructor",
  },
  {
    id: "recipe_iron_rod",
    outputItemId: "iron_rod",
    outputRate: 15,
    inputs: [{ itemId: "iron_ingot", rate: 15 }],
    machineId: "constructor",
  },
  {
    id: "recipe_screw",
    outputItemId: "screw",
    outputRate: 40,
    inputs: [{ itemId: "iron_rod", rate: 10 }],
    machineId: "constructor",
  },
  {
    id: "recipe_reinforced_iron_plate",
    outputItemId: "reinforced_iron_plate",
    outputRate: 5,
    inputs: [
      { itemId: "iron_plate", rate: 30 },
      { itemId: "screw", rate: 60 },
    ],
    machineId: "assembler",
  },
  {
    id: "recipe_limestone",
    outputItemId: "limestone",
    outputRate: 60,
    inputs: [],
    machineId: "miner_mk1",
  },
  {
    id: "recipe_concrete",
    outputItemId: "concrete",
    outputRate: 15,
    inputs: [{ itemId: "limestone", rate: 45 }],
    machineId: "constructor",
  },
  {
    id: "recipe_coal",
    outputItemId: "coal",
    outputRate: 60,
    inputs: [],
    machineId: "miner_mk1",
  },
  {
    id: "recipe_steel_ingot",
    outputItemId: "steel_ingot",
    outputRate: 45,
    inputs: [{ itemId: "iron_ore", rate: 45 }, { itemId: "coal", rate: 45 }],
    machineId: "foundry",
  },
  {
    id: "recipe_steel_beam",
    outputItemId: "steel_beam",
    outputRate: 15,
    inputs: [{ itemId: "steel_ingot", rate: 60 }],
    machineId: "constructor",
  },
  {
    id: "recipe_steel_pipe",
    outputItemId: "steel_pipe",
    outputRate: 20,
    inputs: [{ itemId: "steel_ingot", rate: 30 }],
    machineId: "constructor",
  },
  {
    id: "recipe_encased_industrial_beam",
    outputItemId: "encased_industrial_beam",
    outputRate: 6,
    inputs: [{ itemId: "steel_beam", rate: 18 }, { itemId: "concrete", rate: 36 }],
    machineId: "assembler",
  },
  {
    id: "recipe_rotor",
    outputItemId: "rotor",
    outputRate: 4,
    inputs: [{ itemId: "iron_rod", rate: 20 }, { itemId: "screw", rate: 100 }],
    machineId: "assembler",
  },
  {
    id: "recipe_stator",
    outputItemId: "stator",
    outputRate: 5,
    inputs: [{ itemId: "steel_pipe", rate: 15 }, { itemId: "wire", rate: 40 }],
    machineId: "assembler",
  },
  {
    id: "recipe_motor",
    outputItemId: "motor",
    outputRate: 5,
    inputs: [{ itemId: "rotor", rate: 10 }, { itemId: "stator", rate: 10 }],
    machineId: "assembler",
  },
  {
    id: "recipe_modular_frame",
    outputItemId: "modular_frame",
    outputRate: 2,
    inputs: [{ itemId: "reinforced_iron_plate", rate: 3 }, { itemId: "iron_rod", rate: 12 }],
    machineId: "assembler",
  },
  {
    id: "recipe_heavy_modular_frame",
    outputItemId: "heavy_modular_frame",
    outputRate: 2,
    inputs: [
      { itemId: "modular_frame", rate: 10 },
      { itemId: "steel_pipe", rate: 30 },
      { itemId: "encased_industrial_beam", rate: 10 },
      { itemId: "screw", rate: 200 }
    ],
    machineId: "manufacturer",
  }
];

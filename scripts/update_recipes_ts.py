import re

machines_data = [
    ("miner_mk1", "Miner Mk.1", 5),
    ("miner_mk2", "Miner Mk.2", 12),
    ("miner_mk3", "Miner Mk.3", 30),
    ("water_extractor", "Water Extractor", 20),
    ("oil_extractor", "Oil Extractor", 40),
    ("resource_well_pressurizer", "Resource Well Pressurizer", 150),
    ("smelter", "Smelter", 4),
    ("foundry", "Foundry", 16),
    ("constructor", "Constructor", 4),
    ("assembler", "Assembler", 15),
    ("manufacturer", "Manufacturer", 55),
    ("refinery", "Refinery", 30),
    ("blender", "Blender", 75),
    ("packager", "Packager", 10),
    ("particle_accelerator", "Particle Accelerator", 250),
    ("quantum_encoder", "Quantum Encoder", 1000),
    ("converter", "Converter", 250),
]

recipes_data = [
    # Extraction
    ("recipe_copper_ore", "copper_ore", 60, [], "miner_mk1"),
    ("recipe_iron_ore", "iron_ore", 60, [], "miner_mk1"),
    ("recipe_limestone", "limestone", 60, [], "miner_mk1"),
    ("recipe_coal", "coal", 60, [], "miner_mk1"),
    ("recipe_caterium_ore", "caterium_ore", 60, [], "miner_mk1"),
    ("recipe_raw_quartz", "raw_quartz", 60, [], "miner_mk1"),
    ("recipe_sulfur", "sulfur", 60, [], "miner_mk1"),
    ("recipe_bauxite", "bauxite", 60, [], "miner_mk1"),
    ("recipe_sam", "sam", 60, [], "miner_mk1"),
    ("recipe_uranium", "uranium", 60, [], "miner_mk1"),
    ("recipe_water", "water", 120, [], "water_extractor"),
    ("recipe_crude_oil", "crude_oil", 120, [], "oil_extractor"),
    ("recipe_nitrogen_gas", "nitrogen_gas", 120, [], "resource_well_pressurizer"),

    # Basic Processing
    ("recipe_copper_ingot", "copper_ingot", 30, [("copper_ore", 30)], "smelter"),
    ("recipe_iron_ingot", "iron_ingot", 30, [("iron_ore", 30)], "smelter"),
    ("recipe_caterium_ingot", "caterium_ingot", 15, [("caterium_ore", 45)], "smelter"),
    ("recipe_steel_ingot", "steel_ingot", 45, [("iron_ore", 45), ("coal", 45)], "foundry"),
    ("recipe_aluminum_ingot", "aluminum_ingot", 60, [("aluminum_scrap", 90), ("silica", 75)], "foundry"),
    ("recipe_ficsite_ingot", "ficsite_ingot", 30, [("iron_ore", 30), ("sam", 30)], "smelter"),

    ("recipe_iron_plate", "iron_plate", 20, [("iron_ingot", 30)], "constructor"),
    ("recipe_iron_rod", "iron_rod", 15, [("iron_ingot", 15)], "constructor"),
    ("recipe_screw", "screw", 40, [("iron_rod", 10)], "constructor"),
    ("recipe_wire", "wire", 30, [("copper_ingot", 15)], "constructor"),
    ("recipe_cable", "cable", 30, [("wire", 60)], "constructor"),
    ("recipe_copper_sheet", "copper_sheet", 10, [("copper_ingot", 20)], "constructor"),
    ("recipe_concrete", "concrete", 15, [("limestone", 45)], "constructor"),
    ("recipe_reinforced_iron_plate", "reinforced_iron_plate", 5, [("iron_plate", 30), ("screw", 60)], "assembler"),
    ("recipe_rotor", "rotor", 4, [("iron_rod", 20), ("screw", 100)], "assembler"),

    ("recipe_biomass_leaves", "biomass", 60, [("leaves", 120)], "constructor"),
    ("recipe_biomass_wood", "biomass", 300, [("wood", 37.5)], "constructor"),
    ("recipe_solid_biofuel", "solid_biofuel", 60, [("biomass", 120)], "constructor"),

    ("recipe_steel_beam", "steel_beam", 15, [("steel_ingot", 60)], "constructor"),
    ("recipe_steel_pipe", "steel_pipe", 20, [("steel_ingot", 30)], "constructor"),
    ("recipe_encased_industrial_beam", "encased_industrial_beam", 6, [("steel_beam", 18), ("concrete", 36)], "assembler"),
    ("recipe_stator", "stator", 5, [("steel_pipe", 15), ("wire", 40)], "assembler"),
    ("recipe_motor", "motor", 5, [("rotor", 10), ("stator", 10)], "assembler"),
    ("recipe_modular_frame", "modular_frame", 2, [("reinforced_iron_plate", 3), ("iron_rod", 12)], "assembler"),
    ("recipe_heavy_modular_frame", "heavy_modular_frame", 2, [("modular_frame", 10), ("steel_pipe", 30), ("encased_industrial_beam", 10), ("screw", 200)], "manufacturer"),

    ("recipe_quickwire", "quickwire", 60, [("caterium_ingot", 12)], "constructor"),
    ("recipe_silica", "silica", 37.5, [("raw_quartz", 22.5)], "constructor"),
    ("recipe_quartz_crystal", "quartz_crystal", 22.5, [("raw_quartz", 37.5)], "constructor"),

    # Oil & Chemistry
    ("recipe_plastic", "plastic", 20, [("crude_oil", 30)], "refinery"),
    ("recipe_rubber", "rubber", 20, [("crude_oil", 30)], "refinery"),
    ("recipe_heavy_oil_residue", "heavy_oil_residue", 40, [("crude_oil", 30)], "refinery"),
    ("recipe_petroleum_coke", "petroleum_coke", 120, [("heavy_oil_residue", 40)], "refinery"),
    ("recipe_fuel", "fuel", 40, [("crude_oil", 60)], "refinery"),
    ("recipe_circuit_board", "circuit_board", 7.5, [("copper_sheet", 15), ("plastic", 30)], "assembler"),
    ("recipe_computer", "computer", 2.5, [("circuit_board", 25), ("cable", 22.5), ("plastic", 45)], "manufacturer"),
    ("recipe_ai_limiter", "ai_limiter", 5, [("copper_sheet", 25), ("quickwire", 100)], "assembler"),
    ("recipe_high_speed_connector", "high_speed_connector", 3.75, [("quickwire", 210), ("cable", 37.5), ("circuit_board", 3.75)], "manufacturer"),

    # Bauxite & Aluminum
    ("recipe_alumina_solution", "alumina_solution", 120, [("bauxite", 120), ("water", 180)], "refinery"),
    ("recipe_aluminum_scrap", "aluminum_scrap", 360, [("alumina_solution", 240), ("coal", 120)], "refinery"),
    ("recipe_aluminum_casing", "aluminum_casing", 60, [("aluminum_ingot", 90)], "constructor"),
    ("recipe_alclad_aluminum_sheet", "alclad_aluminum_sheet", 30, [("aluminum_ingot", 30), ("copper_ingot", 10)], "assembler"),
    ("recipe_battery", "battery", 20, [("sulfuric_acid", 50), ("alumina_solution", 40), ("aluminum_casing", 20)], "blender"),
    ("recipe_radio_control_unit", "radio_control_unit", 2.5, [("aluminum_casing", 80), ("crystal_oscillator", 1.25), ("computer", 1.25)], "manufacturer"),

    # Fluids & Blending
    ("recipe_sulfuric_acid", "sulfuric_acid", 50, [("sulfur", 50), ("water", 50)], "refinery"),
    ("recipe_nitric_acid", "nitric_acid", 30, [("nitrogen_gas", 120), ("water", 30), ("iron_plate", 10)], "blender"),

    # Tier 8 Advanced Parts
    ("recipe_copper_powder", "copper_powder", 50, [("copper_ingot", 300)], "constructor"),
    ("recipe_crystal_oscillator", "crystal_oscillator", 1, [("quartz_crystal", 18), ("cable", 14), ("reinforced_iron_plate", 2.5)], "manufacturer"),
    ("recipe_cooling_system", "cooling_system", 6, [("heat_sink", 12), ("rubber", 12), ("water", 30), ("nitrogen_gas", 150)], "blender"),
    ("recipe_heat_sink", "heat_sink", 7.5, [("alclad_aluminum_sheet", 37.5), ("copper_sheet", 22.5)], "assembler"),
    ("recipe_fused_modular_frame", "fused_modular_frame", 1.5, [("heavy_modular_frame", 1.5), ("aluminum_casing", 75), ("nitrogen_gas", 37.5)], "blender"),
    ("recipe_turbo_motor", "turbo_motor", 1.875, [("cooling_system", 7.5), ("radio_control_unit", 3.75), ("motor", 7.5), ("rubber", 45)], "manufacturer"),
    ("recipe_supercomputer", "supercomputer", 1.875, [("computer", 3.75), ("ai_limiter", 3.75), ("high_speed_connector", 5.625), ("plastic", 52.5)], "manufacturer"),
    ("recipe_electromagnetic_control_rod", "electromagnetic_control_rod", 4, [("stator", 6), ("ai_limiter", 4)], "assembler"),

    # Space Elevator Parts
    ("recipe_smart_plating", "smart_plating", 2, [("reinforced_iron_plate", 2), ("rotor", 2)], "assembler"),
    ("recipe_versatile_framework", "versatile_framework", 5, [("modular_frame", 2.5), ("steel_beam", 30)], "assembler"),
    ("recipe_automated_wiring", "automated_wiring", 2.5, [("stator", 2.5), ("cable", 50)], "assembler"),
    ("recipe_modular_engine", "modular_engine", 1, [("motor", 2), ("rubber", 15), ("smart_plating", 2)], "manufacturer"),
    ("recipe_adaptive_control_unit", "adaptive_control_unit", 1, [("automated_wiring", 7.5), ("circuit_board", 5), ("heavy_modular_frame", 1), ("computer", 1)], "manufacturer"),
    ("recipe_assembly_director_system", "assembly_director_system", 0.75, [("adaptive_control_unit", 1.5), ("supercomputer", 0.75)], "assembler"),
    ("recipe_magnetic_field_generator", "magnetic_field_generator", 1, [("versatile_framework", 2.5), ("electromagnetic_control_rod", 1)], "assembler"),
    ("recipe_thermal_propulsion_rocket", "thermal_propulsion_rocket", 0.5, [("modular_engine", 2.5), ("turbo_motor", 0.5), ("cooling_system", 1.5), ("fused_modular_frame", 0.5)], "manufacturer"),
    ("recipe_nuclear_pasta", "nuclear_pasta", 0.5, [("copper_powder", 100), ("pressure_conversion_cube", 0.5)], "particle_accelerator"),

    # Update 9 / 1.0 Items (Quantum / Alien)
    ("recipe_alien_protein", "alien_protein", 20, [("alien_dna_capsule", 10)], "constructor"),
    ("recipe_alien_dna_capsule", "alien_dna_capsule", 10, [("alien_protein", 10)], "constructor"),
    ("recipe_reanimated_sam", "reanimated_sam", 30, [("sam", 120)], "constructor"),
    ("recipe_sam_fluctuator", "sam_fluctuator", 10, [("reanimated_sam", 30), ("wire", 50)], "assembler"),
    ("recipe_superposition_oscillator", "superposition_oscillator", 1, [("crystal_oscillator", 1), ("sam_fluctuator", 1)], "assembler"),
    ("recipe_diamonds", "diamonds", 10, [("coal", 100)], "particle_accelerator"),
    ("recipe_time_crystal", "time_crystal", 5, [("diamonds", 10), ("reanimated_sam", 10)], "quantum_encoder"),
    ("recipe_dark_matter_crystal", "dark_matter_crystal", 5, [("diamonds", 5), ("dark_matter_residue", 50)], "quantum_encoder"),
    ("recipe_singularity_cell", "singularity_cell", 1, [("nuclear_pasta", 1), ("dark_matter_crystal", 10)], "quantum_encoder"),
    ("recipe_neural_quantum_processor", "neural_quantum_processor", 1, [("supercomputer", 1), ("superposition_oscillator", 1)], "quantum_encoder"),
    ("recipe_alien_power_matrix", "alien_power_matrix", 1, [("singularity_cell", 1), ("sam_fluctuator", 10)], "quantum_encoder"),
    ("recipe_ficsite_trigon", "ficsite_trigon", 10, [("ficsite_ingot", 10)], "constructor"),
    ("recipe_biochemical_sculptor", "biochemical_sculptor", 1, [("alien_power_matrix", 1), ("ficsite_trigon", 10)], "quantum_encoder"),
    ("recipe_ballistic_warp_drive", "ballistic_warp_drive", 1, [("thermal_propulsion_rocket", 1), ("singularity_cell", 1)], "quantum_encoder"),
    ("recipe_ai_expansion_server", "ai_expansion_server", 1, [("neural_quantum_processor", 1), ("assembly_director_system", 1)], "quantum_encoder"),
    ("recipe_excited_photonic_matter", "excited_photonic_matter", 50, [("sam", 50)], "converter"),
    ("recipe_dark_matter_residue", "dark_matter_residue", 50, [("excited_photonic_matter", 50)], "converter"),

    # Nuclear & Others
    ("recipe_encased_uranium_cell", "encased_uranium_cell", 20, [("uranium", 40), ("concrete", 15), ("sulfuric_acid", 40)], "blender"),
    ("recipe_uranium_fuel_rod", "uranium_fuel_rod", 0.4, [("encased_uranium_cell", 20), ("encased_industrial_beam", 1.2), ("electromagnetic_control_rod", 2)], "manufacturer"),
    ("recipe_non_fissile_uranium", "non_fissile_uranium", 50, [("uranium_waste", 37.5), ("silica", 25), ("nitric_acid", 15), ("sulfuric_acid", 15)], "blender"),
    ("recipe_plutonium_pellet", "plutonium_pellet", 30, [("non_fissile_uranium", 100), ("uranium_waste", 25)], "particle_accelerator"),
    ("recipe_encased_plutonium_cell", "encased_plutonium_cell", 10, [("plutonium_pellet", 20), ("concrete", 40)], "assembler"),
    ("recipe_plutonium_fuel_rod", "plutonium_fuel_rod", 0.25, [("encased_plutonium_cell", 7.5), ("steel_beam", 4.5), ("electromagnetic_control_rod", 1.5), ("heat_sink", 2.5)], "manufacturer"),
    ("recipe_ficsonium", "ficsonium", 10, [("plutonium_waste", 10), ("dark_matter_residue", 10)], "particle_accelerator"),
    ("recipe_ficsonium_fuel_rod", "ficsonium_fuel_rod", 1, [("ficsonium", 10), ("electromagnetic_control_rod", 1)], "manufacturer"),

    # Extra Items
    ("recipe_empty_canister", "empty_canister", 60, [("plastic", 30)], "constructor"),
    ("recipe_packaged_water", "packaged_water", 60, [("water", 60), ("empty_canister", 60)], "packager"),
    ("recipe_turbofuel", "turbofuel", 18.75, [("fuel", 22.5), ("compacted_coal", 15)], "refinery"),
    ("recipe_compacted_coal", "compacted_coal", 25, [("coal", 25), ("sulfur", 25)], "assembler"),
    ("recipe_rocket_fuel", "rocket_fuel", 50, [("turbofuel", 50), ("nitric_acid", 10)], "blender"),
    ("recipe_ionized_fuel", "ionized_fuel", 40, [("rocket_fuel", 40), ("power_shard", 1)], "blender"),
    ("recipe_black_powder", "black_powder", 30, [("coal", 15), ("sulfur", 15)], "assembler"),
    ("recipe_smokeless_powder", "smokeless_powder", 20, [("black_powder", 20), ("heavy_oil_residue", 10)], "refinery"),
    ("recipe_nobelisk", "nobelisk", 3, [("black_powder", 15), ("steel_pipe", 15)], "assembler"),
    ("recipe_iron_rebar", "iron_rebar", 15, [("iron_rod", 15)], "constructor"),
    ("recipe_rifle_ammo", "rifle_ammo", 75, [("copper_sheet", 15), ("smokeless_powder", 10)], "assembler"),
    ("recipe_pressure_conversion_cube", "pressure_conversion_cube", 1, [("fused_modular_frame", 1), ("radio_control_unit", 2)], "assembler"),
]

# Generate machines code
machines_code = "export const machines: Record<MachineId, Machine> = {\n"
for m_id, name, pwr in machines_data:
    url_name = name.replace(" ", "_").replace(".", "")
    url = f"https://satisfactory.wiki.gg/wiki/Special:FilePath/{url_name}.png"
    machines_code += f'  {m_id}: {{ id: "{m_id}", name: "{name}", powerUsage: {pwr}, imageUrl: "{url}" }},\n'
machines_code += "};"

# Generate recipes code
recipes_code = "export const recipes: Recipe[] = [\n"
for r_id, out_item, out_rate, inputs, machine in recipes_data:
    recipes_code += f'  {{\n    id: "{r_id}",\n    outputItemId: "{out_item}",\n    outputRate: {out_rate},\n    inputs: ['
    if inputs:
        in_strs = []
        for i_item, i_rate in inputs:
            in_strs.append(f'{{ itemId: "{i_item}", rate: {i_rate} }}')
        recipes_code += ", ".join(in_strs)
    recipes_code += f'],\n    machineId: "{machine}",\n  }},\n'
recipes_code += "];"

with open('src/engine/data.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace machines block
pattern_machines = re.compile(r'export const machines: Record<MachineId, Machine> = \{.*?\};', re.DOTALL)
content = pattern_machines.sub(machines_code, content)

# Replace recipes block
pattern_recipes = re.compile(r'export const recipes: Recipe\[\] = \[.*?\];', re.DOTALL)
content = pattern_recipes.sub(recipes_code, content)

with open('src/engine/data.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("data.ts updated successfully with all recipes and machines!")

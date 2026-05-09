import re

raw_list = """Limestone
Limestone
Iron Ore
Iron Ore
Copper Ore
Copper Ore
Caterium Ore
Caterium Ore
Coal
Coal
Raw Quartz
Raw Quartz
Sulfur
Sulfur
Bauxite
Bauxite
SAM
SAM
Uranium
Uranium
    Items
    Ingots
Iron Ingot
Iron Ingot
Copper Ingot
Copper Ingot
Caterium Ingot
Caterium Ingot
Steel Ingot
Steel Ingot
Aluminum Ingot
Aluminum Ingot
Ficsite Ingot
Ficsite Ingot
    Items
    Minerals
Concrete
Concrete
Quartz Crystal
Quartz Crystal
Silica
Silica
Copper Powder
Copper Powder
Polymer Resin
Polymer Resin
Petroleum Coke
Petroleum Coke
Aluminum Scrap
Aluminum Scrap
    Items
    Aliens
Alien Protein
Alien Protein
Alien DNA Capsule
Alien DNA Capsule
    Items
    Liquids
Water
Water
Crude Oil
Crude Oil
Heavy Oil Residue
Heavy Oil Residue
Fuel
Fuel
Liquid Biofuel
Liquid Biofuel
Turbofuel
Turbofuel
Alumina Solution
Alumina Solution
Sulfuric Acid
Sulfuric Acid
Nitric Acid
Nitric Acid
Dissolved Silica
Dissolved Silica
    Items
    Gas
Nitrogen Gas
Nitrogen Gas
Rocket Fuel
Rocket Fuel
Ionized Fuel
Ionized Fuel
Dark Matter Residue
Dark Matter Residue
Excited Photonic Matter
Excited Photonic Matter
    Items
    Standard Parts
Iron Rod
Iron Rod
Screws
Screws
Iron Plate
Iron Plate
Reinforced Iron Plate
Reinforced Iron Plate
Copper Sheet
Copper Sheet
Alclad Aluminum Sheet
Alclad Aluminum Sheet
Aluminum Casing
Aluminum Casing
Steel Pipe
Steel Pipe
Steel Beam
Steel Beam
Encased Industrial Beam
Encased Industrial Beam
Modular Frame
Modular Frame
Heavy Modular Frame
Heavy Modular Frame
Fused Modular Frame
Fused Modular Frame
Ficsite Trigon
Ficsite Trigon
Fabric
Fabric
Plastic
Plastic
Rubber
Rubber
    Items
    Industrial Parts
Rotor
Rotor
Stator
Stator
Battery
Battery
Motor
Motor
Heat Sink
Heat Sink
Cooling System
Cooling System
Turbo Motor
Turbo Motor
    Items
    Electronics
Wire
Wire
Cable
Cable
Quickwire
Quickwire
Circuit Board
Circuit Board
AI Limiter
AI Limiter
High-Speed Connector
High-Speed Connector
Reanimated SAM
Reanimated SAM
SAM Fluctuator
SAM Fluctuator
    Items
    Communications
Computer
Computer
Supercomputer
Supercomputer
Radio Control Unit
Radio Control Unit
Crystal Oscillator
Crystal Oscillator
Superposition Oscillator
Superposition Oscillator
    Items
    Quantum Technology
Diamonds
Diamonds
Time Crystal
Time Crystal
Dark Matter Crystal
Dark Matter Crystal
Singularity Cell
Singularity Cell
Neural-Quantum Processor
Neural-Quantum Processor
Alien Power Matrix
Alien Power Matrix
    Items
    Containers
Empty Canister
Empty Canister
Empty Fluid Tank
Empty Fluid Tank
Pressure Conversion Cube
Pressure Conversion Cube
Packaged Water
Packaged Water
Packaged Alumina Solution
Packaged Alumina Solution
Packaged Sulfuric Acid
Packaged Sulfuric Acid
Packaged Nitric Acid
Packaged Nitric Acid
Packaged Nitrogen Gas
Packaged Nitrogen Gas
    Items
    Fuels
Leaves
Leaves
Mycelia
Mycelia
Flower Petals
Flower Petals
Wood
Wood
Biomass
Biomass
Compacted Coal
Compacted Coal
Packaged Oil
Packaged Oil
Packaged Heavy Oil Residue
Packaged Heavy Oil Residue
Solid Biofuel
Solid Biofuel
Packaged Fuel
Packaged Fuel
Packaged Liquid Biofuel
Packaged Liquid Biofuel
Packaged Turbofuel
Packaged Turbofuel
Packaged Rocket Fuel
Packaged Rocket Fuel
Packaged Ionized Fuel
Packaged Ionized Fuel
Uranium Fuel Rod
Uranium Fuel Rod
Plutonium Fuel Rod
Plutonium Fuel Rod
    Items
    Consumed
Black Powder
Black Powder
Smokeless Powder
Smokeless Powder
Gas Filter
Gas Filter
Color Cartridge
Color Cartridge
Beacon
Beacon
Iodine-Infused Filter
Iodine-Infused Filter
    Items
    Ammos
Iron Rebar
Iron Rebar
Stun Rebar
Stun Rebar
Shatter Rebar
Shatter Rebar
Explosive Rebar
Explosive Rebar
Rifle Ammo
Rifle Ammo
Homing Rifle Ammo
Homing Rifle Ammo
Turbo Rifle Ammo
Turbo Rifle Ammo
Nobelisk
Nobelisk
Gas Nobelisk
Gas Nobelisk
Pulse Nobelisk
Pulse Nobelisk
Cluster Nobelisk
Cluster Nobelisk
Nuke Nobelisk
Nuke Nobelisk
    Items
    Nuclear
Electromagnetic Control Rod
Electromagnetic Control Rod
Encased Uranium Cell
Encased Uranium Cell
Non-Fissile Uranium
Non-Fissile Uranium
Plutonium Pellet
Plutonium Pellet
Encased Plutonium Cell
Encased Plutonium Cell
Ficsonium
Ficsonium
Ficsonium Fuel Rod
Ficsonium Fuel Rod
    Items
    Waste
Uranium Waste
Uranium Waste
Plutonium Waste
Plutonium Waste
    Items
    Special
Blue Power Slug
Blue Power Slug
Yellow Power Slug
Yellow Power Slug
Purple Power Slug
Purple Power Slug
Power Shard
Power Shard
FICSIT Coupon
FICSIT Coupon
Smart Plating
Smart Plating
Versatile Framework
Versatile Framework
Automated Wiring
Automated Wiring
Modular Engine
Modular Engine
Adaptive Control Unit
Adaptive Control Unit
Assembly Director System
Assembly Director System
Magnetic Field Generator
Magnetic Field Generator
Thermal Propulsion Rocket
Thermal Propulsion Rocket
Nuclear Pasta
Nuclear Pasta
Biochemical Sculptor
Biochemical Sculptor
Ballistic Warp Drive
Ballistic Warp Drive
AI Expansion Server
AI Expansion Server"""

ignore_words = {"Items", "Ingots", "Minerals", "Aliens", "Liquids", "Gas", "Standard Parts", "Industrial Parts", "Electronics", "Communications", "Quantum Technology", "Containers", "Fuels", "Consumed", "Ammos", "Nuclear", "Waste", "Special"}

items_list = []
for line in raw_list.split('\n'):
    line = line.strip()
    if not line:
        continue
    if line in ignore_words:
        continue
    if line not in items_list:
        items_list.append(line)

mapped_items = []
for item in items_list:
    if item == "Screws":
        name = "Screw"
    else:
        name = item
        
    item_id = name.lower().replace(" ", "_").replace("-", "_")
    url_name = name.replace(" ", "_")
    url = f"https://satisfactory.wiki.gg/wiki/Special:FilePath/{url_name}.png"
    
    mapped_items.append((item_id, name, url))

with open('src/engine/data.ts', 'r', encoding='utf-8') as f:
    content = f.read()

items_code = "export const items: Record<ItemId, Item> = {\n"
for item_id, name, url in mapped_items:
    items_code += f'  {item_id}: {{ id: "{item_id}", name: "{name}", imageUrl: "{url}" }},\n'
items_code += "};"

pattern = re.compile(r'export const items: Record<ItemId, Item> = \{.*?\};', re.DOTALL)
new_content = pattern.sub(items_code, content)

with open('src/engine/data.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("data.ts updated successfully with all items!")

"""Audit alternate recipes in data/recipes.json against the authoritative
game export in data/alternate_recipes.json.

Reports: missing alternates, unmapped item classNames, and per-recipe
value mismatches (output rate, input rates, machine).
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

auth = json.load(open(os.path.join(ROOT, 'data/alternate_recipes.json'), encoding='utf-8'))
used = json.load(open(os.path.join(ROOT, 'data/recipes.json'), encoding='utf-8'))
items = json.load(open(os.path.join(ROOT, 'data/items.json'), encoding='utf-8'))

# className -> itemId (verified against items.json keys below)
ITEM_MAP = {
    'Desc_AluminaSolution_C': 'alumina_solution',
    'Desc_AluminumCasing_C': 'aluminum_casing',
    'Desc_AluminumIngot_C': 'aluminum_ingot',
    'Desc_AluminumPlateReinforced_C': 'heat_sink',
    'Desc_AluminumPlate_C': 'alclad_aluminum_sheet',
    'Desc_AluminumScrap_C': 'aluminum_scrap',
    'Desc_Battery_C': 'battery',
    'Desc_Cable_C': 'cable',
    'Desc_Cement_C': 'concrete',
    'Desc_CircuitBoardHighSpeed_C': 'ai_limiter',
    'Desc_CircuitBoard_C': 'circuit_board',
    'Desc_Coal_C': 'coal',
    'Desc_CompactedCoal_C': 'compacted_coal',
    'Desc_ComputerSuper_C': 'supercomputer',
    'Desc_Computer_C': 'computer',
    'Desc_CoolingSystem_C': 'cooling_system',
    'Desc_CopperIngot_C': 'copper_ingot',
    'Desc_CopperSheet_C': 'copper_sheet',
    'Desc_CrystalOscillator_C': 'crystal_oscillator',
    'Desc_DarkEnergy_C': 'dark_matter_residue',
    'Desc_DarkMatter_C': 'dark_matter_crystal',
    'Desc_Diamond_C': 'diamonds',
    'Desc_DissolvedSilica_C': 'dissolved_silica',
    'Desc_ElectromagneticControlRod_C': 'electromagnetic_control_rod',
    'Desc_FluidCanister_C': 'empty_canister',
    'Desc_Fuel_C': 'packaged_fuel',
    'Desc_GoldIngot_C': 'caterium_ingot',
    'Desc_Gunpowder_C': 'black_powder',
    'Desc_HeavyOilResidue_C': 'heavy_oil_residue',
    'Desc_HighSpeedConnector_C': 'high_speed_connector',
    'Desc_HighSpeedWire_C': 'quickwire',
    'Desc_IonizedFuel_C': 'ionized_fuel',
    'Desc_IronIngot_C': 'iron_ingot',
    'Desc_IronPlateReinforced_C': 'reinforced_iron_plate',
    'Desc_IronPlate_C': 'iron_plate',
    'Desc_IronRod_C': 'iron_rod',
    'Desc_IronScrew_C': 'screw',
    'Desc_LiquidFuel_C': 'fuel',
    'Desc_LiquidOil_C': 'crude_oil',
    'Desc_LiquidTurboFuel_C': 'turbofuel',
    'Desc_ModularFrameFused_C': 'fused_modular_frame',
    'Desc_ModularFrameHeavy_C': 'heavy_modular_frame',
    'Desc_ModularFrameLightweight_C': 'radio_control_unit',  # internal name quirk: RCU
    'Desc_ModularFrame_C': 'modular_frame',
    'Desc_MotorLightweight_C': 'turbo_motor',
    'Desc_Motor_C': 'motor',
    'Desc_NitricAcid_C': 'nitric_acid',
    'Desc_NitrogenGas_C': 'nitrogen_gas',
    'Desc_NonFissibleUranium_C': 'non_fissile_uranium',
    'Desc_NuclearFuelRod_C': 'uranium_fuel_rod',
    'Desc_NuclearWaste_C': 'uranium_waste',
    'Desc_OreBauxite_C': 'bauxite',
    'Desc_OreCopper_C': 'copper_ore',
    'Desc_OreGold_C': 'caterium_ore',
    'Desc_OreIron_C': 'iron_ore',
    'Desc_OreUranium_C': 'uranium',
    'Desc_PackagedNitrogenGas_C': 'packaged_nitrogen_gas',
    'Desc_PackagedRocketFuel_C': 'packaged_rocket_fuel',
    'Desc_PackagedWater_C': 'packaged_water',
    'Desc_PetroleumCoke_C': 'petroleum_coke',
    'Desc_Plastic_C': 'plastic',
    'Desc_PlutoniumCell_C': 'encased_plutonium_cell',
    'Desc_PlutoniumFuelRod_C': 'plutonium_fuel_rod',
    'Desc_PolymerResin_C': 'polymer_resin',
    'Desc_PressureConversionCube_C': 'pressure_conversion_cube',
    'Desc_QuartzCrystal_C': 'quartz_crystal',
    'Desc_RawQuartz_C': 'raw_quartz',
    'Desc_RocketFuel_C': 'rocket_fuel',
    'Desc_Rotor_C': 'rotor',
    'Desc_Rubber_C': 'rubber',
    'Desc_Silica_C': 'silica',
    'Desc_SpaceElevatorPart_1_C': 'smart_plating',
    'Desc_SpaceElevatorPart_2_C': 'versatile_framework',
    'Desc_SpaceElevatorPart_3_C': 'automated_wiring',
    'Desc_Stator_C': 'stator',
    'Desc_SteelIngot_C': 'steel_ingot',
    'Desc_SteelPipe_C': 'steel_pipe',
    'Desc_SteelPlateReinforced_C': 'encased_industrial_beam',
    'Desc_SteelPlate_C': 'steel_beam',
    'Desc_Stone_C': 'limestone',
    'Desc_Sulfur_C': 'sulfur',
    'Desc_SulfuricAcid_C': 'sulfuric_acid',
    'Desc_TimeCrystal_C': 'time_crystal',
    'Desc_TurboFuel_C': 'packaged_turbofuel',
    'Desc_UraniumCell_C': 'encased_uranium_cell',
    'Desc_Water_C': 'water',
    'Desc_Wire_C': 'wire',
    # BP_ItemDescriptorPortableMiner_C intentionally absent (no factory item)
}

MACHINE_MAP = {
    'Desc_ConstructorMk1_C': 'constructor',
    'Desc_AssemblerMk1_C': 'assembler',
    'Desc_ManufacturerMk1_C': 'manufacturer',
    'Desc_SmelterMk1_C': 'smelter',
    'Desc_FoundryMk1_C': 'foundry',
    'Desc_OilRefinery_C': 'refinery',
    'Desc_Blender_C': 'blender',
    'Desc_Packager_C': 'packager',
    'Desc_HadronCollider_C': 'particle_accelerator',
    'Desc_Converter_C': 'converter',
    'Desc_QuantumEncoder_C': 'quantum_encoder',
}


def perminute(amount, dur):
    return round(amount * 60.0 / dur, 4)


def main():
    # 1. validate mapping completeness
    print("=" * 70)
    print("STEP 1: className coverage")
    print("=" * 70)
    bad = []
    for c, iid in ITEM_MAP.items():
        if iid not in items:
            bad.append((c, iid))
    if bad:
        print("MAPPED TO NON-EXISTENT ITEM ID:")
        for c, iid in bad:
            print(f"  {c} -> {iid}  (NOT in items.json)")
    else:
        print("All mapped classNames resolve to a valid item id. OK")

    used_classnames = set()
    for r in auth:
        for x in r['ingredients'] + r['products']:
            used_classnames.add(x['item'])
    unmapped = sorted(c for c in used_classnames if c not in ITEM_MAP)
    print("\nUnmapped classNames (no factory item):")
    for c in unmapped:
        print("  ", c)

    # 2. index used recipes by name
    used_by_name = {}
    for r in used:
        if r.get('isAlternate'):
            nm = (r.get('name') or '').strip().lower().replace('alt:', '').strip()
            used_by_name[nm] = r

    # 3. compare
    print("\n" + "=" * 70)
    print("STEP 2: per-recipe comparison")
    print("=" * 70)
    missing = []
    mismatches = []
    skipped = []
    for r in auth:
        name = r['name'].strip()
        key = name.lower()
        dur = r['duration']
        # build expected
        prods = r['products']
        main = prods[0]
        if main['item'] not in ITEM_MAP:
            skipped.append((name, main['item']))
            continue
        exp_out_item = ITEM_MAP[main['item']]
        exp_out_rate = perminute(main['amount'], dur)
        exp_inputs = {}
        ok_inputs = True
        for i in r['ingredients']:
            if i['item'] not in ITEM_MAP:
                ok_inputs = False
                break
            exp_inputs[ITEM_MAP[i['item']]] = perminute(i['amount'], dur)
        exp_machine = MACHINE_MAP.get(r['producedIn'][0]) if r.get('producedIn') else None

        u = used_by_name.get(key)
        if not u:
            missing.append((name, exp_out_item, exp_out_rate, exp_inputs, exp_machine,
                            [ (ITEM_MAP.get(p['item'], '??'), perminute(p['amount'], dur)) for p in prods[1:] ]))
            continue

        issues = []
        if u['outputItemId'] != exp_out_item:
            issues.append(f"outputItem {u['outputItemId']} != {exp_out_item}")
        if abs(u['outputRate'] - exp_out_rate) > 0.05:
            issues.append(f"outputRate {u['outputRate']} != {exp_out_rate}")
        if exp_machine and u.get('machineId') != exp_machine:
            issues.append(f"machine {u.get('machineId')} != {exp_machine}")
        if ok_inputs:
            got = { x['itemId']: x['rate'] for x in u.get('inputs', []) }
            for iid, rate in exp_inputs.items():
                if iid not in got:
                    issues.append(f"missing input {iid}@{rate}")
                elif abs(got[iid] - rate) > 0.05:
                    issues.append(f"input {iid} rate {got[iid]} != {rate}")
            for iid in got:
                if iid not in exp_inputs:
                    issues.append(f"extra input {iid}@{got[iid]}")
        if issues:
            mismatches.append((name, issues))

    print(f"\n--- {len(missing)} MISSING alternates (in game, absent from recipes.json) ---")
    for name, oi, orate, ins, mach, extra in missing:
        print(f"\n  * {name}")
        print(f"      output: {oi} @ {orate}/min   machine: {mach}")
        print(f"      inputs: {ins}")
        if extra:
            print(f"      byproducts: {extra}")

    print(f"\n--- {len(mismatches)} VALUE MISMATCHES among matched alternates ---")
    for name, issues in mismatches:
        print(f"  * {name}: " + "; ".join(issues))

    print(f"\n--- {len(skipped)} skipped (product has no factory item) ---")
    for name, c in skipped:
        print(f"  * {name}  (product {c})")


if __name__ == '__main__':
    main()

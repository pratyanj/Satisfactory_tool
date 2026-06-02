"""Correct data/recipes.json against the authoritative SatisfactoryTools dataset.

- For recipes that match an authoritative recipe by signature, fix output rate,
  input rates, byproducts, and machine to the game values.
- For late-game (SAM / quantum / ficsonium) recipes whose inputs differ too much
  to auto-match, apply the authoritative recipe explicitly (values verified via
  scripts/audit_recipes.py diagnostics).

Intentionally NOT touched:
- alien_protein: game recipes use creature remains (Hog/Spitter/... Parts) which
  are not modelled as factory items, so we keep the simplified capsule recipe.
- dissolved_silica: no authoritative primary-output recipe in the dataset.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Authoritative game data cached by scripts/audit_recipes.py
auth = json.load(open(os.path.join(ROOT, 'scripts', 'satisfactory_docs.json'), encoding='utf-8'))
items = json.load(open(os.path.join(ROOT, 'data/items.json'), encoding='utf-8'))
path = os.path.join(ROOT, 'data/recipes.json')
recipes = json.load(open(path, encoding='utf-8'))
ai, ar = auth['items'], auth['recipes']


def norm(n):
    return n.strip().lower().replace('-', ' ').replace('_', ' ')


name_to_id = {norm(d['name']): i for i, d in items.items()}
C2I = {cn: name_to_id[norm(d.get('name', ''))]
       for cn, d in ai.items() if norm(d.get('name', '')) in name_to_id}
C2I.update({'Desc_IronScrew_C': 'screw', 'Desc_ColorCartridge_C': 'color_cartridge',
            'Desc_FlowerPetals_C': 'flower_petals'})
MACHINE_MAP = {
    'Desc_ConstructorMk1_C': 'constructor', 'Desc_AssemblerMk1_C': 'assembler',
    'Desc_ManufacturerMk1_C': 'manufacturer', 'Desc_SmelterMk1_C': 'smelter',
    'Desc_FoundryMk1_C': 'foundry', 'Desc_OilRefinery_C': 'refinery',
    'Desc_Blender_C': 'blender', 'Desc_Packager_C': 'packager',
    'Desc_HadronCollider_C': 'particle_accelerator', 'Desc_Converter_C': 'converter',
    'Desc_QuantumEncoder_C': 'quantum_encoder',
}


def tid(cn):
    return C2I.get(cn)


def pm(a, t):
    return round(a * 60.0 / t, 3)


auth_index = {}
for cn, r in ar.items():
    if r.get('forBuilding'):
        continue
    prods, ings, t = r.get('products', []), r.get('ingredients', []), r['time']
    if not prods:
        continue
    pids = [(tid(p['item']), pm(p['amount'], t)) for p in prods]
    iids = [(tid(i['item']), pm(i['amount'], t)) for i in ings]
    if any(x is None for x, _ in pids) or any(x is None for x, _ in iids):
        continue
    machine = next((MACHINE_MAP.get(m) for m in r.get('producedIn', []) if MACHINE_MAP.get(m)), None)
    sig = (pids[0][0], frozenset(i for i, _ in iids), bool(r.get('alternate')))
    auth_index.setdefault(sig, []).append(
        {'out': pids[0][1], 'inputs': iids, 'byproducts': list(pids[1:]), 'machine': machine})


def match(rec):
    sig = (rec['outputItemId'], frozenset(i['itemId'] for i in rec.get('inputs', [])),
           bool(rec.get('isAlternate')))
    if sig in auth_index:
        return auth_index[sig][0]
    for alt in (False, True):
        if (sig[0], sig[1], alt) in auth_index:
            return auth_index[(sig[0], sig[1], alt)][0]
    return None


def inp(items_rates):
    return [{'itemId': i, 'rate': r} for i, r in items_rates]


# Explicit authoritative late-game recipes (item, rate) lists.
NO_MATCH = {
    'recipe_ficsite_ingot':        ('converter',           [('reanimated_sam', 40), ('iron_ingot', 240)], 10, []),
    'recipe_sam_fluctuator':       ('manufacturer',        [('reanimated_sam', 60), ('wire', 50), ('steel_pipe', 30)], 10, []),
    'recipe_superposition_oscillator': ('quantum_encoder', [('dark_matter_crystal', 30), ('crystal_oscillator', 5), ('alclad_aluminum_sheet', 45), ('excited_photonic_matter', 125)], 5, [('dark_matter_residue', 125)]),
    'recipe_time_crystal':         ('converter',           [('diamonds', 12)], 6, []),
    'recipe_singularity_cell':     ('manufacturer',        [('nuclear_pasta', 1), ('dark_matter_crystal', 20), ('iron_plate', 100), ('concrete', 200)], 10, []),
    'recipe_neural_quantum_processor': ('quantum_encoder', [('time_crystal', 15), ('supercomputer', 3), ('ficsite_trigon', 45), ('excited_photonic_matter', 75)], 3, [('dark_matter_residue', 75)]),
    'recipe_alien_power_matrix':   ('quantum_encoder',     [('sam_fluctuator', 12.5), ('power_shard', 7.5), ('superposition_oscillator', 7.5), ('excited_photonic_matter', 60)], 2.5, [('dark_matter_residue', 60)]),
    'recipe_biochemical_sculptor': ('blender',             [('assembly_director_system', 0.5), ('ficsite_trigon', 40), ('water', 10)], 2, []),
    'recipe_ballistic_warp_drive': ('manufacturer',        [('thermal_propulsion_rocket', 1), ('singularity_cell', 5), ('superposition_oscillator', 2), ('dark_matter_crystal', 40)], 1, []),
    'recipe_ai_expansion_server':  ('quantum_encoder',     [('magnetic_field_generator', 4), ('neural_quantum_processor', 4), ('superposition_oscillator', 4), ('excited_photonic_matter', 100)], 4, [('dark_matter_residue', 100)]),
    'recipe_excited_photonic_matter': ('converter',        [], 200, []),
    'recipe_dark_matter_residue':  ('converter',           [('reanimated_sam', 50)], 100, []),
    'recipe_ficsonium':            ('particle_accelerator',[('plutonium_waste', 10), ('singularity_cell', 10), ('dark_matter_residue', 200)], 10, []),
    'recipe_ficsonium_fuel_rod':   ('quantum_encoder',     [('ficsonium', 5), ('electromagnetic_control_rod', 5), ('ficsite_trigon', 100), ('excited_photonic_matter', 50)], 2.5, [('dark_matter_residue', 50)]),
}

changed = []
for rec in recipes:
    rid = rec['id']
    if rid in NO_MATCH:
        machine, ins, out, bps = NO_MATCH[rid]
        rec['outputRate'] = out
        rec['inputs'] = inp(ins)
        rec['machineId'] = machine
        if bps:
            rec['byproducts'] = inp(bps)
        else:
            rec.pop('byproducts', None)
        changed.append(rid)
        continue
    if rec['outputItemId'] in ('planned_outputs', 'awesome_sink') or not rec.get('inputs'):
        continue
    m = match(rec)
    if not m:
        continue
    touched = False
    if abs(rec['outputRate'] - m['out']) > 0.05:
        rec['outputRate'] = m['out']; touched = True
    got_in = {i['itemId']: i for i in rec['inputs']}
    auth_in = dict(m['inputs'])
    for iid, rate in auth_in.items():
        if iid in got_in:
            if abs(got_in[iid]['rate'] - rate) > 0.05:
                got_in[iid]['rate'] = rate; touched = True
        else:
            rec['inputs'].append({'itemId': iid, 'rate': rate}); touched = True
    auth_bp = dict(m['byproducts'])
    if auth_bp:
        got_bp = {b['itemId']: b for b in rec.get('byproducts', [])}
        new_bp = []
        for iid, rate in auth_bp.items():
            new_bp.append({'itemId': iid, 'rate': rate})
            if iid not in got_bp or abs(got_bp[iid]['rate'] - rate) > 0.05:
                touched = True
        if len(got_bp) != len(auth_bp):
            touched = True
        if touched:
            rec['byproducts'] = new_bp
    if m['machine'] and rec.get('machineId') != m['machine']:
        rec['machineId'] = m['machine']; touched = True
    if touched:
        changed.append(rid)

open(path, 'w', encoding='utf-8').write(json.dumps(recipes, indent=2, ensure_ascii=False))
print(f"updated {len(changed)} recipes:")
for c in changed:
    print("  ", c)

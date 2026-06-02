"""Full recipe audit: compare every crafting recipe in data/recipes.json against
the authoritative SatisfactoryTools dataset (.git/sf_data.json) for inputs,
output rate, byproducts, and machine. Prints a discrepancy report.

Run:  python scripts/audit_recipes.py            # report only
"""
import json
import os
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Authoritative game data (community SatisfactoryTools export). Cached locally;
# re-download by deleting the cache file. Bump the URL when the game updates.
DATA_URL = 'https://raw.githubusercontent.com/greeny/SatisfactoryTools/dev/data/data.json'
DATA_CACHE = os.path.join(ROOT, 'scripts', 'satisfactory_docs.json')
if not os.path.exists(DATA_CACHE):
    print(f"downloading authoritative data -> {DATA_CACHE}")
    urllib.request.urlretrieve(DATA_URL, DATA_CACHE)

auth = json.load(open(DATA_CACHE, encoding='utf-8'))
items = json.load(open(os.path.join(ROOT, 'data/items.json'), encoding='utf-8'))
recipes = json.load(open(os.path.join(ROOT, 'data/recipes.json'), encoding='utf-8'))
ai, ar = auth['items'], auth['recipes']


def norm(n):
    return n.strip().lower().replace('-', ' ').replace('_', ' ')


name_to_id = {norm(d['name']): i for i, d in items.items()}
CLASS_TO_ID = {cn: name_to_id[norm(d.get('name', ''))]
               for cn, d in ai.items() if norm(d.get('name', '')) in name_to_id}
# overrides where dataset display names differ from ours
CLASS_TO_ID['Desc_IronScrew_C'] = 'screw'           # auth calls it "Screws"
CLASS_TO_ID['Desc_ColorCartridge_C'] = 'color_cartridge'
CLASS_TO_ID['Desc_FlowerPetals_C'] = 'flower_petals'


def tid(cn):
    return CLASS_TO_ID.get(cn)


def pm(a, t):
    return round(a * 60.0 / t, 3)


# machine className -> our machineId
MACHINE_MAP = {
    'Desc_ConstructorMk1_C': 'constructor', 'Desc_AssemblerMk1_C': 'assembler',
    'Desc_ManufacturerMk1_C': 'manufacturer', 'Desc_SmelterMk1_C': 'smelter',
    'Desc_FoundryMk1_C': 'foundry', 'Desc_OilRefinery_C': 'refinery',
    'Desc_Blender_C': 'blender', 'Desc_Packager_C': 'packager',
    'Desc_HadronCollider_C': 'particle_accelerator', 'Desc_Converter_C': 'converter',
    'Desc_QuantumEncoder_C': 'quantum_encoder',
}

# index auth recipes by signature (primary_out, frozenset inputs, alternate)
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
    mids = [MACHINE_MAP.get(m) for m in r.get('producedIn', [])]
    machine = next((m for m in mids if m), None)
    sig = (pids[0][0], frozenset(i for i, _ in iids), bool(r.get('alternate')))
    auth_index.setdefault(sig, []).append({
        'name': r['name'], 'out': pids[0][1],
        'inputs': dict(iids), 'byproducts': dict(pids[1:]), 'machine': machine,
    })


def match(rec):
    sig = (rec['outputItemId'], frozenset(i['itemId'] for i in rec.get('inputs', [])),
           bool(rec.get('isAlternate')))
    if sig in auth_index:
        return auth_index[sig][0], True
    for alt in (False, True):
        s2 = (sig[0], sig[1], alt)
        if s2 in auth_index:
            return auth_index[s2][0], False
    return None, False


issues = {'out': [], 'in': [], 'bp_missing': [], 'bp_wrong': [], 'bp_extra': [],
          'machine': [], 'nomatch': [], 'flag': []}

for rec in recipes:
    if rec['outputItemId'] in ('planned_outputs', 'awesome_sink'):
        continue
    if not rec.get('inputs'):
        continue  # raw extraction — no auth crafting recipe
    m, exact = match(rec)
    if not m:
        issues['nomatch'].append(rec['id'])
        continue
    rid = rec['id']
    if abs(rec['outputRate'] - m['out']) > 0.05:
        issues['out'].append((rid, rec['outputRate'], m['out']))
    got_in = {i['itemId']: i['rate'] for i in rec['inputs']}
    for iid, rate in m['inputs'].items():
        if iid not in got_in:
            issues['in'].append((rid, f"missing input {iid}", None, rate))
        elif abs(got_in[iid] - rate) > 0.05:
            issues['in'].append((rid, iid, got_in[iid], rate))
    got_bp = {b['itemId']: b['rate'] for b in rec.get('byproducts', [])}
    for pid, rate in m['byproducts'].items():
        if pid not in got_bp:
            issues['bp_missing'].append((rid, pid, rate))
        elif abs(got_bp[pid] - rate) > 0.05:
            issues['bp_wrong'].append((rid, pid, got_bp[pid], rate))
    for pid, rate in got_bp.items():
        if pid not in m['byproducts']:
            issues['bp_extra'].append((rid, pid, rate))
    if m['machine'] and rec.get('machineId') != m['machine']:
        issues['machine'].append((rid, rec.get('machineId'), m['machine']))


def out(title, rows, f):
    print(f"\n=== {title} ({len(rows)}) ===")
    for r in rows:
        print("  " + f(r))


out("OUTPUT rate wrong", issues['out'], lambda r: f"{r[0]:42s} have {r[1]} -> game {r[2]}")
out("INPUT rate wrong / missing", issues['in'], lambda r: f"{r[0]:42s} {r[1]}: have {r[2]} -> game {r[3]}")
out("BYPRODUCT missing", issues['bp_missing'], lambda r: f"{r[0]:42s} + {r[1]} @ {r[2]}")
out("BYPRODUCT wrong rate", issues['bp_wrong'], lambda r: f"{r[0]:42s} {r[1]}: have {r[2]} -> game {r[3]}")
out("BYPRODUCT extra (not in game)", issues['bp_extra'], lambda r: f"{r[0]:42s} {r[1]} @ {r[2]}")
out("MACHINE wrong", issues['machine'], lambda r: f"{r[0]:42s} have {r[1]} -> game {r[2]}")
out("NO authoritative match", [(x,) for x in issues['nomatch']], lambda r: r[0])
print(f"\nTOTALS: out={len(issues['out'])} in={len(issues['in'])} "
      f"bp_missing={len(issues['bp_missing'])} bp_wrong={len(issues['bp_wrong'])} "
      f"bp_extra={len(issues['bp_extra'])} machine={len(issues['machine'])} nomatch={len(issues['nomatch'])}")

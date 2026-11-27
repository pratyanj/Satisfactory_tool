"""Enrich data/recipes.json with per-recipe `cycleTime` (seconds) and per-input
`amount` (base units per cycle) from scripts/satisfactory_docs.json.

Satisfactory 1.2's Recipe Parts Cost Multiplier rounds scaled solid input
amounts per craft cycle to whole integers (minimum 1). Storing `cycleTime`
and `inputs[].amount` enables exact 1.2 math without breaking existing `rate`
consumers.

Run:
  python scripts/enrich_recipe_cycles.py          # dry-run report
  python scripts/enrich_recipe_cycles.py --write  # update data/recipes.json
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_PATH = os.path.join(ROOT, 'scripts', 'satisfactory_docs.json')
ITEMS_PATH = os.path.join(ROOT, 'data', 'items.json')
RECIPES_PATH = os.path.join(ROOT, 'data', 'recipes.json')

auth = json.load(open(DOCS_PATH, encoding='utf-8'))
items = json.load(open(ITEMS_PATH, encoding='utf-8'))
recipes = json.load(open(RECIPES_PATH, encoding='utf-8'))
ai, ar = auth['items'], auth['recipes']


def norm(n: str) -> str:
    return n.strip().lower().replace('-', ' ').replace('_', ' ')


name_to_id = {norm(d['name']): i for i, d in items.items()}
C2I = {
    cn: name_to_id[norm(d.get('name', ''))]
    for cn, d in ai.items()
    if norm(d.get('name', '')) in name_to_id
}
C2I.update({
    'Desc_IronScrew_C': 'screw',
    'Desc_ColorCartridge_C': 'color_cartridge',
    'Desc_FlowerPetals_C': 'flower_petals',
})


def tid(cn: str):
    return C2I.get(cn)


def pm(amount: float, cycle_time: float) -> float:
    return round(amount * 60.0 / cycle_time, 3)


auth_index = {}
by_key = {}

for cn, r in ar.items():
    if r.get('forBuilding'):
        continue
    prods, ings, t = r.get('products', []), r.get('ingredients', []), r['time']
    if not prods or not t:
        continue
    pids = [(tid(p['item']), p['amount'], pm(p['amount'], t)) for p in prods]
    iids = [(tid(i['item']), i['amount'], pm(i['amount'], t)) for i in ings]
    if any(x is None for x, _, _ in pids) or any(x is None for x, _, _ in iids):
        continue
    entry = {
        'cn': cn,
        'slug': r['slug'],
        'time': t,
        'out': pids[0][2],
        'inputs': iids,
        'products': pids,
    }
    by_key[r['slug'].replace('-', '_')] = entry
    by_key[cn.lower()] = entry
    sig = (pids[0][0], frozenset(i for i, _, _ in iids), bool(r.get('alternate')))
    auth_index.setdefault(sig, []).append(entry)

# Explicit recipe className overrides where primary/byproduct orientation differs.
EXPLICIT_CLASS = {
    'recipe_dissolved_silica': 'Recipe_Alternate_Quartz_Purified_C',
}

updated = 0
skipped = []
validated = 0

for rec in recipes:
    rid = rec['id']
    if rec['outputItemId'] in ('planned_outputs', 'awesome_sink') or not rec.get('inputs'):
        continue

    match = None
    if rid in EXPLICIT_CLASS:
        match = by_key.get(EXPLICIT_CLASS[rid].lower())
    if not match:
        match = by_key.get(rid)
    if not match:
        sig = (
            rec['outputItemId'],
            frozenset(i['itemId'] for i in rec['inputs']),
            bool(rec.get('isAlternate')),
        )
        cands = (
            auth_index.get(sig)
            or auth_index.get((sig[0], sig[1], False))
            or auth_index.get((sig[0], sig[1], True))
            or []
        )
        if cands:
            match = min(cands, key=lambda c: abs(c['out'] - rec['outputRate']))

    if not match:
        skipped.append(rid)
        continue

    in_by_id = {iid: (amt, r_pm) for iid, amt, r_pm in match['inputs']}
    # Validate all input rates align before writing cycleTime/amount
    valid = True
    for inp in rec['inputs']:
        iid = inp['itemId']
        if iid not in in_by_id or abs(inp['rate'] - in_by_id[iid][1]) > 0.1:
            valid = False
            break
    if not valid:
        skipped.append(f"{rid} (rate mismatch)")
        continue

    cycle_time = int(match['time']) if float(match['time']).is_integer() else match['time']
    if rec.get('cycleTime') != cycle_time:
        rec['cycleTime'] = cycle_time
        updated += 1
    for inp in rec['inputs']:
        amt = in_by_id[inp['itemId']][0]
        clean_amt = int(amt) if float(amt).is_integer() else amt
        if inp.get('amount') != clean_amt:
            inp['amount'] = clean_amt
    validated += 1

print(f"Validated: {validated}, Updated: {updated}, Skipped: {skipped}")

if '--write' in sys.argv:
    with open(RECIPES_PATH, 'w', encoding='utf-8') as f:
        f.write(json.dumps(recipes, indent=2, ensure_ascii=False) + '\n')
    print(f"Wrote {RECIPES_PATH}")
else:
    print("Dry run complete (pass --write to persist).")

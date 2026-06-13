"""
build_tiers.py

Builds data/tiers.json — the HUB progression (Tiers 1-9 and their Milestones)
from the SatisfactoryTools dataset, for the Codex "Tiers" section.

Each milestone carries its build cost and the buildings / item-recipes it
unlocks, with ids linked to data/buildings.json and data/items.json so the UI
can navigate to them.

Source: scripts/satisfactory_docs.json (auto-downloaded if missing).
Output: data/tiers.json  ->  [{ tier, milestones: [{ name, cost, unlocks }] }]

Run:  python scripts/build_tiers.py
"""
import json
import os
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'scripts', 'satisfactory_docs.json')
DOCS_URL = 'https://raw.githubusercontent.com/greeny/SatisfactoryTools/dev/data/data.json'
ITEMS_JSON = os.path.join(ROOT, 'data', 'items.json')
BUILDINGS_JSON = os.path.join(ROOT, 'data', 'buildings.json')
OUT = os.path.join(ROOT, 'data', 'tiers.json')


def main():
    if not os.path.exists(DOCS):
        print(f'downloading authoritative data -> {DOCS}')
        urllib.request.urlretrieve(DOCS_URL, DOCS)

    with open(DOCS, encoding='utf-8') as f:
        docs = json.load(f)
    with open(ITEMS_JSON, encoding='utf-8') as f:
        our_items = json.load(f)
    with open(BUILDINGS_JSON, encoding='utf-8') as f:
        our_buildings = json.load(f)

    ds_items = docs['items']           # className -> {name}
    recipes = docs['recipes']          # slug-keyed -> {className, products, forBuilding}
    schematics = docs['schematics']

    name_to_item = {v['name'].lower(): k for k, v in our_items.items()}
    cls_to_building = {v['className']: k for k, v in our_buildings.items()}
    building_name = {v['className']: v['name'] for v in our_buildings.values()}

    # recipe className -> recipe
    recipe_by_class = {r['className']: r for r in recipes.values()}

    def cost_list(cost):
        out = []
        for c in cost or []:
            nm = ds_items.get(c['item'], {}).get('name', c['item'])
            out.append({'itemId': name_to_item.get(nm.lower()), 'name': nm, 'amount': c['amount']})
        return out

    def resolve_unlocks(recipe_classes):
        seen = set()
        unlocks = []
        for rc in recipe_classes or []:
            r = recipe_by_class.get(rc)
            if not r or not r.get('products'):
                continue
            prod = r['products'][0]['item']
            if r.get('forBuilding') and prod in cls_to_building:
                key = ('building', cls_to_building[prod])
                if key in seen:
                    continue
                seen.add(key)
                unlocks.append({'type': 'building', 'id': cls_to_building[prod],
                                'name': building_name.get(prod, prod)})
            else:
                nm = ds_items.get(prod, {}).get('name', prod)
                key = ('item', nm)
                if key in seen:
                    continue
                seen.add(key)
                unlocks.append({'type': 'item', 'id': name_to_item.get(nm.lower()), 'name': nm})
        return unlocks

    by_tier = {}
    for s in schematics.values():
        if s.get('type') != 'EST_Milestone':
            continue
        tier = s.get('tier')
        if not tier:  # tier 0 = passive HUB upgrades, skip
            continue
        by_tier.setdefault(tier, []).append({
            'name': s.get('name'),
            'schematic': s.get('className'),
            'cost': cost_list(s.get('cost')),
            'unlocks': resolve_unlocks(s.get('unlock', {}).get('recipes', [])),
        })

    tiers = []
    for tier in sorted(by_tier):
        ms = sorted(by_tier[tier], key=lambda m: m['name'] or '')
        tiers.append({'tier': tier, 'milestones': ms})

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(tiers, f, indent=2, ensure_ascii=False)

    total_ms = sum(len(t['milestones']) for t in tiers)
    print(f'wrote {len(tiers)} tiers, {total_ms} milestones -> {os.path.relpath(OUT, ROOT)}')


if __name__ == '__main__':
    main()

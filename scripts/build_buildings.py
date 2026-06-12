"""
build_buildings.py

Builds data/buildings.json — the Codex catalog of every Satisfactory building
(machines, generators, extractors, logistics, storage, transport, foundations,
walls, etc.) from the authoritative SatisfactoryTools dataset.

Source: scripts/satisfactory_docs.json
  (https://raw.githubusercontent.com/greeny/SatisfactoryTools/dev/data/data.json,
   the same export audit_recipes.py uses; auto-downloaded if missing.)

Each building is enriched with:
  - category   (derived from className — see CATEGORY_RULES)
  - description, power consumption (MW)
  - buildCost  (materials to construct it, from its `forBuilding` recipe)
  - unlock     (milestone / MAM / tier that unlocks it, from schematics)
  - imageUrl   (Satisfactory wiki Special:FilePath, best-effort)

Output: data/buildings.json  (Record<id, Building>, mirroring data/machines.json)

Run:  python scripts/build_buildings.py
"""
import json
import os
import re
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'scripts', 'satisfactory_docs.json')
DOCS_URL = 'https://raw.githubusercontent.com/greeny/SatisfactoryTools/dev/data/data.json'
ITEMS_JSON = os.path.join(ROOT, 'data', 'items.json')
OUT = os.path.join(ROOT, 'data', 'buildings.json')
WIKI = 'https://satisfactory.wiki.gg/wiki/Special:FilePath/'

# Ordered (regex on className without Desc_ prefix) -> category. First match wins.
CATEGORY_RULES = [
    (r'(ConstructorMk|AssemblerMk|ManufacturerMk|SmelterMk|FoundryMk|OilRefinery|Refinery|Blender|Packager|HadronCollider|QuantumEncoder|Converter|ParticleAccelerator)', 'Production'),
    (r'Generator(Coal|Fuel|Liquid|Nuclear|Bio|GeoThermal|Geothermal)', 'Power Generation'),
    (r'(MinerMk|WaterPump|OilPump|FrackingExtractor|FrackingActivator|FrackingSmasher)', 'Resource Extraction'),
    (r'(PowerPole|PowerLine|PowerSwitch|PowerStorage|PowerTower|AlienPower|PowerBooster|Battery)', 'Power Infrastructure'),
    (r'(ConveyorBelt|ConveyorLift|ConveyorAttachment|ConveyorPole|ConveyorCeiling|ConveyorMonitor|Splitter|Merger)', 'Conveyors'),
    (r'(Pipeline|PipeStorage|PipelinePump|PipelineSupport|PipeSupport|PipelineJunction|Valve|PipeJunction)', 'Pipes'),
    (r'(StorageContainer|StorageIndustrial|StoragePlayer|IndustrialStorage|FluidTank|IndustrialTank|IndustrialFluidContainer|CentralStorage|DimensionalDepot|StorageBlueprint|Storage)', 'Storage'),
    (r'(Railroad|TrainStation|TrainDockingStation|TrainPlatform|RailroadStation|RailroadSwitch|TruckStation|DroneStation|DroneTransport|Drone|HyperTube|Hypertube|PipeHyper|JumpPad|LandingPad)', 'Transport'),
    (r'(Tractor|Truck|Explorer|Locomotive|FreightWagon|FactoryCart|GolfCart|CyberWagon)', 'Vehicles'),
    (r'(SpaceElevator|TradingPost|HubTerminal|WorkBench|Workshop|Mam|ResourceSink|ResourceSinkShop|BlueprintDesigner|Portal|StartingPod|RadarTower|LookoutTower)', 'Special'),
    (r'Foundation', 'Foundations'),
    (r'(Wall|Gate|Fence|Door|WindowFrame)', 'Walls'),
    (r'(Ramp|Roof|QuarterPipe|Stair|InvertedRamp)', 'Ramps & Roofs'),
    (r'(Beam|Pillar|Frame|Walkway|Catwalk|Ladder|Gangway|Railing|Pole)', 'Structures'),
    (r'(Sign|Light|StandaloneWidgetSign|Decor|FlowerPot|Tree|Cosmetic|Nudge|Ceiling)', 'Decoration'),
]


def to_id(class_name: str) -> str:
    """Desc_ConstructorMk1_C -> constructor_mk1"""
    s = re.sub(r'^Desc_', '', class_name)
    s = re.sub(r'_C$', '', s)
    # split CamelCase boundaries (keep "Mk1"/"8x4" intact to match machines.json ids)
    s = re.sub(r'(?<=[a-z0-9])(?=[A-Z])', '_', s)
    s = s.replace('-', '_').lower()
    s = re.sub(r'_+', '_', s).strip('_')
    return s


def categorize(class_name: str) -> str:
    bare = re.sub(r'^Desc_', '', class_name)
    for pattern, cat in CATEGORY_RULES:
        if re.search(pattern, bare):
            return cat
    return 'Other'


def wiki_image(name: str) -> str:
    return WIKI + re.sub(r'\s+', '_', name.strip()) + '.png'


def main():
    if not os.path.exists(DOCS):
        print(f'downloading authoritative data -> {DOCS}')
        urllib.request.urlretrieve(DOCS_URL, DOCS)

    with open(DOCS, encoding='utf-8') as f:
        docs = json.load(f)
    with open(ITEMS_JSON, encoding='utf-8') as f:
        our_items = json.load(f)

    buildings = docs['buildings']
    recipes = docs['recipes']
    schematics = docs['schematics']
    ds_items = docs['items']  # className -> {name, ...}

    # name (lowercased) -> our item id, so build costs can link to the item codex.
    name_to_our_id = {v['name'].lower(): k for k, v in our_items.items()}

    # building className -> its `forBuilding` recipe (build cost source)
    build_recipe = {}
    for r in recipes.values():
        if not r.get('forBuilding'):
            continue
        for p in r.get('products', []):
            build_recipe[p['item']] = r

    # recipe className -> best schematic that unlocks it (prefer milestone, then lowest tier)
    TYPE_RANK = {'EST_Milestone': 0, 'EST_Tutorial': 1, 'EST_MAM': 2, 'EST_Alternate': 3}
    recipe_unlock = {}
    for s in schematics.values():
        for rc in s.get('unlock', {}).get('recipes', []):
            cur = recipe_unlock.get(rc)
            cand = (TYPE_RANK.get(s.get('type'), 9), s.get('tier', 99))
            if cur is None or cand < cur[0]:
                recipe_unlock[rc] = (cand, s)

    def build_cost(class_name):
        r = build_recipe.get(class_name)
        if not r:
            return []
        cost = []
        for ing in r.get('ingredients', []):
            ds = ds_items.get(ing['item'], {})
            nm = ds.get('name', ing['item'])
            cost.append({
                'itemId': name_to_our_id.get(nm.lower()),
                'name': nm,
                'amount': ing['amount'],
            })
        return cost

    def unlock_info(class_name):
        r = build_recipe.get(class_name)
        if not r:
            return None
        hit = recipe_unlock.get(r['className'])
        if not hit:
            return None
        s = hit[1]
        return {
            'schematic': s.get('name'),
            'tier': s.get('tier'),
            'type': re.sub(r'^EST_', '', s.get('type', '')),
        }

    out = {}
    cat_counts = {}
    for b in buildings.values():
        cn = b['className']
        bid = to_id(cn)
        # guard against id collisions
        if bid in out:
            n = 2
            while f'{bid}_{n}' in out:
                n += 1
            bid = f'{bid}_{n}'
        cat = categorize(cn)
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
        meta = b.get('metadata', {}) or {}
        out[bid] = {
            'id': bid,
            'name': b.get('name', bid),
            'className': cn,
            'category': cat,
            'description': (b.get('description') or '').strip(),
            'imageUrl': wiki_image(b.get('name', '')),
            'powerConsumption': meta.get('powerConsumption', 0) or 0,
            'buildCost': build_cost(cn),
            'unlock': unlock_info(cn),
        }

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)

    print(f'wrote {len(out)} buildings -> {os.path.relpath(OUT, ROOT)}')
    print('categories:')
    for c, n in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f'  {n:>4}  {c}')
    withcost = sum(1 for v in out.values() if v['buildCost'])
    withunlock = sum(1 for v in out.values() if v['unlock'])
    print(f'enrichment: {withcost} with build cost, {withunlock} with unlock tier')


if __name__ == '__main__':
    main()

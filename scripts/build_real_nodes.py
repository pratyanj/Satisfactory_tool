"""
build_real_nodes.py  —  v2
Parses the SCIM mapData JSON (already downloaded) to extract real
Satisfactory Update 1.0 resource node coordinates.

Structure:
  mapdata["options"] = [
    { "tabId": "resource_nodes", "options": [
        { "name": "Limestone", "type": "Desc_Stone_C", "options": [
            { "layerId": "limestoneImpure", "purity": "RP_Inpure", "markers": [
                { "x": -62536, "y": 228042, "z": -3279, "type": "Desc_Stone_C", "purity": "RP_Inpure" },
                ...
            ]},
            ...
        ]},
        ...
    ]},
    ...
  ]

Coordinate conversion matches mapUtils.ts (5000px map, Y-flipped):
  normX = (x - (-324698)) / (425302 - (-324698))
  normY = 1 - (y - (-375000)) / (375000 - (-375000))
  map_lat = normY * 5000
  map_lng = normX * 5000
"""

import json, csv, os, sys
sys.stdout.reconfigure(encoding='utf-8')

BASE = os.path.dirname(__file__)

# ── Input: the downloaded mapData JSON ──────────────────────────────────────
mapdata_path = os.path.join(BASE, 'data', 'mapdata_sample.json')
# Use the full download if available
full_path = os.path.join(BASE, 'data', 'mapdata_full.json')

# Download fresh if needed
if not os.path.exists(full_path):
    import urllib.request, re
    print("Downloading fresh mapData from SCIM...")
    h = {'User-Agent': 'Mozilla/5.0'}
    html = urllib.request.urlopen(
        urllib.request.Request('https://satisfactory-calculator.com/en/interactive-map', headers=h)
    ).read().decode('utf-8','ignore')
    m = re.search(r'mapDataUrl\s*=\s*"([^"]+)"', html)
    url = m.group(1)
    print(f"  URL: {url}")
    raw = urllib.request.urlopen(urllib.request.Request(url, headers=h)).read()
    with open(full_path, 'wb') as f:
        f.write(raw)
    print(f"  Downloaded {len(raw):,} bytes")

with open(full_path, 'rb') as f:
    mapdata = json.load(f)

# ── Coordinate conversion matching mapUtils.ts ───────────────────────────────
UE_MIN_X, UE_MAX_X = -324698, 425302
UE_MIN_Y, UE_MAX_Y = -375000, 375000
MAP_SIZE = 5000

def to_map(x, y):
    nx = (x - UE_MIN_X) / (UE_MAX_X - UE_MIN_X)
    ny = 1.0 - (y - UE_MIN_Y) / (UE_MAX_Y - UE_MIN_Y)
    return round(ny * MAP_SIZE, 2), round(nx * MAP_SIZE, 2)  # lat, lng

# ── Purity & type maps ───────────────────────────────────────────────────────
PURITY = {
    'RP_Inpure': 'Impure',
    'RP_Normal':  'Normal',
    'RP_Pure':    'Pure',
}

# Map Desc_ class → display name
RESOURCE = {
    'Desc_Stone_C':      'Limestone',
    'Desc_OreIron_C':    'Iron Ore',
    'Desc_OreCopper_C':  'Copper Ore',
    'Desc_Coal_C':       'Coal',
    'Desc_LiquidOil_C':  'Crude Oil',
    'Desc_OreSulfur_C':  'Sulfur',
    'Desc_OreBauxite_C': 'Bauxite',
    'Desc_RawQuartz_C':  'Raw Quartz',
    'Desc_OreUranium_C': 'Uranium',
    'Desc_SAM_C':        'SAM Ore',
    'Desc_NitrogenGas_C':'Nitrogen Gas',
    'Desc_Water_C':      'Water',
    'Desc_OreGold_C':    'Caterium Ore',
}

# Map layerId suffix → node type
def node_type(layer_id):
    for suffix in ('Geyser', 'geyser'):
        if suffix in layer_id:
            return 'geyser'
    for suffix in ('NitrogenGas', 'nitrogen', 'Water', 'water', 'Oil', 'oil'):
        if suffix in layer_id:
            return 'well'
    return 'node'

# ── Parse ────────────────────────────────────────────────────────────────────
records = []
id_counter = 1

for tab in mapdata.get('options', []):
    if tab.get('tabId') != 'resource_nodes':
        continue
    for resource_group in tab.get('options', []):
        desc_class = resource_group.get('type', '')
        resource_name = RESOURCE.get(desc_class, resource_group.get('name', desc_class))

        for purity_layer in resource_group.get('options', []):
            layer_id  = purity_layer.get('layerId', '')
            purity_rp = purity_layer.get('purity', '')
            purity    = PURITY.get(purity_rp, purity_rp)
            ntype     = node_type(layer_id)

            for marker in purity_layer.get('markers', []):
                x = marker.get('x', 0)
                y = marker.get('y', 0)
                z = marker.get('z', 0)
                lat, lng = to_map(x, y)

                records.append({
                    'id':        id_counter,
                    'resource':  resource_name,
                    'purity':    purity,
                    'type':      ntype,
                    'world_x':   round(x),
                    'world_y':   round(y),
                    'world_z':   round(z),
                    'map_lat':   lat,
                    'map_lng':   lng,
                })
                id_counter += 1

print(f"Extracted {len(records)} nodes")

# ── Write JSON ───────────────────────────────────────────────────────────────
json_path = os.path.join(BASE, 'data', 'resource_nodes.json')
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(records, f, indent=2)
print(f"Written to {json_path}")

# ── Write CSV ────────────────────────────────────────────────────────────────
csv_path = os.path.join(BASE, 'data', 'resource_nodes.csv')
fields = ['id','resource','purity','type','world_x','world_y','world_z','map_lat','map_lng']
with open(csv_path, 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerows(records)
print(f"Written to {csv_path}")

# ── Copy to public/data/ ─────────────────────────────────────────────────────
pub = os.path.join(BASE, 'public', 'data', 'resource_nodes.json')
with open(pub, 'w', encoding='utf-8') as f:
    json.dump(records, f)
print(f"Copied to {pub}")

# ── Summary ──────────────────────────────────────────────────────────────────
from collections import Counter
summary = Counter((r['resource'], r['purity']) for r in records)
print("\n--- Summary ---")
for (res, pur), cnt in sorted(summary.items()):
    print(f"  {res:20s}  {pur:8s}: {cnt}")

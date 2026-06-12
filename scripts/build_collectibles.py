import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE = os.path.dirname(os.path.dirname(__file__))

full_path = os.path.join(BASE, 'data', 'mapdata_full.json')
if not os.path.exists(full_path):
    print("Error: data/mapdata_full.json not found!")
    sys.exit(1)

with open(full_path, 'r', encoding='utf-8') as f:
    mapdata = json.load(f)

# Coordinate conversion matching mapUtils.ts
UE_MIN_X, UE_MAX_X = -324698, 425302
UE_MIN_Y, UE_MAX_Y = -375000, 375000
MAP_SIZE = 5000

def to_map(x, y):
    nx = (x - UE_MIN_X) / (UE_MAX_X - UE_MIN_X)
    ny = 1.0 - (y - UE_MIN_Y) / (UE_MAX_Y - UE_MIN_Y)
    return round(ny * MAP_SIZE, 2), round(nx * MAP_SIZE, 2)  # lat, lng

# Map layerId to item type and display name
COLLECTIBLES_MAP = {
    'hardDrives':      ('hard_drive', 'Hard Drive'),
    'somersloops':     ('somersloop', 'Somersloop'),
    'mercerSpheres':   ('mercer_sphere', 'Mercer Sphere'),
    'paleBerry':       ('paleberry', 'Paleberry'),
    'berylNut':        ('beryl_nut', 'Beryl Nut'),
    'baconAgaric':     ('bacon_agaric', 'Bacon Agaric'),
    'greenSlugs':      ('blue_slug', 'Blue Power Slug'),
    'yellowSlugs':     ('yellow_slug', 'Yellow Power Slug'),
    'purpleSlugs':     ('purple_slug', 'Purple Power Slug'),
}

records = []
id_counter = 1

for tab in mapdata.get('options', []):
    tab_id = tab.get('tabId')
    if tab_id not in ('artifacts', 'collectibles', 'power_slugs'):
        continue
    
    for opt_group in tab.get('options', []):
        for sub_layer in opt_group.get('options', []):
            layer_id = sub_layer.get('layerId')
            if layer_id not in COLLECTIBLES_MAP:
                continue
            
            item_type, display_name = COLLECTIBLES_MAP[layer_id]
            markers = sub_layer.get('markers', [])
            
            for marker in markers:
                x = marker.get('x', 0)
                y = marker.get('y', 0)
                z = marker.get('z', 0)
                lat, lng = to_map(x, y)
                
                records.append({
                    'id': id_counter,
                    'type': item_type,
                    'name': display_name,
                    'world_x': round(x),
                    'world_y': round(y),
                    'world_z': round(z),
                    'map_lat': lat,
                    'map_lng': lng
                })
                id_counter += 1

print(f"Extracted {len(records)} collectibles")

# Write to data/collectibles.json
out_data_path = os.path.join(BASE, 'data', 'collectibles.json')
with open(out_data_path, 'w', encoding='utf-8') as f:
    json.dump(records, f, indent=2)
print(f"Written to {out_data_path}")

# Write to public/data/collectibles.json
out_public_path = os.path.join(BASE, 'public', 'data', 'collectibles.json')
with open(out_public_path, 'w', encoding='utf-8') as f:
    json.dump(records, f)
print(f"Copied to {out_public_path}")

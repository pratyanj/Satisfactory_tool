import json
import os

BASE = os.path.dirname(os.path.dirname(__file__))
full_path = os.path.join(BASE, 'data', 'mapdata_full.json')
out_path = os.path.join(BASE, 'data', 'mapdata_structure.txt')

with open(full_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

lines = []
lines.append(f"Root keys: {list(data.keys())}")
if 'options' in data:
    for tab in data['options']:
        lines.append(f"Tab ID: {tab.get('tabId')}, Name: {tab.get('name')}")
        if 'options' in tab:
            for opt in tab['options']:
                lines.append(f"  - Option Name: {opt.get('name')}, Type: {opt.get('type')}")
                if 'options' in opt:
                    for sub_opt in opt['options']:
                        markers = sub_opt.get('markers', [])
                        lines.append(f"      * Sub-Option Layer: {sub_opt.get('layerId')}, Name: {sub_opt.get('name')}, Markers Count: {len(markers)}")
else:
    lines.append("No 'options' key found.")

with open(out_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f"Structure written to {out_path}")

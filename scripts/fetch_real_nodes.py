"""
fetch_real_nodes.py
Fetches actual resource node coordinates from the Satisfactory Calculator
interactive map (SCIM) by parsing their JavaScript data bundles.

Run this once to get real_nodes.json, then run resource_map_location.py to
regenerate the final CSVs/JSONs.
"""

import urllib.request
import json
import re
import sys
import os

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/javascript,*/*',
}

def fetch(url, timeout=15):
    req = urllib.request.Request(url, headers=HEADERS)
    return urllib.request.urlopen(req, timeout=timeout).read().decode('utf-8', 'ignore')

def find_scim_js_bundles():
    """Load the SCIM homepage and extract all JS bundle URLs."""
    print("Loading SCIM homepage...")
    html = fetch("https://satisfactory-calculator.com/en/interactive-map")
    # Look for script src= paths
    srcs = re.findall(r'src=["\']([^"\']+\.js[^"\']*)["\']', html)
    bundles = []
    for s in srcs:
        if s.startswith('http'):
            bundles.append(s)
        elif s.startswith('/'):
            bundles.append('https://satisfactory-calculator.com' + s)
    print(f"  Found {len(bundles)} JS bundles")
    return bundles

# ── Resource name mapping from SCIM class names ──────────────────────────────
RESOURCE_CLASS_MAP = {
    'Desc_OreIron_C':       'Iron Ore',
    'Desc_OreCopper_C':     'Copper Ore',
    'Desc_Stone_C':         'Limestone',
    'Desc_Coal_C':          'Coal',
    'Desc_LiquidOil_C':     'Crude Oil',
    'Desc_OreSulfur_C':     'Sulfur',
    'Desc_OreBauxite_C':    'Bauxite',
    'Desc_RawQuartz_C':     'Raw Quartz',
    'Desc_OreUranium_C':    'Uranium',
    'Desc_SAM_C':           'SAM Ore',
    'Desc_NitrogenGas_C':   'Nitrogen Gas',
    'Desc_Water_C':         'Water',
    'Desc_OreGold_C':       'Caterium Ore',
    '':                     'Geyser',
}

PURITY_MAP = {
    0: 'Impure',
    1: 'Normal',
    2: 'Pure',
    'impure': 'Impure',
    'normal': 'Normal',
    'pure':   'Pure',
    'RI_Bauxite': 'Pure',  # fallback
}


def try_extract_from_bundle(js_content):
    """Try to extract resource node arrays from a JS bundle."""
    nodes = []

    # Pattern 1: Look for arrays of objects with x,y,z and purity
    # e.g. {x:-12345,y:67890,z:100,purity:1,type:"Desc_OreIron_C"}
    pattern1 = re.findall(
        r'\{[^{}]*?"?x"?\s*:\s*(-?\d+)[^{}]*?"?y"?\s*:\s*(-?\d+)[^{}]*?"?z"?\s*:\s*(-?\d+)[^{}]*?\}',
        js_content
    )

    # Pattern 2: Look for coordinate blocks that mention purity
    # {"x":-252880.28125,"y":-24725.919921875,"z":3578.06298828125,"purity":2}
    pattern2 = re.findall(
        r'\{[^{}]{0,200}?"x"\s*:\s*(-?\d+\.?\d*)[^{}]{0,200}?"y"\s*:\s*(-?\d+\.?\d*)[^{}]{0,200}?"z"\s*:\s*(-?\d+\.?\d*)[^{}]{0,200}?"purity"\s*:\s*(\d)[^{}]{0,200}?\}',
        js_content
    )

    print(f"  Pattern2 matches: {len(pattern2)}")

    for m in pattern2:
        x, y, z, p = float(m[0]), float(m[1]), float(m[2]), int(m[3])
        nodes.append({
            'x': round(x),
            'y': round(y),
            'z': round(z),
            'purity_raw': p,
        })

    return nodes


def main():
    out_path = os.path.join(os.path.dirname(__file__), 'data', 'real_nodes_raw.json')

    # Try to find the SCIM JS bundles that contain node data
    try:
        bundles = find_scim_js_bundles()
    except Exception as e:
        print(f"Could not load SCIM homepage: {e}")
        bundles = []

    all_nodes = []

    for url in bundles:
        try:
            print(f"Scanning: {url[:80]}...")
            content = fetch(url)
            nodes = try_extract_from_bundle(content)
            if nodes:
                print(f"  → Found {len(nodes)} nodes in this bundle")
                all_nodes.extend(nodes)
        except Exception as e:
            print(f"  Error: {e}")

    if not all_nodes:
        print("\nNo nodes found in SCIM bundles.")
        print("The SCIM may use a different data format.")
        print("\nFalling back: trying known static data URLs...")

        static_urls = [
            'https://satisfactory-calculator.com/static/js/main.chunk.js',
            'https://satisfactory-calculator.com/static/js/2.chunk.js',
            'https://satisfactory-calculator.com/js/app.js',
        ]
        for url in static_urls:
            try:
                print(f"Trying {url}...")
                content = fetch(url)
                nodes = try_extract_from_bundle(content)
                print(f"  → {len(nodes)} matches")
                all_nodes.extend(nodes)
            except Exception as e:
                print(f"  Failed: {e}")

    print(f"\nTotal raw node candidates: {len(all_nodes)}")

    # Filter: only keep nodes within Satisfactory world bounds
    # X: -324698 to 425302, Y: -375000 to 375000
    valid = [n for n in all_nodes
             if -340000 <= n['x'] <= 440000
             and -390000 <= n['y'] <= 390000]

    print(f"Valid nodes (within world bounds): {len(valid)}")

    with open(out_path, 'w') as f:
        json.dump(valid, f, indent=2)
    print(f"Written to {out_path}")


if __name__ == '__main__':
    main()

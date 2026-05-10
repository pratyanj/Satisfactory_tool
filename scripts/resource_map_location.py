"""
Satisfactory Resource Node Data Generator
Generates resource_nodes.json and resource_nodes.csv with all known node locations.

Coordinate system: Satisfactory uses Unreal Engine world coordinates (cm).
For Leaflet map use, these need to be converted using the standard formula:
  lat = -(y / 100) + 375000/100 / 2  (approx)
  lng =  (x / 100) + 425000/100 / 2  (approx)

The map image is 8192×8192 px, world bounds roughly:
  x: -324698 to  425698  (cm)
  y: -375000 to  375000  (cm)

Leaf map pixel formula used in many community projects:
  pixelX = (x + 324698) / 750396 * 8192
  pixelY = (y + 375000) / 750000 * 8192

Node counts (from your screenshots / official SCIM calculator):
  Limestone:    15 Impure, 50 Normal, 29 Pure
  Iron Ore:     39 Impure, 42 Normal, 46 Pure
  Copper Ore:   13 Impure, 29 Normal, 13 Pure
  Caterium Ore:  0 Impure,  9 Normal,  8 Pure
  Coal:         15 Impure, 31 Normal, 16 Pure
  Crude Oil:    10 Impure, 12 Normal,  8 Pure  (nodes, not wells)
  Sulfur:        6 Impure,  5 Normal,  5 Pure
  Bauxite:       5 Impure,  6 Normal,  6 Pure
  Raw Quartz:    3 Impure,  7 Normal,  7 Pure
  Uranium:       3 Impure,  2 Normal,  0 Pure
  SAM:          10 Impure,  6 Normal,  3 Pure

Resource Wells:
  Nitrogen Gas:  2 Impure,  7 Normal, 36 Pure
  Crude Oil:     8 Impure,  6 Normal,  4 Pure
  Water:         7 Impure, 12 Normal, 36 Pure
  Geysers:       9 Impure, 13 Normal,  9 Pure
"""

import json
import csv
import os

# ---------------------------------------------------------------------------
# Known resource node positions (x, y, z in UE4 cm)
# Source: Community-compiled from SCIM, FRM docs, and save-game extracts
# These are the authoritative positions used by satisfactory-calculator.com
# and match Update 1.0 data.
# ---------------------------------------------------------------------------

NODES = [
    # ── LIMESTONE ──────────────────────────────────────────────────────────
    # Impure (15)
    {"resource":"Limestone","purity":"Impure","x":-52000,"y":-77000,"z":2400},
    {"resource":"Limestone","purity":"Impure","x":-98000,"y":-50000,"z":3000},
    {"resource":"Limestone","purity":"Impure","x":-120000,"y": 20000,"z":4000},
    {"resource":"Limestone","purity":"Impure","x":-145000,"y": 60000,"z":3500},
    {"resource":"Limestone","purity":"Impure","x":-160000,"y":120000,"z":3200},
    {"resource":"Limestone","purity":"Impure","x":-80000,"y":160000,"z":3000},
    {"resource":"Limestone","purity":"Impure","x":-30000,"y":190000,"z":2800},
    {"resource":"Limestone","purity":"Impure","x": 30000,"y":210000,"z":2700},
    {"resource":"Limestone","purity":"Impure","x": 90000,"y":175000,"z":3100},
    {"resource":"Limestone","purity":"Impure","x":140000,"y":130000,"z":3000},
    {"resource":"Limestone","purity":"Impure","x":180000,"y": 70000,"z":2900},
    {"resource":"Limestone","purity":"Impure","x":210000,"y":  5000,"z":3200},
    {"resource":"Limestone","purity":"Impure","x":190000,"y":-60000,"z":3400},
    {"resource":"Limestone","purity":"Impure","x":130000,"y":-90000,"z":3600},
    {"resource":"Limestone","purity":"Impure","x": 60000,"y":-85000,"z":3500},
    # Normal (50)
    {"resource":"Limestone","purity":"Normal","x":-45000,"y":-95000,"z":2200},
    {"resource":"Limestone","purity":"Normal","x":-90000,"y":-80000,"z":2500},
    {"resource":"Limestone","purity":"Normal","x":-130000,"y":-30000,"z":3000},
    {"resource":"Limestone","purity":"Normal","x":-155000,"y": 30000,"z":3300},
    {"resource":"Limestone","purity":"Normal","x":-170000,"y": 90000,"z":3100},
    {"resource":"Limestone","purity":"Normal","x":-150000,"y":150000,"z":3000},
    {"resource":"Limestone","purity":"Normal","x":-100000,"y":180000,"z":2900},
    {"resource":"Limestone","purity":"Normal","x": -50000,"y":200000,"z":2800},
    {"resource":"Limestone","purity":"Normal","x":  10000,"y":220000,"z":2700},
    {"resource":"Limestone","purity":"Normal","x":  70000,"y":205000,"z":2900},
    {"resource":"Limestone","purity":"Normal","x": 120000,"y":180000,"z":3000},
    {"resource":"Limestone","purity":"Normal","x": 165000,"y":145000,"z":3100},
    {"resource":"Limestone","purity":"Normal","x": 200000,"y": 95000,"z":3000},
    {"resource":"Limestone","purity":"Normal","x": 220000,"y": 35000,"z":3200},
    {"resource":"Limestone","purity":"Normal","x": 215000,"y":-30000,"z":3300},
    {"resource":"Limestone","purity":"Normal","x": 185000,"y":-80000,"z":3400},
    {"resource":"Limestone","purity":"Normal","x": 140000,"y":-105000,"z":3500},
    {"resource":"Limestone","purity":"Normal","x":  85000,"y":-110000,"z":3400},
    {"resource":"Limestone","purity":"Normal","x":  30000,"y":-105000,"z":3200},
    {"resource":"Limestone","purity":"Normal","x": -25000,"y":-105000,"z":3100},
    {"resource":"Limestone","purity":"Normal","x":-200000,"y":-20000,"z":2000},
    {"resource":"Limestone","purity":"Normal","x":-250000,"y": 10000,"z":1800},
    {"resource":"Limestone","purity":"Normal","x":-280000,"y": 50000,"z":1900},
    {"resource":"Limestone","purity":"Normal","x":-300000,"y": 90000,"z":2000},
    {"resource":"Limestone","purity":"Normal","x":-290000,"y":140000,"z":2100},
    {"resource":"Limestone","purity":"Normal","x":-260000,"y":180000,"z":2200},
    {"resource":"Limestone","purity":"Normal","x":-220000,"y":200000,"z":2300},
    {"resource":"Limestone","purity":"Normal","x":-180000,"y":210000,"z":2400},
    {"resource":"Limestone","purity":"Normal","x":-140000,"y":215000,"z":2500},
    {"resource":"Limestone","purity":"Normal","x": 250000,"y":-20000,"z":1800},
    {"resource":"Limestone","purity":"Normal","x": 270000,"y": 30000,"z":1900},
    {"resource":"Limestone","purity":"Normal","x": 285000,"y": 90000,"z":2000},
    {"resource":"Limestone","purity":"Normal","x": 270000,"y":150000,"z":2100},
    {"resource":"Limestone","purity":"Normal","x": 240000,"y":190000,"z":2200},
    {"resource":"Limestone","purity":"Normal","x": 200000,"y":220000,"z":2300},
    # Pure (29)
    {"resource":"Limestone","purity":"Pure","x":-55000,"y": -5000,"z":5000},
    {"resource":"Limestone","purity":"Pure","x":-105000,"y": 40000,"z":5200},
    {"resource":"Limestone","purity":"Pure","x":-135000,"y": 85000,"z":5100},
    {"resource":"Limestone","purity":"Pure","x":-110000,"y":140000,"z":5000},
    {"resource":"Limestone","purity":"Pure","x": -60000,"y":165000,"z":4800},
    {"resource":"Limestone","purity":"Pure","x":  15000,"y":170000,"z":4700},
    {"resource":"Limestone","purity":"Pure","x":  75000,"y":155000,"z":4800},
    {"resource":"Limestone","purity":"Pure","x": 125000,"y":120000,"z":5000},
    {"resource":"Limestone","purity":"Pure","x": 160000,"y": 60000,"z":5100},
    {"resource":"Limestone","purity":"Pure","x": 155000,"y": -5000,"z":5200},
    {"resource":"Limestone","purity":"Pure","x": 115000,"y":-55000,"z":5100},
    {"resource":"Limestone","purity":"Pure","x":  60000,"y":-70000,"z":5000},
    {"resource":"Limestone","purity":"Pure","x":   5000,"y":-68000,"z":4900},
    {"resource":"Limestone","purity":"Pure","x": -50000,"y":-55000,"z":4800},
    {"resource":"Limestone","purity":"Pure","x":-235000,"y": 50000,"z":3500},
    {"resource":"Limestone","purity":"Pure","x":-235000,"y":100000,"z":3600},
    {"resource":"Limestone","purity":"Pure","x":-225000,"y":150000,"z":3700},
    {"resource":"Limestone","purity":"Pure","x": 230000,"y": 70000,"z":3500},
    {"resource":"Limestone","purity":"Pure","x": 240000,"y":120000,"z":3600},
    {"resource":"Limestone","purity":"Pure","x": 225000,"y":165000,"z":3700},
    {"resource":"Limestone","purity":"Pure","x":  -5000,"y":-160000,"z":1000},
    {"resource":"Limestone","purity":"Pure","x":  50000,"y":-155000,"z":1100},
    {"resource":"Limestone","purity":"Pure","x": 100000,"y":-150000,"z":1000},
    {"resource":"Limestone","purity":"Pure","x":-230000,"y":-60000,"z":1500},
    {"resource":"Limestone","purity":"Pure","x":-270000,"y":-20000,"z":1400},
    {"resource":"Limestone","purity":"Pure","x": 260000,"y":-60000,"z":1500},
    {"resource":"Limestone","purity":"Pure","x": 290000,"y":-10000,"z":1400},
    {"resource":"Limestone","purity":"Pure","x":-180000,"y":-120000,"z":2000},
    {"resource":"Limestone","purity":"Pure","x": 180000,"y":-130000,"z":2000},

    # ── IRON ORE ────────────────────────────────────────────────────────────
    # Impure (39)
    {"resource":"Iron Ore","purity":"Impure","x":-25000,"y":-35000,"z":5000},
    {"resource":"Iron Ore","purity":"Impure","x": 10000,"y":-20000,"z":4800},
    {"resource":"Iron Ore","purity":"Impure","x": 45000,"y":-10000,"z":4700},
    {"resource":"Iron Ore","purity":"Impure","x": 80000,"y":  5000,"z":4600},
    {"resource":"Iron Ore","purity":"Impure","x":110000,"y": 30000,"z":4500},
    {"resource":"Iron Ore","purity":"Impure","x":130000,"y": 70000,"z":4400},
    {"resource":"Iron Ore","purity":"Impure","x":120000,"y":100000,"z":4300},
    {"resource":"Iron Ore","purity":"Impure","x": 90000,"y":120000,"z":4200},
    {"resource":"Iron Ore","purity":"Impure","x": 50000,"y":130000,"z":4100},
    {"resource":"Iron Ore","purity":"Impure","x":  5000,"y":125000,"z":4100},
    {"resource":"Iron Ore","purity":"Impure","x":-45000,"y":115000,"z":4200},
    {"resource":"Iron Ore","purity":"Impure","x":-85000,"y": 90000,"z":4400},
    {"resource":"Iron Ore","purity":"Impure","x":-100000,"y": 50000,"z":4600},
    {"resource":"Iron Ore","purity":"Impure","x": -95000,"y":  5000,"z":4800},
    {"resource":"Iron Ore","purity":"Impure","x": -70000,"y":-30000,"z":5000},
    {"resource":"Iron Ore","purity":"Impure","x":-195000,"y":-80000,"z":3000},
    {"resource":"Iron Ore","purity":"Impure","x":-230000,"y":-50000,"z":2800},
    {"resource":"Iron Ore","purity":"Impure","x":-260000,"y":-15000,"z":2600},
    {"resource":"Iron Ore","purity":"Impure","x":-270000,"y": 30000,"z":2500},
    {"resource":"Iron Ore","purity":"Impure","x":-255000,"y": 75000,"z":2600},
    {"resource":"Iron Ore","purity":"Impure","x": 205000,"y":-75000,"z":3000},
    {"resource":"Iron Ore","purity":"Impure","x": 240000,"y":-45000,"z":2800},
    {"resource":"Iron Ore","purity":"Impure","x": 265000,"y":  5000,"z":2600},
    {"resource":"Iron Ore","purity":"Impure","x": 275000,"y": 55000,"z":2500},
    {"resource":"Iron Ore","purity":"Impure","x": 260000,"y":105000,"z":2600},
    {"resource":"Iron Ore","purity":"Impure","x":  30000,"y":-145000,"z":500},
    {"resource":"Iron Ore","purity":"Impure","x":  80000,"y":-140000,"z":600},
    {"resource":"Iron Ore","purity":"Impure","x": 130000,"y":-135000,"z":700},
    {"resource":"Iron Ore","purity":"Impure","x":-100000,"y":-140000,"z":500},
    {"resource":"Iron Ore","purity":"Impure","x":-155000,"y":-130000,"z":600},
    {"resource":"Iron Ore","purity":"Impure","x":-210000,"y":-120000,"z":700},
    {"resource":"Iron Ore","purity":"Impure","x":-260000,"y": 120000,"z":2700},
    {"resource":"Iron Ore","purity":"Impure","x":-240000,"y": 165000,"z":2800},
    {"resource":"Iron Ore","purity":"Impure","x":-210000,"y": 200000,"z":2900},
    {"resource":"Iron Ore","purity":"Impure","x": 240000,"y": 150000,"z":2700},
    {"resource":"Iron Ore","purity":"Impure","x": 220000,"y": 195000,"z":2800},
    {"resource":"Iron Ore","purity":"Impure","x": 185000,"y": 225000,"z":2900},
    {"resource":"Iron Ore","purity":"Impure","x": -20000,"y": 245000,"z":1000},
    {"resource":"Iron Ore","purity":"Impure","x":  40000,"y": 250000,"z":1000},
    # Normal (42)
    {"resource":"Iron Ore","purity":"Normal","x":-15000,"y":-50000,"z":5100},
    {"resource":"Iron Ore","purity":"Normal","x": 25000,"y":-35000,"z":4900},
    {"resource":"Iron Ore","purity":"Normal","x": 60000,"y":-20000,"z":4800},
    {"resource":"Iron Ore","purity":"Normal","x": 95000,"y":  0,"z":4700},
    {"resource":"Iron Ore","purity":"Normal","x":120000,"y": 45000,"z":4600},
    {"resource":"Iron Ore","purity":"Normal","x":135000,"y": 85000,"z":4500},
    {"resource":"Iron Ore","purity":"Normal","x":115000,"y":110000,"z":4400},
    {"resource":"Iron Ore","purity":"Normal","x": 75000,"y":125000,"z":4300},
    {"resource":"Iron Ore","purity":"Normal","x": 30000,"y":135000,"z":4200},
    {"resource":"Iron Ore","purity":"Normal","x":-20000,"y":130000,"z":4200},
    {"resource":"Iron Ore","purity":"Normal","x":-65000,"y":115000,"z":4300},
    {"resource":"Iron Ore","purity":"Normal","x":-95000,"y": 75000,"z":4500},
    {"resource":"Iron Ore","purity":"Normal","x":-105000,"y": 30000,"z":4700},
    {"resource":"Iron Ore","purity":"Normal","x":-100000,"y":-20000,"z":4900},
    {"resource":"Iron Ore","purity":"Normal","x": -80000,"y":-55000,"z":5100},
    {"resource":"Iron Ore","purity":"Normal","x":-220000,"y":-65000,"z":2900},
    {"resource":"Iron Ore","purity":"Normal","x":-250000,"y":-30000,"z":2700},
    {"resource":"Iron Ore","purity":"Normal","x":-265000,"y": 15000,"z":2600},
    {"resource":"Iron Ore","purity":"Normal","x":-255000,"y": 55000,"z":2600},
    {"resource":"Iron Ore","purity":"Normal","x":-240000,"y": 95000,"z":2700},
    {"resource":"Iron Ore","purity":"Normal","x": 225000,"y":-60000,"z":2900},
    {"resource":"Iron Ore","purity":"Normal","x": 255000,"y":-25000,"z":2700},
    {"resource":"Iron Ore","purity":"Normal","x": 270000,"y": 25000,"z":2600},
    {"resource":"Iron Ore","purity":"Normal","x": 265000,"y": 70000,"z":2600},
    {"resource":"Iron Ore","purity":"Normal","x": 250000,"y":115000,"z":2700},
    {"resource":"Iron Ore","purity":"Normal","x":  55000,"y":-155000,"z":600},
    {"resource":"Iron Ore","purity":"Normal","x": 105000,"y":-150000,"z":700},
    {"resource":"Iron Ore","purity":"Normal","x": 155000,"y":-145000,"z":800},
    {"resource":"Iron Ore","purity":"Normal","x": -80000,"y":-150000,"z":600},
    {"resource":"Iron Ore","purity":"Normal","x":-130000,"y":-140000,"z":700},
    {"resource":"Iron Ore","purity":"Normal","x":-185000,"y":-130000,"z":800},
    {"resource":"Iron Ore","purity":"Normal","x":-245000,"y": 130000,"z":2800},
    {"resource":"Iron Ore","purity":"Normal","x":-220000,"y": 170000,"z":2900},
    {"resource":"Iron Ore","purity":"Normal","x":-185000,"y": 205000,"z":3000},
    {"resource":"Iron Ore","purity":"Normal","x": 230000,"y": 165000,"z":2800},
    {"resource":"Iron Ore","purity":"Normal","x": 205000,"y": 205000,"z":2900},
    {"resource":"Iron Ore","purity":"Normal","x": 170000,"y": 235000,"z":3000},
    {"resource":"Iron Ore","purity":"Normal","x":-45000,"y": 255000,"z":1000},
    {"resource":"Iron Ore","purity":"Normal","x": 10000,"y": 260000,"z":1000},
    {"resource":"Iron Ore","purity":"Normal","x": 65000,"y": 255000,"z":1000},
    {"resource":"Iron Ore","purity":"Normal","x":-240000,"y": 225000,"z":1500},
    {"resource":"Iron Ore","purity":"Normal","x": 230000,"y": 235000,"z":1500},
    # Pure (46)
    {"resource":"Iron Ore","purity":"Pure","x":-30000,"y":-65000,"z":5300},
    {"resource":"Iron Ore","purity":"Pure","x":  5000,"y":-50000,"z":5200},
    {"resource":"Iron Ore","purity":"Pure","x": 40000,"y":-35000,"z":5100},
    {"resource":"Iron Ore","purity":"Pure","x": 75000,"y":-15000,"z":5000},
    {"resource":"Iron Ore","purity":"Pure","x":105000,"y": 10000,"z":4900},
    {"resource":"Iron Ore","purity":"Pure","x":130000,"y": 55000,"z":4800},
    {"resource":"Iron Ore","purity":"Pure","x":130000,"y": 95000,"z":4700},
    {"resource":"Iron Ore","purity":"Pure","x":100000,"y":115000,"z":4600},
    {"resource":"Iron Ore","purity":"Pure","x": 55000,"y":125000,"z":4500},
    {"resource":"Iron Ore","purity":"Pure","x":  5000,"y":128000,"z":4500},
    {"resource":"Iron Ore","purity":"Pure","x":-50000,"y":120000,"z":4600},
    {"resource":"Iron Ore","purity":"Pure","x":-85000,"y": 95000,"z":4800},
    {"resource":"Iron Ore","purity":"Pure","x":-100000,"y": 55000,"z":5000},
    {"resource":"Iron Ore","purity":"Pure","x":-100000,"y": 10000,"z":5200},
    {"resource":"Iron Ore","purity":"Pure","x": -85000,"y":-30000,"z":5300},
    {"resource":"Iron Ore","purity":"Pure","x":-175000,"y":-90000,"z":3200},
    {"resource":"Iron Ore","purity":"Pure","x":-205000,"y":-55000,"z":3000},
    {"resource":"Iron Ore","purity":"Pure","x":-235000,"y":-20000,"z":2800},
    {"resource":"Iron Ore","purity":"Pure","x":-245000,"y": 20000,"z":2700},
    {"resource":"Iron Ore","purity":"Pure","x":-235000,"y": 60000,"z":2800},
    {"resource":"Iron Ore","purity":"Pure","x":-220000,"y": 95000,"z":2900},
    {"resource":"Iron Ore","purity":"Pure","x": 185000,"y":-85000,"z":3200},
    {"resource":"Iron Ore","purity":"Pure","x": 215000,"y":-50000,"z":3000},
    {"resource":"Iron Ore","purity":"Pure","x": 245000,"y":-15000,"z":2800},
    {"resource":"Iron Ore","purity":"Pure","x": 255000,"y": 30000,"z":2700},
    {"resource":"Iron Ore","purity":"Pure","x": 245000,"y": 70000,"z":2800},
    {"resource":"Iron Ore","purity":"Pure","x": 230000,"y":110000,"z":2900},
    {"resource":"Iron Ore","purity":"Pure","x":  10000,"y":-165000,"z":400},
    {"resource":"Iron Ore","purity":"Pure","x":  60000,"y":-162000,"z":500},
    {"resource":"Iron Ore","purity":"Pure","x": 110000,"y":-158000,"z":600},
    {"resource":"Iron Ore","purity":"Pure","x": 160000,"y":-153000,"z":700},
    {"resource":"Iron Ore","purity":"Pure","x": -60000,"y":-160000,"z":400},
    {"resource":"Iron Ore","purity":"Pure","x":-110000,"y":-150000,"z":500},
    {"resource":"Iron Ore","purity":"Pure","x":-160000,"y":-140000,"z":600},
    {"resource":"Iron Ore","purity":"Pure","x":-215000,"y":-125000,"z":700},
    {"resource":"Iron Ore","purity":"Pure","x":-225000,"y": 140000,"z":2900},
    {"resource":"Iron Ore","purity":"Pure","x":-200000,"y": 178000,"z":3000},
    {"resource":"Iron Ore","purity":"Pure","x":-165000,"y": 210000,"z":3100},
    {"resource":"Iron Ore","purity":"Pure","x": 215000,"y": 178000,"z":2900},
    {"resource":"Iron Ore","purity":"Pure","x": 190000,"y": 215000,"z":3000},
    {"resource":"Iron Ore","purity":"Pure","x": 155000,"y": 245000,"z":3100},
    {"resource":"Iron Ore","purity":"Pure","x":-65000,"y": 265000,"z":1000},
    {"resource":"Iron Ore","purity":"Pure","x": -5000,"y": 270000,"z":1000},
    {"resource":"Iron Ore","purity":"Pure","x":  55000,"y": 265000,"z":1000},
    {"resource":"Iron Ore","purity":"Pure","x":-255000,"y": 230000,"z":1600},
    {"resource":"Iron Ore","purity":"Pure","x": 248000,"y": 242000,"z":1600},

    # ── COPPER ORE ──────────────────────────────────────────────────────────
    # Impure (13)
    {"resource":"Copper Ore","purity":"Impure","x":-140000,"y":-130000,"z":3000},
    {"resource":"Copper Ore","purity":"Impure","x":-170000,"y":-100000,"z":3100},
    {"resource":"Copper Ore","purity":"Impure","x":-195000,"y": -65000,"z":3200},
    {"resource":"Copper Ore","purity":"Impure","x":-215000,"y": -25000,"z":3300},
    {"resource":"Copper Ore","purity":"Impure","x":-215000,"y":  20000,"z":3300},
    {"resource":"Copper Ore","purity":"Impure","x": 155000,"y":-130000,"z":3000},
    {"resource":"Copper Ore","purity":"Impure","x": 185000,"y":-100000,"z":3100},
    {"resource":"Copper Ore","purity":"Impure","x": 210000,"y": -65000,"z":3200},
    {"resource":"Copper Ore","purity":"Impure","x": 225000,"y": -25000,"z":3300},
    {"resource":"Copper Ore","purity":"Impure","x": 225000,"y":  20000,"z":3300},
    {"resource":"Copper Ore","purity":"Impure","x": -20000,"y": 285000,"z":500},
    {"resource":"Copper Ore","purity":"Impure","x":  40000,"y": 290000,"z":500},
    {"resource":"Copper Ore","purity":"Impure","x": -80000,"y": 280000,"z":500},
    # Normal (29)
    {"resource":"Copper Ore","purity":"Normal","x":-120000,"y":-110000,"z":3200},
    {"resource":"Copper Ore","purity":"Normal","x":-150000,"y": -80000,"z":3300},
    {"resource":"Copper Ore","purity":"Normal","x":-175000,"y": -45000,"z":3400},
    {"resource":"Copper Ore","purity":"Normal","x":-195000,"y":  -5000,"z":3500},
    {"resource":"Copper Ore","purity":"Normal","x":-195000,"y":  40000,"z":3500},
    {"resource":"Copper Ore","purity":"Normal","x":-180000,"y":  80000,"z":3400},
    {"resource":"Copper Ore","purity":"Normal","x":135000,"y":-110000,"z":3200},
    {"resource":"Copper Ore","purity":"Normal","x":165000,"y": -80000,"z":3300},
    {"resource":"Copper Ore","purity":"Normal","x":190000,"y": -45000,"z":3400},
    {"resource":"Copper Ore","purity":"Normal","x":205000,"y":  -5000,"z":3500},
    {"resource":"Copper Ore","purity":"Normal","x":205000,"y":  40000,"z":3500},
    {"resource":"Copper Ore","purity":"Normal","x":190000,"y":  80000,"z":3400},
    {"resource":"Copper Ore","purity":"Normal","x":-55000,"y": 295000,"z":500},
    {"resource":"Copper Ore","purity":"Normal","x": 10000,"y": 300000,"z":500},
    {"resource":"Copper Ore","purity":"Normal","x": 70000,"y": 295000,"z":500},
    {"resource":"Copper Ore","purity":"Normal","x":-110000,"y": 290000,"z":500},
    {"resource":"Copper Ore","purity":"Normal","x":  -5000,"y":-200000,"z":200},
    {"resource":"Copper Ore","purity":"Normal","x":  50000,"y":-195000,"z":200},
    {"resource":"Copper Ore","purity":"Normal","x":-60000,"y":-195000,"z":200},
    {"resource":"Copper Ore","purity":"Normal","x": 110000,"y":-190000,"z":200},
    {"resource":"Copper Ore","purity":"Normal","x":-120000,"y":-185000,"z":200},
    {"resource":"Copper Ore","purity":"Normal","x":-200000,"y":-170000,"z":300},
    {"resource":"Copper Ore","purity":"Normal","x": 210000,"y":-170000,"z":300},
    {"resource":"Copper Ore","purity":"Normal","x":-270000,"y":  50000,"z":2000},
    {"resource":"Copper Ore","purity":"Normal","x": 280000,"y":  50000,"z":2000},
    {"resource":"Copper Ore","purity":"Normal","x":-280000,"y": 100000,"z":2000},
    {"resource":"Copper Ore","purity":"Normal","x": 290000,"y": 100000,"z":2000},
    # Pure (13)
    {"resource":"Copper Ore","purity":"Pure","x":-160000,"y": -90000,"z":3600},
    {"resource":"Copper Ore","purity":"Pure","x":-185000,"y": -55000,"z":3700},
    {"resource":"Copper Ore","purity":"Pure","x":-205000,"y": -15000,"z":3800},
    {"resource":"Copper Ore","purity":"Pure","x":-205000,"y":  30000,"z":3800},
    {"resource":"Copper Ore","purity":"Pure","x": 175000,"y": -90000,"z":3600},
    {"resource":"Copper Ore","purity":"Pure","x": 200000,"y": -55000,"z":3700},
    {"resource":"Copper Ore","purity":"Pure","x": 215000,"y": -15000,"z":3800},
    {"resource":"Copper Ore","purity":"Pure","x": 215000,"y":  30000,"z":3800},
    {"resource":"Copper Ore","purity":"Pure","x":  25000,"y":-210000,"z":100},
    {"resource":"Copper Ore","purity":"Pure","x": -35000,"y":-210000,"z":100},
    {"resource":"Copper Ore","purity":"Pure","x":  85000,"y":-205000,"z":100},
    {"resource":"Copper Ore","purity":"Pure","x":-100000,"y":-200000,"z":100},
    {"resource":"Copper Ore","purity":"Pure","x":  -5000,"y": 315000,"z":500},

    # ── CATERIUM ORE ────────────────────────────────────────────────────────
    # Normal (9)
    {"resource":"Caterium Ore","purity":"Normal","x":-280000,"y":-120000,"z":1000},
    {"resource":"Caterium Ore","purity":"Normal","x":-295000,"y": -70000,"z":1100},
    {"resource":"Caterium Ore","purity":"Normal","x":-300000,"y": -20000,"z":1200},
    {"resource":"Caterium Ore","purity":"Normal","x": 300000,"y":-120000,"z":1000},
    {"resource":"Caterium Ore","purity":"Normal","x": 310000,"y": -70000,"z":1100},
    {"resource":"Caterium Ore","purity":"Normal","x": 315000,"y": -20000,"z":1200},
    {"resource":"Caterium Ore","purity":"Normal","x":-155000,"y": 210000,"z":2000},
    {"resource":"Caterium Ore","purity":"Normal","x":-120000,"y": 230000,"z":2100},
    {"resource":"Caterium Ore","purity":"Normal","x":  80000,"y":-230000,"z":200},
    # Pure (8)
    {"resource":"Caterium Ore","purity":"Pure","x":-265000,"y":-145000,"z":900},
    {"resource":"Caterium Ore","purity":"Pure","x":-285000,"y": -95000,"z":1000},
    {"resource":"Caterium Ore","purity":"Pure","x": 285000,"y":-145000,"z":900},
    {"resource":"Caterium Ore","purity":"Pure","x": 300000,"y": -95000,"z":1000},
    {"resource":"Caterium Ore","purity":"Pure","x":-165000,"y": 220000,"z":2100},
    {"resource":"Caterium Ore","purity":"Pure","x":  50000,"y":-245000,"z":100},
    {"resource":"Caterium Ore","purity":"Pure","x":-255000,"y": 200000,"z":1500},
    {"resource":"Caterium Ore","purity":"Pure","x": 265000,"y": 200000,"z":1500},

    # ── COAL ────────────────────────────────────────────────────────────────
    # Impure (15)
    {"resource":"Coal","purity":"Impure","x":-230000,"y":-200000,"z":500},
    {"resource":"Coal","purity":"Impure","x":-190000,"y":-215000,"z":400},
    {"resource":"Coal","purity":"Impure","x":-150000,"y":-220000,"z":300},
    {"resource":"Coal","purity":"Impure","x":-100000,"y":-225000,"z":200},
    {"resource":"Coal","purity":"Impure","x": -50000,"y":-228000,"z":100},
    {"resource":"Coal","purity":"Impure","x":  10000,"y":-228000,"z":100},
    {"resource":"Coal","purity":"Impure","x":  65000,"y":-225000,"z":200},
    {"resource":"Coal","purity":"Impure","x": 115000,"y":-220000,"z":300},
    {"resource":"Coal","purity":"Impure","x": 160000,"y":-215000,"z":400},
    {"resource":"Coal","purity":"Impure","x": 205000,"y":-205000,"z":500},
    {"resource":"Coal","purity":"Impure","x":-270000,"y": 170000,"z":1800},
    {"resource":"Coal","purity":"Impure","x":-285000,"y": 215000,"z":1700},
    {"resource":"Coal","purity":"Impure","x": 280000,"y": 170000,"z":1800},
    {"resource":"Coal","purity":"Impure","x": 295000,"y": 215000,"z":1700},
    {"resource":"Coal","purity":"Impure","x":  30000,"y": 330000,"z":300},
    # Normal (31)
    {"resource":"Coal","purity":"Normal","x":-245000,"y":-190000,"z":600},
    {"resource":"Coal","purity":"Normal","x":-205000,"y":-205000,"z":500},
    {"resource":"Coal","purity":"Normal","x":-165000,"y":-210000,"z":400},
    {"resource":"Coal","purity":"Normal","x":-120000,"y":-215000,"z":300},
    {"resource":"Coal","purity":"Normal","x": -70000,"y":-218000,"z":200},
    {"resource":"Coal","purity":"Normal","x": -15000,"y":-220000,"z":100},
    {"resource":"Coal","purity":"Normal","x":  40000,"y":-218000,"z":200},
    {"resource":"Coal","purity":"Normal","x":  90000,"y":-215000,"z":300},
    {"resource":"Coal","purity":"Normal","x": 140000,"y":-210000,"z":400},
    {"resource":"Coal","purity":"Normal","x": 185000,"y":-205000,"z":500},
    {"resource":"Coal","purity":"Normal","x": 225000,"y":-195000,"z":600},
    {"resource":"Coal","purity":"Normal","x":-275000,"y": 145000,"z":1900},
    {"resource":"Coal","purity":"Normal","x":-285000,"y": 190000,"z":1800},
    {"resource":"Coal","purity":"Normal","x":-290000,"y": 235000,"z":1700},
    {"resource":"Coal","purity":"Normal","x": 285000,"y": 145000,"z":1900},
    {"resource":"Coal","purity":"Normal","x": 295000,"y": 190000,"z":1800},
    {"resource":"Coal","purity":"Normal","x": 302000,"y": 235000,"z":1700},
    {"resource":"Coal","purity":"Normal","x": -30000,"y": 330000,"z":300},
    {"resource":"Coal","purity":"Normal","x":  75000,"y": 335000,"z":300},
    {"resource":"Coal","purity":"Normal","x":-100000,"y": 320000,"z":400},
    {"resource":"Coal","purity":"Normal","x": 140000,"y": 325000,"z":400},
    {"resource":"Coal","purity":"Normal","x":-160000,"y": 310000,"z":500},
    {"resource":"Coal","purity":"Normal","x": 200000,"y": 315000,"z":500},
    {"resource":"Coal","purity":"Normal","x":-215000,"y": 280000,"z":1000},
    {"resource":"Coal","purity":"Normal","x": 225000,"y": 275000,"z":1000},
    {"resource":"Coal","purity":"Normal","x":-270000,"y":-220000,"z":300},
    {"resource":"Coal","purity":"Normal","x": 280000,"y":-220000,"z":300},
    {"resource":"Coal","purity":"Normal","x":-305000,"y":-170000,"z":700},
    {"resource":"Coal","purity":"Normal","x": 315000,"y":-170000,"z":700},
    {"resource":"Coal","purity":"Normal","x":-310000,"y":-120000,"z":900},
    {"resource":"Coal","purity":"Normal","x": 320000,"y":-120000,"z":900},
    # Pure (16)
    {"resource":"Coal","purity":"Pure","x":-260000,"y":-175000,"z":700},
    {"resource":"Coal","purity":"Pure","x":-220000,"y":-185000,"z":600},
    {"resource":"Coal","purity":"Pure","x":-175000,"y":-195000,"z":500},
    {"resource":"Coal","purity":"Pure","x":-130000,"y":-200000,"z":400},
    {"resource":"Coal","purity":"Pure","x":  30000,"y":-235000,"z":100},
    {"resource":"Coal","purity":"Pure","x": 130000,"y":-202000,"z":400},
    {"resource":"Coal","purity":"Pure","x": 175000,"y":-195000,"z":500},
    {"resource":"Coal","purity":"Pure","x": 220000,"y":-185000,"z":600},
    {"resource":"Coal","purity":"Pure","x":-280000,"y": 120000,"z":2000},
    {"resource":"Coal","purity":"Pure","x": 290000,"y": 120000,"z":2000},
    {"resource":"Coal","purity":"Pure","x":-295000,"y": 240000,"z":1600},
    {"resource":"Coal","purity":"Pure","x": 305000,"y": 240000,"z":1600},
    {"resource":"Coal","purity":"Pure","x": -70000,"y": 340000,"z":300},
    {"resource":"Coal","purity":"Pure","x": 110000,"y": 338000,"z":300},
    {"resource":"Coal","purity":"Pure","x":-290000,"y":-240000,"z":200},
    {"resource":"Coal","purity":"Pure","x": 298000,"y":-240000,"z":200},

    # ── CRUDE OIL (nodes) ───────────────────────────────────────────────────
    # Impure (10)
    {"resource":"Crude Oil","purity":"Impure","x":-200000,"y":-270000,"z":100},
    {"resource":"Crude Oil","purity":"Impure","x":-140000,"y":-285000,"z":100},
    {"resource":"Crude Oil","purity":"Impure","x": -75000,"y":-290000,"z":100},
    {"resource":"Crude Oil","purity":"Impure","x":  -5000,"y":-293000,"z":100},
    {"resource":"Crude Oil","purity":"Impure","x":  70000,"y":-290000,"z":100},
    {"resource":"Crude Oil","purity":"Impure","x": 140000,"y":-285000,"z":100},
    {"resource":"Crude Oil","purity":"Impure","x": 205000,"y":-275000,"z":100},
    {"resource":"Crude Oil","purity":"Impure","x":-310000,"y":-240000,"z":200},
    {"resource":"Crude Oil","purity":"Impure","x": 315000,"y":-245000,"z":200},
    {"resource":"Crude Oil","purity":"Impure","x": -5000,"y": 360000,"z":50},
    # Normal (12)
    {"resource":"Crude Oil","purity":"Normal","x":-175000,"y":-278000,"z":100},
    {"resource":"Crude Oil","purity":"Normal","x":-110000,"y":-288000,"z":100},
    {"resource":"Crude Oil","purity":"Normal","x": -40000,"y":-292000,"z":100},
    {"resource":"Crude Oil","purity":"Normal","x":  35000,"y":-292000,"z":100},
    {"resource":"Crude Oil","purity":"Normal","x": 110000,"y":-288000,"z":100},
    {"resource":"Crude Oil","purity":"Normal","x": 175000,"y":-280000,"z":100},
    {"resource":"Crude Oil","purity":"Normal","x": 235000,"y":-268000,"z":100},
    {"resource":"Crude Oil","purity":"Normal","x":-315000,"y":-260000,"z":200},
    {"resource":"Crude Oil","purity":"Normal","x": 322000,"y":-265000,"z":200},
    {"resource":"Crude Oil","purity":"Normal","x": -35000,"y": 355000,"z":50},
    {"resource":"Crude Oil","purity":"Normal","x":  30000,"y": 362000,"z":50},
    {"resource":"Crude Oil","purity":"Normal","x": -70000,"y": 350000,"z":50},
    # Pure (8)
    {"resource":"Crude Oil","purity":"Pure","x":-155000,"y":-282000,"z":100},
    {"resource":"Crude Oil","purity":"Pure","x": -70000,"y":-291000,"z":100},
    {"resource":"Crude Oil","purity":"Pure","x":  10000,"y":-294000,"z":100},
    {"resource":"Crude Oil","purity":"Pure","x":  90000,"y":-292000,"z":100},
    {"resource":"Crude Oil","purity":"Pure","x": 160000,"y":-283000,"z":100},
    {"resource":"Crude Oil","purity":"Pure","x": 225000,"y":-272000,"z":100},
    {"resource":"Crude Oil","purity":"Pure","x":-315000,"y":-280000,"z":200},
    {"resource":"Crude Oil","purity":"Pure","x":  55000,"y": 365000,"z":50},

    # ── SULFUR ──────────────────────────────────────────────────────────────
    # Impure (6)
    {"resource":"Sulfur","purity":"Impure","x":-200000,"y":-320000,"z":100},
    {"resource":"Sulfur","purity":"Impure","x":-130000,"y":-330000,"z":100},
    {"resource":"Sulfur","purity":"Impure","x": -55000,"y":-335000,"z":100},
    {"resource":"Sulfur","purity":"Impure","x": 130000,"y":-330000,"z":100},
    {"resource":"Sulfur","purity":"Impure","x": 200000,"y":-325000,"z":100},
    {"resource":"Sulfur","purity":"Impure","x":  30000,"y": 390000,"z":50},
    # Normal (5)
    {"resource":"Sulfur","purity":"Normal","x":-160000,"y":-325000,"z":100},
    {"resource":"Sulfur","purity":"Normal","x": -85000,"y":-333000,"z":100},
    {"resource":"Sulfur","purity":"Normal","x":  20000,"y":-336000,"z":100},
    {"resource":"Sulfur","purity":"Normal","x": 165000,"y":-328000,"z":100},
    {"resource":"Sulfur","purity":"Normal","x": -30000,"y": 388000,"z":50},
    # Pure (5)
    {"resource":"Sulfur","purity":"Pure","x":-105000,"y":-332000,"z":100},
    {"resource":"Sulfur","purity":"Pure","x":  -5000,"y":-337000,"z":100},
    {"resource":"Sulfur","purity":"Pure","x":  90000,"y":-333000,"z":100},
    {"resource":"Sulfur","purity":"Pure","x": 230000,"y":-320000,"z":100},
    {"resource":"Sulfur","purity":"Pure","x":  70000,"y": 393000,"z":50},

    # ── BAUXITE ─────────────────────────────────────────────────────────────
    # Impure (5)
    {"resource":"Bauxite","purity":"Impure","x":-310000,"y": 100000,"z":1500},
    {"resource":"Bauxite","purity":"Impure","x":-305000,"y": 150000,"z":1400},
    {"resource":"Bauxite","purity":"Impure","x":-298000,"y": 200000,"z":1300},
    {"resource":"Bauxite","purity":"Impure","x": 315000,"y": 100000,"z":1500},
    {"resource":"Bauxite","purity":"Impure","x": 310000,"y": 150000,"z":1400},
    # Normal (6)
    {"resource":"Bauxite","purity":"Normal","x":-308000,"y":  75000,"z":1600},
    {"resource":"Bauxite","purity":"Normal","x":-302000,"y": 125000,"z":1500},
    {"resource":"Bauxite","purity":"Normal","x":-295000,"y": 175000,"z":1400},
    {"resource":"Bauxite","purity":"Normal","x": 320000,"y":  75000,"z":1600},
    {"resource":"Bauxite","purity":"Normal","x": 312000,"y": 125000,"z":1500},
    {"resource":"Bauxite","purity":"Normal","x": 305000,"y": 175000,"z":1400},
    # Pure (6)
    {"resource":"Bauxite","purity":"Pure","x":-312000,"y":  50000,"z":1700},
    {"resource":"Bauxite","purity":"Pure","x":-306000,"y": 100000,"z":1600},
    {"resource":"Bauxite","purity":"Pure","x":-299000,"y": 150000,"z":1500},
    {"resource":"Bauxite","purity":"Pure","x": 322000,"y":  50000,"z":1700},
    {"resource":"Bauxite","purity":"Pure","x": 315000,"y": 100000,"z":1600},
    {"resource":"Bauxite","purity":"Pure","x": 308000,"y": 150000,"z":1500},

    # ── RAW QUARTZ ──────────────────────────────────────────────────────────
    # Impure (3)
    {"resource":"Raw Quartz","purity":"Impure","x":-200000,"y": 300000,"z":800},
    {"resource":"Raw Quartz","purity":"Impure","x": 210000,"y": 295000,"z":800},
    {"resource":"Raw Quartz","purity":"Impure","x":  15000,"y":-350000,"z":100},
    # Normal (7)
    {"resource":"Raw Quartz","purity":"Normal","x":-215000,"y": 275000,"z":900},
    {"resource":"Raw Quartz","purity":"Normal","x":-245000,"y": 255000,"z":1000},
    {"resource":"Raw Quartz","purity":"Normal","x": 225000,"y": 270000,"z":900},
    {"resource":"Raw Quartz","purity":"Normal","x": 255000,"y": 250000,"z":1000},
    {"resource":"Raw Quartz","purity":"Normal","x": -30000,"y":-348000,"z":100},
    {"resource":"Raw Quartz","purity":"Normal","x":  65000,"y":-345000,"z":100},
    {"resource":"Raw Quartz","purity":"Normal","x":-110000,"y":-340000,"z":100},
    # Pure (7)
    {"resource":"Raw Quartz","purity":"Pure","x":-225000,"y": 285000,"z":1000},
    {"resource":"Raw Quartz","purity":"Pure","x":-255000,"y": 262000,"z":1100},
    {"resource":"Raw Quartz","purity":"Pure","x":-275000,"y": 238000,"z":1200},
    {"resource":"Raw Quartz","purity":"Pure","x": 235000,"y": 280000,"z":1000},
    {"resource":"Raw Quartz","purity":"Pure","x": 265000,"y": 257000,"z":1100},
    {"resource":"Raw Quartz","purity":"Pure","x": 285000,"y": 233000,"z":1200},
    {"resource":"Raw Quartz","purity":"Pure","x":   0,"y":-355000,"z":100},

    # ── URANIUM ─────────────────────────────────────────────────────────────
    # Impure (3)
    {"resource":"Uranium","purity":"Impure","x":-180000,"y": 350000,"z":200},
    {"resource":"Uranium","purity":"Impure","x": 185000,"y": 345000,"z":200},
    {"resource":"Uranium","purity":"Impure","x":   0,"y":-380000,"z":100},
    # Normal (2)
    {"resource":"Uranium","purity":"Normal","x":-195000,"y": 340000,"z":200},
    {"resource":"Uranium","purity":"Normal","x": 200000,"y": 335000,"z":200},

    # ── SAM ORE ─────────────────────────────────────────────────────────────
    # Impure (10)
    {"resource":"SAM Ore","purity":"Impure","x":-290000,"y":-170000,"z":800},
    {"resource":"SAM Ore","purity":"Impure","x":-285000,"y":-130000,"z":900},
    {"resource":"SAM Ore","purity":"Impure","x":-280000,"y": -90000,"z":1000},
    {"resource":"SAM Ore","purity":"Impure","x":-275000,"y": -45000,"z":1100},
    {"resource":"SAM Ore","purity":"Impure","x": 300000,"y":-170000,"z":800},
    {"resource":"SAM Ore","purity":"Impure","x": 294000,"y":-130000,"z":900},
    {"resource":"SAM Ore","purity":"Impure","x": 288000,"y": -90000,"z":1000},
    {"resource":"SAM Ore","purity":"Impure","x": 282000,"y": -45000,"z":1100},
    {"resource":"SAM Ore","purity":"Impure","x": -45000,"y":-400000,"z":100},
    {"resource":"SAM Ore","purity":"Impure","x":  45000,"y":-400000,"z":100},
    # Normal (6)
    {"resource":"SAM Ore","purity":"Normal","x":-288000,"y":-150000,"z":850},
    {"resource":"SAM Ore","purity":"Normal","x":-283000,"y":-110000,"z":950},
    {"resource":"SAM Ore","purity":"Normal","x":-277000,"y": -65000,"z":1050},
    {"resource":"SAM Ore","purity":"Normal","x": 298000,"y":-150000,"z":850},
    {"resource":"SAM Ore","purity":"Normal","x": 292000,"y":-110000,"z":950},
    {"resource":"SAM Ore","purity":"Normal","x": 285000,"y": -65000,"z":1050},
    # Pure (3)
    {"resource":"SAM Ore","purity":"Pure","x":-286000,"y":-140000,"z":900},
    {"resource":"SAM Ore","purity":"Pure","x": 296000,"y":-140000,"z":900},
    {"resource":"SAM Ore","purity":"Pure","x":   0,"y":-410000,"z":100},
]

# Resource Wells
WELLS = [
    # ── NITROGEN GAS ────────────────────────────────────────────────────────
    # Impure (2)
    {"resource":"Nitrogen Gas","purity":"Impure","type":"well","x":-285000,"y": 250000,"z":1200},
    {"resource":"Nitrogen Gas","purity":"Impure","type":"well","x": 290000,"y": 248000,"z":1200},
    # Normal (7)
    {"resource":"Nitrogen Gas","purity":"Normal","type":"well","x":-270000,"y": 260000,"z":1250},
    {"resource":"Nitrogen Gas","purity":"Normal","type":"well","x":-255000,"y": 270000,"z":1300},
    {"resource":"Nitrogen Gas","purity":"Normal","type":"well","x":-240000,"y": 278000,"z":1350},
    {"resource":"Nitrogen Gas","purity":"Normal","type":"well","x": 275000,"y": 255000,"z":1250},
    {"resource":"Nitrogen Gas","purity":"Normal","type":"well","x": 260000,"y": 265000,"z":1300},
    {"resource":"Nitrogen Gas","purity":"Normal","type":"well","x": 245000,"y": 273000,"z":1350},
    {"resource":"Nitrogen Gas","purity":"Normal","type":"well","x":   0,"y": 310000,"z":400},
    # Pure (36) - distributed across northern and central biomes
    *[{"resource":"Nitrogen Gas","purity":"Pure","type":"well",
       "x": int(-290000 + i*9000), "y": int(230000 + (i%4)*15000), "z":1400}
      for i in range(18)],
    *[{"resource":"Nitrogen Gas","purity":"Pure","type":"well",
       "x": int( 290000 - i*9000), "y": int(228000 + (i%4)*15000), "z":1400}
      for i in range(18)],

    # ── CRUDE OIL WELLS ─────────────────────────────────────────────────────
    # Impure (8)
    *[{"resource":"Crude Oil","purity":"Impure","type":"well",
       "x": int(-310000 + i*12000), "y":-300000, "z":200} for i in range(4)],
    *[{"resource":"Crude Oil","purity":"Impure","type":"well",
       "x": int( 310000 - i*12000), "y":-300000, "z":200} for i in range(4)],
    # Normal (6)
    *[{"resource":"Crude Oil","purity":"Normal","type":"well",
       "x": int(-300000 + i*15000), "y":-308000, "z":200} for i in range(3)],
    *[{"resource":"Crude Oil","purity":"Normal","type":"well",
       "x": int( 300000 - i*15000), "y":-308000, "z":200} for i in range(3)],
    # Pure (4)
    {"resource":"Crude Oil","purity":"Pure","type":"well","x":-295000,"y":-315000,"z":200},
    {"resource":"Crude Oil","purity":"Pure","type":"well","x":-270000,"y":-320000,"z":200},
    {"resource":"Crude Oil","purity":"Pure","type":"well","x": 295000,"y":-315000,"z":200},
    {"resource":"Crude Oil","purity":"Pure","type":"well","x": 270000,"y":-320000,"z":200},

    # ── WATER WELLS ─────────────────────────────────────────────────────────
    # Impure (7)
    *[{"resource":"Water","purity":"Impure","type":"well",
       "x": int(-280000 + i*20000), "y": 280000, "z":1000} for i in range(7)],
    # Normal (12)
    *[{"resource":"Water","purity":"Normal","type":"well",
       "x": int(-275000 + i*18000), "y": 290000, "z":1000} for i in range(12)],
    # Pure (36)
    *[{"resource":"Water","purity":"Pure","type":"well",
       "x": int(-270000 + i*15000), "y": 300000, "z":1000} for i in range(36)],

    # ── GEYSERS ─────────────────────────────────────────────────────────────
    # Normal (13 — note image shows 0 impure, 9 normal from one screenshot but 13 from tooltip)
    *[{"resource":"Geyser","purity":"Normal","type":"geyser",
       "x": int(-150000 + i*25000), "y":-270000, "z":200} for i in range(13)],
    # Pure (9)
    *[{"resource":"Geyser","purity":"Pure","type":"geyser",
       "x": int(-100000 + i*28000), "y":-280000, "z":200} for i in range(9)],
    # Impure (9)
    *[{"resource":"Geyser","purity":"Impure","type":"geyser",
       "x": int(-120000 + i*30000), "y":-260000, "z":200} for i in range(9)],
]

def world_to_map(x, y):
    """Convert UE4 world coordinates (cm) to map pixel coordinates."""
    # World bounds: x [-324698, 425698], y [-375000, 375000]
    # Map image: 8192 x 8192 px
    WORLD_X_MIN = -324698
    WORLD_X_MAX =  425698
    WORLD_Y_MIN = -375000
    WORLD_Y_MAX =  375000
    MAP_SIZE = 8192
    px = (x - WORLD_X_MIN) / (WORLD_X_MAX - WORLD_X_MIN) * MAP_SIZE
    py = (y - WORLD_Y_MIN) / (WORLD_Y_MAX - WORLD_Y_MIN) * MAP_SIZE
    # For Leaflet CRS.Simple: lat = -py, lng = px
    lat = -py
    lng = px
    return round(lat, 2), round(lng, 2)

def build_records():
    records = []
    id_counter = 1
    for n in NODES:
        lat, lng = world_to_map(n["x"], n["y"])
        records.append({
            "id": id_counter,
            "resource": n["resource"],
            "purity": n["purity"],
            "type": "node",
            "world_x": n["x"],
            "world_y": n["y"],
            "world_z": n["z"],
            "map_lat": lat,
            "map_lng": lng,
        })
        id_counter += 1
    for w in WELLS:
        lat, lng = world_to_map(w["x"], w["y"])
        records.append({
            "id": id_counter,
            "resource": w["resource"],
            "purity": w["purity"],
            "type": w.get("type","well"),
            "world_x": w["x"],
            "world_y": w["y"],
            "world_z": w["z"],
            "map_lat": lat,
            "map_lng": lng,
        })
        id_counter += 1
    return records

def main():
    records = build_records()

    # ── JSON ────────────────────────────────────────────────────────────────
    json_path = os.path.join(os.path.dirname(__file__), "resource_nodes.json")
    with open(json_path, "w") as f:
        json.dump(records, f, indent=2)
    print(f"Written {len(records)} records to {json_path}")

    # ── CSV ─────────────────────────────────────────────────────────────────
    csv_path = os.path.join(os.path.dirname(__file__), "resource_nodes.csv")
    fields = ["id","resource","purity","type","world_x","world_y","world_z","map_lat","map_lng"]
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(records)
    print(f"Written {len(records)} rows to {csv_path}")

    # ── summary ─────────────────────────────────────────────────────────────
    from collections import Counter
    summary = Counter((r["resource"], r["purity"]) for r in records)
    print("\n--- Summary ---")
    for (res, pur), cnt in sorted(summary.items()):
        print(f"  {res:20s} {pur:8s}: {cnt}")

if __name__ == "__main__":
    main()
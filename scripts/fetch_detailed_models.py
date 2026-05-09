import urllib.request, re, json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
h = {'User-Agent': 'Mozilla/5.0'}

# Get the SCIM JS to find the version of detailedModels.json
url = 'https://static.satisfactory-calculator.com/js/InteractiveMap/build/SCIM.js?v=1772234064'
req = urllib.request.Request(url, headers=h)
data = urllib.request.urlopen(req).read().decode('utf-8','ignore')

# Find detailedModels.json version
m = re.search(r'detailedModels\.json\?v=(\d+)', data)
version = m.group(1) if m else '1772234064'
print('detailedModels version:', version)

# Fetch the detailedModels.json
dm_url = f'https://static.satisfactory-calculator.com/js/InteractiveMap/build/detailedModels.json?v={version}'
print('Fetching:', dm_url)
req2 = urllib.request.Request(dm_url, headers=h)
raw = urllib.request.urlopen(req2).read()
print('Downloaded', len(raw), 'bytes')

# Save raw
out = os.path.join(os.path.dirname(__file__), 'data', 'detailedModels.json')
with open(out, 'wb') as f:
    f.write(raw)
print('Saved to', out)

# Peek at structure
d = json.loads(raw)
if isinstance(d, dict):
    print('Top-level keys:', list(d.keys())[:20])
elif isinstance(d, list):
    print('Array length:', len(d))
    print('First item:', str(d[0])[:300])

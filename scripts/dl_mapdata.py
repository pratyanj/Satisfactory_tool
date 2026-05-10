import urllib.request, re, sys, json, os
sys.stdout.reconfigure(encoding='utf-8')
h = {'User-Agent': 'Mozilla/5.0'}
html = urllib.request.urlopen(urllib.request.Request('https://satisfactory-calculator.com/en/interactive-map', headers=h)).read().decode('utf-8','ignore')
m = re.search(r'mapDataUrl\s*=\s*"([^"]+)"', html)
url = m.group(1)
print('URL:', url)
raw = urllib.request.urlopen(urllib.request.Request(url, headers=h)).read()
out = os.path.join('data', 'mapdata_full.json')
with open(out, 'wb') as f:
    f.write(raw)
print('Saved', len(raw), 'bytes')

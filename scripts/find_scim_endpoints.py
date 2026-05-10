import urllib.request, re, json, sys
sys.stdout.reconfigure(encoding='utf-8')
h = {'User-Agent': 'Mozilla/5.0'}

# The mapDataUrl is set in the HTML page that initializes the SCIM
html = urllib.request.urlopen(
    urllib.request.Request('https://satisfactory-calculator.com/en/interactive-map', headers=h)
).read().decode('utf-8','ignore')

# Find mapDataUrl
for kw in ['mapDataUrl', 'dataUrl', 'staticAssetsUrl']:
    idx = html.find(kw)
    while idx >= 0:
        print(f'[{kw}]:', html[idx:idx+200])
        print()
        idx = html.find(kw, idx+1)
        if idx > 50000:
            break

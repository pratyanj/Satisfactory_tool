import urllib.request, re, sys, json
sys.stdout.reconfigure(encoding='utf-8')
h = {'User-Agent': 'Mozilla/5.0'}
url = 'https://static.satisfactory-calculator.com/js/InteractiveMap/build/SCIM.js?v=1772234064'
req = urllib.request.Request(url, headers=h)
data = urllib.request.urlopen(req).read().decode('utf-8','ignore')
print('Size:', len(data))

# Look for fetch() calls
fetches = re.findall(r'fetch\(["\']([^"\']+)["\']', data)
print('fetch calls:', fetches[:10])

# Look for JSON file paths
json_paths = re.findall(r'["\']([^"\']*\.json[^"\']*)["\']', data)
print('JSON paths:', json_paths[:20])

# Look for /en/ or /data/ paths
api_paths = re.findall(r'["\']/(en|data|api)[^"\']{0,60}["\']', data)
print('API paths:', api_paths[:20])

# Check around 'ironPure' for data patterns
idx = data.find('ironPure')
if idx > 0:
    print('Context around ironPure:')
    print(data[max(0,idx-200):idx+200])

# World Map Debug Guide

## Flow: World Map Button Click

### 1. User clicks "World Map" button (App.tsx)
- **File**: `src/App.tsx` lines 236-241
- **Function**: `setTopLevelTab('world_map')`
- **Result**: Renders `<WorldMapTab />` (line 302)

### 2. WorldMapTab renders
- **File**: `src/components/Map/WorldMapTab.tsx`
- **State**: `mapLayer = 'realistic'`
- **Layers**: `{ ...defaultLayerState(), resourceNodes: true }`
- **Render**: `<WorldMap buildings={[]} conveyors={[]} pipes={[]} powerLines={[]} players={[]} layers={layers} mapLayer={mapLayer} ... />`

### 3. WorldMap component
- **File**: `src/components/Map/WorldMap.tsx`
- **Props**: All arrays are empty [], layers.resourceNodes = true
- **State**: 
  - `zoom = -2`
  - `mapImageLoaded = false`
  - `bgUrl = '/map/maprz5.png'` (for 'realistic' layer)
- **center**: `[2500, 2500]` (MAP_IMAGE_SIZE/2)

### 4. Conditional rendering
- If `!mapImageLoaded` → Show `<MapImageLoader />` (loading bar)
- Render `<MapContainer>` with CRS.Simple
  - center: `[2500, 2500]`
  - zoom: -2
  - minZoom: -4, maxZoom: 2

### 5. MapImageLoader
- Creates `new Image()`
- Sets `img.src = bgUrl`
- On load: calls `onLoaded()` → sets `mapImageLoaded = true`
- On error: still calls `onLoaded()` after 200ms

### 6. MapContainer renders
- `<ImageOverlay url={bgUrl} bounds={MAP_BOUNDS} />`
- `ResourceNodeLayer` (only layer enabled)
- No building markers (empty array)

---

## Debug Console Output

You'll see these console logs:

```
[WorldMapTab] Render
[WorldMapTab] layers config: { resourceNodes: true, ... }

[WorldMap] ======= MOUNT/RENDER =======
[WorldMap] Props: { buildings: 0, conveyors: 0, ... }
[WorldMap] center: [2500, 2500]
[WorldMap] layerConfig: { id: 'realistic', url: '/map/maprz5.png', ... }
[WorldMap] bgUrl: /map/maprz5.png
[WorldMap] MAP_IMAGE_SIZE: 5000
[WorldMap] mapLayer changed to: realistic
[WorldMap] Setting mapImageLoaded=false (non-blank layer)

[MapImageLoader] Mount - url: /map/maprz5.png
[MapImageLoader] Setting img.src: /map/maprz5.png
[MapImageLoader] progress: 10%
[MapImageLoader] progress: 15%
...

[WorldMap] Component update - zoom: -2 mapImageLoaded: false bgUrl: /map/maprz5.png

[MapLayerSwitcher] Render - current: realistic
[MapLayerSwitcher] Available layers: [...]  
```

---

## Common Issues & What to Look For

### Issue 1: Map image fails to load (404)
**Check console for:**
```
[MapImageLoader] Image load error for: /map/maprz5.png
```
**Cause**: Image file not found at public/map/maprz5.png
**Fix**: Verify file exists:
- `public/map/mapgz5.png` (game map)
- `public/map/maprz5.png` (realistic)

### Issue 2: Map container has 0 height
**Check DevTools Elements panel:**
```css
.world-map-root {
  /* Should have height */
}
```
**Parent chain:** App → WorldMapTab → div (w-full h-full) → WorldMap → world-map-root

### Issue 3: Map image loads but never appears
- Check `mapImageLoaded` state becomes true
- Check ImageOverlay renders with correct bounds
- Check CSS isn't hiding the overlay

### Issue 4: Map is blank/empty
**Expected**: Empty map with just the background image
**Since**: WorldMapTab passes empty arrays, no markers will appear
**Normal behavior**: Should show just the map background and resource nodes toggle

### Issue 5: Leaflet CSS not loaded
**Symptom**: Map tiles appear but are broken/offset
**Fix**: Check leaflet.css is imported in WorldMap.tsx line 10

---

## Key Files Modified for Debugging

1. **WorldMap.tsx**: Added console logs for:
   - Component props validation
   - Map initialization (center, bounds, zoom)
   - Layer changes
   - Image loading progress

2. **MapImageLoader**: Added logging for:
   - Image load start
   - Image load success/error
   - Progress updates
   - onLoaded callback invocation

3. **WorldMapTab**: Added logging for:
   - Component render
   - layers config
   - mapLayer state changes

4. **MapLayerSwitcher**: Added logging for:
   - Current layer
   - Layer change requests

---

## What "World Map" Should Show

When you click the World Map button with an empty save (no loaded save file):
1. Empty world map background (realistic or game map style)
2. Loading bar appears briefly while map image loads
3. No building markers (data arrays are empty)
4. No conveyors/pipes/power lines
5. Resource nodes layer toggle available but nothing to show
6. Layer switcher (Realistic/Game Map/No Map) in bottom-right
7. Map search (hidden, needs buildings)

**This is normal behavior for an empty map.**

If you want to see data on the map, you need to:
1. Load a save file with buildings/conveyors
2. Or the code should generate sample data for demonstration

---

## Testing the Flow

1. Open browser DevTools (F12)
2. Go to Console tab
3. Click "World Map" button in the UI
4. Watch console for debug output
5. Look for errors (red text)
6. Check Network tab for 404s on map images
7. Check Elements tab for `.world-map-root` height

---

## Quick Checks

```bash
# Verify map images exist
ls -la public/map/

# Check leaflet.css is available
ls -la node_modules/leaflet/dist/leaflet.css
```

---

## Map Coordinates Reference

- **MAP_IMAGE_SIZE**: 5000px
- **MAP_BOUNDS**: [[0,0], [5000,5000]]
- **Center**: [2500, 2500]
- **Zoom levels**: -4 to 2 (default: -2)
- **CRS**: Simple (pixel coordinates)

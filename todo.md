# Satisfactory Tool - TODO List

## Current Tasks
- [ ] Map Tiles: Increase maximum zoom level to 5.
- [ ] UI Update: Redesign the style of the World Map resource sidebar to make it more intuitive and visually appealing.
- [ ] Map Markers: Add listings in the World Map for the following items:
  - Power Slugs (Blue, Yellow, Purple)
  - Mercer Spheres
  - Somersloops
  - Hard Drives
  - Flora (Paleberry, Beryl Nut, Bacon Agaric)
- [ ] Map Data: Gather and add exact location coordinates and info for all the newly listed items above.

## Suggested Enhancements & Future Improvements

### 1. Interactive Map Features
- **Player & Factory Overlay**: Parse save files to display the player's current location, vehicles, and built structures (machines, belts, foundations) directly on the world map.
- **Logistics Networks**: Visualize train tracks, pipelines, and power grids on the map.
- **Marker Filtering & Clustering**: Add search functionality and marker clustering on the map to prevent UI lag when rendering thousands of items (like hard drives, slugs, and nodes).
- **Distance Measure Tool**: Allow users to draw lines on the map to measure distances between resource nodes or planned factories.

### 2. Production Planner / Factory Graph
- **Overclocking & Power Shards**: Allow users to input custom clock speeds for machines in the planner, adjusting inputs, outputs, and power consumption dynamically.
- **Alternate Recipes Manager**: Make it easy to toggle and prioritize alternate recipes when generating the production graph.
- **Byproduct Management**: Implement logic to automatically handle byproducts (e.g., Heavy Oil Residue, Polymer Resin) and suggest ways to sink or process them.
- **Save/Load Plans**: Let users save their factory plans locally or export them as JSON to share with others.

### 3. Save Game Parsing
- **Inventory Viewer**: Show what is currently in the player's inventory, personal storage boxes, and AWESOME Sinks.
- **Unlock Progress**: Display unlocked milestones, MAM research progress, and AWESOME Shop purchases based on the uploaded save.

### 4. UI/UX & Performance
- **Web Workers for Heavy Tasks**: Move the save game parsing and complex graph calculation logic to background Web Workers so the main UI doesn't freeze when loading large (20MB+) save files.
- **Global Quick Search**: Add a quick search bar (e.g., `Ctrl + K`) to easily search for any item, recipe, or building.
- **Mobile Responsiveness**: Improve layout for tablets and mobile devices so users can keep the tool open on a secondary device while playing.

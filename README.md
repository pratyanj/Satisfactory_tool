# Factory Visual Planner for Satisfactory

A production planning and save-map analysis tool for [Satisfactory](https://www.satisfactorygame.com/).

This app helps you:
- Plan production chains and machine counts.
- Visualize logistics in an interactive graph.
- Parse `.sav` files and inspect your factory on a world map.
- Explore resource nodes on a standalone map without uploading a save.

![Network Graph View](docs/screenshots/network_graph.png)

## Features

### 1) Production Planner

Main planning flow with four result tabs:

- `Network graph`
  - Aggregated view and machine view.
  - Belt overload highlighting.
  - Click-to-trace upstream/downstream dependencies.
  - Group and ungroup selected machines.
  - Expand machine arrays into splitters/mergers.
  - Auto layout (`AI Design Layout`) using ELK.
  - Export graph as PNG or SVG.
- `Tree list`
  - Hierarchical production breakdown.
- `Items`
  - Required items per minute summary.
- `Buildings`
  - Building counts and power-focused breakdown.

Planner utilities:
- Target item selector with item modal.
- Rate/min input.
- Miner tier selection (`Mk.1`, `Mk.2`, `Mk.3`).
- Belt tier selection (`Mk.1` to `Mk.5`).
- Shareable plan URL (`#plan=...`) including tabs and layout mode.

![Machine View](docs/screenshots/machine_view.png)
![Tree List](docs/screenshots/tree_list.png)
![Items Tab](docs/screenshots/items_tab.png)
![Buildings Tab](docs/screenshots/buildings_tab.png)

### 2) Save Game Map

Upload a Satisfactory `.sav` file to analyze your live factory:

- Drag-and-drop uploader with parse progress.
- Building markers by category.
- Conveyor, pipe, and power-line overlays.
- Player markers.
- Altitude range filter.
- Layer toggles:
  - Building categories
  - Conveyors, pipes, power lines
  - Resource nodes, players
  - Train network, vehicles, drones, power circuits
- Save stats dashboard:
  - Building and infrastructure counts
  - Category breakdown with focus filter
  - Power production/consumption summary
- Map layer switcher (Realistic, Game map, No map)
- Building search

### 3) World Map (No Save Required)

Standalone resource map mode:

- Browse resource nodes without uploading a save.
- Filter by resource type and purity (`Impure`, `Normal`, `Pure`).
- Clear/select all filter shortcuts.
- Switch map background layer.

## Data Coverage (Current Repository)

- Items: `151`
- Recipes: `115`
- Machines: `17`
- Belts: `5`
- Resource nodes: `459` across `11` resource types

Notes:
- Resource node data is read from `public/data/resource_nodes.json`.
- The map image is high-resolution and can take time to load on slower networks.

## Tech Stack

- React 19 + TypeScript
- Vite 6
- React Flow (`@xyflow/react`) for production graph UI
- ELK + Dagre for layout logic
- Leaflet + React Leaflet for map rendering
- `@etothepii/satisfactory-file-parser` for `.sav` parsing
- Tailwind CSS v4 + custom CSS
- `html-to-image` for PNG/SVG export

## Getting Started

### Prerequisites

- Node.js `18+` (LTS recommended)
- npm

### Install

```bash
git clone https://github.com/pratyanj/Satisfactory_tool.git
cd Satisfactory_tool
npm install
```

### Run Development Server

```bash
npm run dev
```

App runs on:
- [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm run preview
```

### Type Check

```bash
npm run lint
```

## How To Use

### Plan a factory

1. Open `Production Planner`.
2. Pick a target item.
3. Enter desired output rate per minute.
4. Choose miner and belt tiers.
5. Click `Calculate Flow`.
6. Review outputs in `Network graph`, `Tree list`, `Items`, and `Buildings`.
7. Copy a share link if you want to send the plan.

### Analyze a save file

1. Open `Save Game Map`.
2. Drop a `.sav` file into the uploader.
3. Wait for parsing to complete.
4. Use layer toggles, category focus, search, and altitude filters to inspect your world.

### Explore resources quickly

1. Open `World Map`.
2. Pick resource filters by type and purity.
3. Toggle map styles as needed.

## Project Structure

```text
src/
  components/
    Graph/      # React Flow graph, nodes, edges, toolbar actions
    Map/        # Save uploader, world map, overlays, filters, stats
  engine/
    data.ts     # Typed item/recipe/machine/belt data exports
    solver.ts   # Production chain solver
    graphMapper.ts
    saveParser.ts
  App.tsx       # Main app shell and tab routing
  index.css     # Global styles
data/           # Source data (items, recipes, machines, map data)
public/         # Static images, icons, map assets, resource node data
docs/screenshots/
```

## Troubleshooting

- Blank map or slow first load:
  - The high-resolution map asset is large; give it time to download.
- Save upload fails:
  - Ensure the file extension is `.sav`.
- Graph feels dense:
  - Switch to `Aggregated View`, then use `AI Design Layout`.

## Contributing

Contributions are welcome through issues and pull requests.

## License

Apache-2.0. See [LICENSE](LICENSE).

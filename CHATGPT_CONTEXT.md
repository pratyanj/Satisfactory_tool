# FICSIT CORP // SATISFACTORY TOOL - PROJECT ARCHITECTURE & CONTEXT
> **Attention Pioneer:** This document is the property of FICSIT Inc. It contains detailed telemetry, architecture specifications, and calculation logic for the *Satisfactory Tool* (factory planner, world map, and game save analyzer).
> Use this document as a master context injector when sharing this project with LLMs (ChatGPT, Claude, or Gemini) to ensure full comprehension of our technology stack, custom mathematics, and FICSIT-brand visual aesthetic.

---

## 1. PROJECT OVERVIEW & VALUE PROPOSITION

The **Satisfactory Tool** is a premium, web-based companion application for Coffee Stain Studios' game *Satisfactory*. Built as a high-fidelity industrial console, it offers three primary capabilities:

1. **High-Performance Production Planner:** Recursively solves complex multi-step item recipe trees, automatically aggregates resource costs and machine count requirements, plans power draws, and visualizes logistics routes as an interactive network graph (with automated conveyor speed chunking, splitter/merger nodes, and manifold realignments).
2. **Interactive Cartography & Save Game Analyzer:** Parses raw Unreal Engine 4 `.sav` game files directly in the browser. It overlays player structures (belts, pipelines, wires, buildings, train tracks, vehicles, drone paths) and local player positions onto an interactive Leaflet map, isolating factories with 3D altitude slicing, biome detection, and power circuit health checks.
3. **Centralized Item Codex:** A comprehensive encyclopedia displaying recipes, raw costs, production machinery, and radioactive properties in both visual flow diagrams and high-density database layouts.

---

## 2. FICSIT VISUAL STYLING & DESIGN SYSTEM

All components in this application conform strictly to an immersive **FICSIT Industrial HUD** aesthetic. This styling breaks away from generic modern SaaS design in favor of heavy industrial hardware controls.

### Core Color Palette
*   **FICSIT Orange (`#f48721`):** Primary branding, active states, key focus borders, selection indicators, and warnings.
*   **Deep Charcoal / Gunmetal (`#0d0e11`, `#0a0b0d`, `#121316`):** Base background colors mimicking rugged control terminals.
*   **Industrial Steel Border (`#2a2d33`):** Grid dividers and panel frames.
*   **Power/Energy Yellow (`#ffaa00`, `#fde68a`):** Power statistics, power lines, and grid metrics.
*   **Efficiency Green (`#00e676`):** Machine rates, 100% compliant markers, and optimized nodes.
*   **Hazard Red (`#dc2626`):** Critical alerts, impure nodes, and radioactive hazard overlays.

### Key Aesthetic Elements
*   **Chamfered Corners:** Slanted card frames and panels constructed using CSS `clip-path: polygon(...)` (e.g., clipping corners by `10px` or `12px`).
*   **Hardware Rivets / Screws:** Tiny metal circle elements (`sf-card-screw` / `sf-screw`) positioned in the corners of plates, console buttons, and modals.
*   **Caution Hazard Stripes:** Yellow and black diagonal stripes (`sf-caution-stripes`) used on headers, loading screens, and panel trims.
*   **Luminescent HUD Navigation:** Glowing buttons that utilize text-shadows (`text-shadow: 0 0 12px rgba(244, 135, 33, 0.8)`) instead of solid colored backgrounds.
*   **Tactile Controls:** Industrial grid meshes, chunky selectors, flip-direction triggers, and hardware toggle buttons.

---

## 3. MASTER FILE STRUCTURE & DIRECTORY MAP

```
Satisfactory_tool/
├── data/                             # Core Game Databases (JSON & CSV formats)
│   ├── belts.json                    # Conveyor Belt Tiers (Mk.1 - Mk.6 capacities)
│   ├── items.json                    # Full item directory (names, categories, images)
│   ├── machines.json                 # Machine specs (power usage, constructor stats, images)
│   ├── recipes.json                  # All game recipes (inputs, outputs, base rates, machine mappings)
│   ├── resource_nodes.json           # All coordinate positions of resource nodes on the world map
│   └── alternate_recipes.json        # Alternative high-efficiency recipe datasets
├── public/                           # Static assets
│   ├── data/                         # Public JSON files for runtime fetch requests
│   └── images/                       # High-res item and machine renders
├── src/
│   ├── types/
│   │   └── save.ts                   # Strongly-typed schema for parsed UE4 save game structures
│   ├── engine/                       # Computational Mechanics & Game Parsers
│   │   ├── data.ts                   # Re-exports strongly-typed JSON database objects
│   │   ├── solver.ts                 # Core linear production recipe tree solver & summarizer
│   │   ├── graphMapper.ts            # Maps raw solver trees into visual React Flow layouts
│   │   ├── saveParser.ts             # Browser-based GZIP save-game binary file reader
│   │   ├── powerCircuitDetector.ts   # Isolates power grids and tracks active generation capacity
│   │   ├── buildingClassifier.ts     # Categorizes game entity typePaths to map items
│   │   └── biomeDetector.ts          # Conversion calculations for coordinates to map biomes
│   ├── components/                   # FICSIT Modular UI Core
│   │   ├── Layout/
│   │   │   ├── Header/
│   │   │   │   ├── HeaderNav.tsx     # Transparent glowing HUD nav tabs & Share encoder
│   │   │   │   └── header.css        # Implements screws, caution stripes, and text glow
│   │   │   └── BodyFrame/
│   │   │       ├── BodyFrame.tsx     # Side-scrolling main window layout frame
│   │   │       └── bodyFrame.css     # Heavy metal outer shell framing
│   │   ├── Graph/                    # High-Tech Network Graph Layer
│   │   │   ├── FactoryGraph.tsx      # React Flow 12 graph wrapper (Dagre layouts)
│   │   │   ├── MachineNode.tsx       # FICSIT bevel cards, alternate recipe stars, hover tooltips
│   │   │   ├── LogisticsNode.tsx     # Manifold splitter/merger nodes with 4-way vertical handles
│   │   │   └── SatisfactoryEdge.tsx  # Animated conveyor lines indicating load speeds
│   │   ├── Map/                      # Interactive Cartography Layer (Leaflet)
│   │   │   ├── WorldMap.tsx          # Renders static map overlay with dynamic infrastructure layers
│   │   │   ├── ResourceNodeLayer.tsx # Purity rings, circular node markers, extraction tables
│   │   │   ├── AltitudeFilter.tsx    # Slices world save markers using a 3D Z-coordinate range
│   │   │   ├── SaveUploader.tsx      # File upload interface with radioactive hazard warnings
│   │   │   ├── StatsDashboard.tsx    # Details items in storage, vehicle coordinates, train routes
│   │   │   └── mapUtils.ts           # Coordinate conversion math: Unreal Engine 4 cm -> LatLng
│   │   ├── InputForm.tsx             # Grid-based Industrial control console & Alt Recipe drawer
│   │   ├── Summary.tsx               # Total Power, Machines, and Building Construction Costs
│   │   ├── ItemBrowser.tsx           # Full Codex category search grid
│   │   ├── ItemDetail.tsx            # Single top global ViewToggle (Flow vs Table) with toxic indicators
│   │   ├── ItemModal.tsx             # Interactive target item picker overlay
│   │   ├── ItemsTab.tsx              # Tabular overview of intermediate rate items
│   │   └── BuildingsTab.tsx          # Summary of machinery used in the planner setup
│   ├── App.tsx                       # Main coordinator, routing parser, and history tracker
│   ├── index.css                     # Global design tokens, animations, and loaders
│   └── main.tsx                      # App bootstrap entry point
├── package.json                      # Build scripts and dependency constraints
├── tsconfig.json                     # TypeScript strict-mode compiler rules
└── vite.config.ts                    # Vite build configuration
```

---

## 4. DETAILED COMPONENT ARCHITECTURE & LOGICS

### 4.1 Root App Routing & State Sync (`App.tsx`)
`App.tsx` controls global navigation state using a multi-tiered hierarchy:
*   **Top Level Tab:** `'planner'` | `'save_map'` | `'world_map'` | `'codex'`.
*   **Planner Sub-Tab:** `'network_graph'` | `'tree_list'` | `'items'` | `'buildings'`.
*   **Dynamic URL State Sharing:** Whenever a user updates their planner variables (target item, rate, miner tier, belt tier, alternate recipes), `App.tsx` generates a Base64-encoded URL hash (`#plan=ey...`). Navigating to this link decodes the hash, restores the planner state, and automatically syncs the UI, allowing instant pipeline sharing.
*   **Browser History Navigation:** Popstate event listeners track URL pathname changes (e.g. `/planner/network_graph` or `/codex/copper_sheet`), syncing browser back/forward buttons with tab configurations.

### 4.2 High-Tech Control Console (`InputForm.tsx`)
Constructed inside an absolute slanted background panel, it handles recipe input collection:
*   **Alternative Recipe Drawer:** Scans the active recipe chain using solver candidate checkers. Clicking "Alt Recipes" pulls open an absolute coordinate-safe overlay panel containing a list of sub-components that have alternate recipes. Pioneers can select specific alternative pathways (e.g. *Solid Steel Ingot* instead of *Steel Ingot*), triggering an immediate calculation of the production tree.
*   **Console Toggles:** Grid layout features tactile inputs for target rates, custom select widgets for belt tiers (Mk.1 to Mk.6), and miner tiers (Mk.1 to Mk.3).

### 4.3 Production Solver Engine (`solver.ts` & `graphMapper.ts`)
#### The Math Solving Algorithm (`solver.ts`)
The calculation works as a recursive depth-first tree solver:
1.  **Recipe Lookup:** Resolves the primary recipe for a target item. If an alternate recipe override is stored in `RecipeSelectionMap`, it fetches that instead.
2.  **Machine Count Division:** Adjusts the machine output rate based on miner limits and calculates:
    $$\text{Machine Count} = \frac{\text{Required Rate}}{\text{Recipe Output Rate}}$$
3.  **Byproduct Processing:** Captures auxiliary outputs (e.g., Heavy Oil Residue produced during Plastic synthesis) and tracks them in the node's `byproducts` array.
4.  **Recursive Inputs:** Iterates through each required input, calculates its required flow rate:
    $$\text{Input Rate} = \text{Recipe Input Rate} \times \text{Machine Count}$$
    It recursively calls `solve` on that input item, forming a nested `SolverNode` tree.
5.  **Summary Consolidation:** `calculateSummary` traverses the solved tree, aggregating:
    *   Total count per machinery type.
    *   Cumulative power consumption (in Megawatts).
    *   Raw materials required from basic harvesters.
    *   Constructor building materials list (derived from constructor blueprints).

#### Graph Layout Mapping (`graphMapper.ts`)
Converts the nested solver tree into visual React Flow elements under two core layout modes:
1.  **`aggregated` Mode:** Groups all machines producing the same item into a single, high-density machine node displaying the aggregated machine count (e.g. "Assembler x4.2").
2.  **`expanded` Mode (Splitter & Merger Auto-Routing):**
    *   Compares the required feed rate of a connection against the capacity of the chosen Conveyor Belt Tier.
    *   If the rate exceeds the belt capacity, it automatically chunks the machines into multiple nodes that fit within the belt threshold (e.g., chunking 12 constructors into two parallel blocks of 6).
    *   Automatically generates intermediate logistics splitter or merger nodes to feed the parallel runs.
3.  **Visual Layout:** Feeds nodes and edges into `dagre` (graph visualizer layout library), setting a horizontal Left-to-Right orientation with optimized vertical spacing to present highly readable, non-overlapping factory schematics.

### 4.4 The Network Graph Canvas (`FactoryGraph.tsx`)
Visualized using React Flow 12 (`@xyflow/react`) with three custom node styles:
1.  **`MachineNode`:** A premium beveled card featuring rivet details, hazard stripes, neon indicator lights, and an alternate recipe indicator star. Includes a hover-activated **Flip Direction Button** which triggers `toggleFlip`, swapping input/output handles from Left $\leftrightarrow$ Right to mirror the physical routing. A hover tooltip overlay details specific machine inputs, outputs, byproducts, and power.
2.  **`LogisticsNode`:** Splitter/Merger nodes designed with **Manifold Vertical Routing**. Realigned handles are positioned on all four sides (Top, Bottom, Left, Right). Together with straight-line SVG connections, this forces conveyor paths to run as clean vertical segments (vertical manifolds) rather than looping, mirroring professional in-game layouts.
3.  **`SatisfactoryEdge` (High-Tech Conveyor lines):** Renders the logistics lines. Features animated dotted flows moving in the direction of the material. If the item flow rate exceeds the active belt capacity, the edge glows **Toxic Hazard Red** with warning markers, indicating a shipping bottleneck. Clicking any node highlights its complete production chain, dimming other pathways.

### 4.5 The Interactive World Map & Save Parser (`WorldMap.tsx`)
An interactive map driven by Leaflet (`react-leaflet`).
*   **Binary Save Parser (`saveParser.ts`):** Pioneer uploads their `.sav` file. The tool parses the file in-browser, reading coordinates, rotators, and structural entities using `@etothepii/satisfactory-file-parser`.
*   **Coordinate Translation (`mapUtils.ts`):** Sat-map coords in Satisfactory operate on Unreal Engine centimeters ($x, y, z$). The tool converts these coordinates to Leaflet simple coordinates:
    $$\text{LatLng} = \text{gameToLatLng}(x, y)$$
*   **3D Altitude Floor Slicing (`AltitudeFilter.tsx`):** A custom FICSIT z-axis slider. Filters buildings, belts, and markers by their height coordinates (meters), allowing players to slice off roofs or examine specific levels of a vertical, multi-floor factory!
*   **Interactive Layers:**
    *   *Resource Nodes:* Displays resource icons on the map. Nodes have colored rings showing their purity: **Impure (Red)**, **Normal (Orange)**, or **Pure (Green)**. Clicking a node opens a card showing exact extraction rates for Miner Mk.1, Mk.2, and Mk.3 at 50%, 100%, 150%, 200%, and 250% clock speed.
    *   *Belts & Pipes Layer:* Plots active conveyors and pipelines on the map using Leaflet Polylines, colored by tier and styled with flowing animations.
    *   *Power Grid Isolation:* Wires are rendered as thin yellow power cables. Power grid algorithms detect isolated sub-grids, active generators, and maximum grid capacities.
    *   *Vehicles, Trains & Drones:* Plots mobile vehicles (Tractors, Trucks, Explorers), active train track networks with locomotives, and active drone port coordinates with mapped flight vectors.
*   **Map Image Loader:** Since the realistic topographic sat-map is approximately 45MB, an automated loading overlay featuring black/orange caution stripes tracks download progress and keeps the UI responsive.

### 4.6 The Item Codex (`ItemBrowser.tsx` & `ItemDetail.tsx`)
*   **ItemDetail Hero Card:** Displays item classification metrics. Radioactive items (e.g. Uranium, Nuclear Fuel Rods) trigger a hazard alert state, wrapping the UI in pulsating toxic yellow/red borders and hazard icons.
*   **Global ViewToggle:** Located at the top bar (`id-topbar`), a single high-tech toggle allows pioneers to switch between a **'flow' view** (visual diagram of cards feeding inputs into machines) and a **'table' view** for both the producing recipes and the ingredient usage lists simultaneously.

---

## 5. FICSIT CORPORATE ROADMAP: NEW FEATURE CONCEPTS

For subsequent feature additions, the following blueprints represent highly detailed, context-aware options that align with the game's theme and our engine architecture:

### 5.1 Power Plant Planner & Logistics Calculator
*   **Concept:** A dedicated calculator tab that helps pioneers design and balance complete power grids.
*   **Implementation Logic:** 
    *   *Inputs:* Target Power Output (MW) or Fuel Input Rate (e.g. Coal, Fuel, Turbofuel, Uranium).
    *   *Calculation:* The solver determines the number of generators required (e.g., Coal Generators at 75 MW, Fuel Generators at 250 MW) and calculates the necessary fuel and water rates.
    *   *Pipeline Logistics:* Automatically plans the pipeline layout (fluid flow rate vs. Pipe Mk.1/Mk.2 capacity limits) and calculates the required number of Water Extractors, including optimal clock speeds and pipe manifold configurations to prevent head lift starvation.
    *   *Waste Logistics:* For Nuclear Power, the calculator automatically plans the radioactive waste logistics line (Uranium Waste $\rightarrow$ Non-Fissile Uranium $\rightarrow$ Plutonium Fuel Rods $\rightarrow$ AWESOME Sink) to design a zero-waste loop.

### 5.2 Dynamic Overclocking & Power Shard Engine
*   **Concept:** Integrates dynamic clock speed adjustments (1% to 250%) directly inside the Production Planner.
*   **Implementation Logic:**
    *   Pioneers can click a machine node on the graph or a machine in the planner settings to apply 1, 2, or 3 Power Shards.
    *   *Mathematics:* The solver dynamically recalculates the output rate and scales power consumption using the game's exponential power formula:
        $$P = P_{\text{base}} \times \left(\frac{\text{Clock Speed}}{100}\right)^{1.6}$$
    *   *Visualization:* Shard sockets (circular glowing yellow/blue icons) render directly on the machine nodes.

### 5.3 Space Elevator Phase Orchestrator
*   **Concept:** A progress-tracking panel that helps pioneers plan and coordinate Space Elevator deliveries.
*   **Implementation Logic:**
    *   *Interface:* Displays the blueprints for Space Elevator Phases 1, 2, 3, 4, and the massive Phase 5 (1.0 Release).
    *   *Orchestration:* Selecting a phase pulls in the massive composite parts list (e.g., *Thermal Propulsion Rocket*, *Assembly Director System*, *Magnetic Field Generator*). 
    *   *Planner Injection:* One-click injects these target parts into the production planner, instantly generating a massive multi-machine factory flowchart that coordinates raw resource nodes across the world map to feed the Space Elevator project.

### 5.4 AWESOME Sink Points Optimizer & Sink Farms
*   **Concept:** A module designed to calculate and maximize point returns in the AWESOME Sink.
*   **Implementation Logic:**
    *   *Points Database:* Links item points values (e.g., *Turbo Motor* = 242,720 points, *Thermal Propulsion Rocket* = 732,960 points) into the planner.
    *   *Optimizer:* Pioneers input their surplus resource nodes (e.g., an unused Pure Caterium node). The algorithm solves and recommends the highest points-per-minute recipe chain that can be constructed with those resources, planning complete "Sink Farms" with integrated AWESOME Sinks on the visual graph.

### 5.5 Dimensional Depot Buffer strategist
*   **Concept:** Coordinates factory outputs with the new 1.0 Dimensional Depot storage buffers.
*   **Implementation Logic:**
    *   Calculates replenishment rates and conveyor feed limits into the pioneer's Dimensional Depot uploaders.
    *   Determines upload speeds and storage buffer capacities, planning smart splitter configurations that direct surplus items to the depot while routing overflows into AWESOME Sinks or local cargo boxes.

---

## 6. TELEMETRY INSTRUCTIONS FOR LLM PAIR PROGRAMMERS

When working on this codebase, obey the following rules to keep the Satisfactory Tool highly modular and thematic:

1.  **Strict Separation of Logic:** Keep mathematical calculations (recipe rates, coordinates, save parsing) strictly inside `src/engine/`. React components must only handle rendering and local UI states, feeding off engine states.
2.  **Maintain the FICSIT Aesthetic:**
    *   Never use standard borders; use `#2a2d33` or `#f4872130`.
    *   Use chamfered polygon clip-paths for container borders.
    *   Integrate industrial indicators (warning lights, rivets, caution tapes) into custom UI elements.
    *   Make buttons and tabs glow using transparent backgrounds and `text-shadow`/`box-shadow`.
3.  **Strict Types:** Always extend schemas in `src/types/` rather than resorting to `any` variables.
4.  **No Code Duplication (DRY):** Reuse FICSIT UI panels, modal wrappers, and data selectors. Keep shared logic in centralized utility files.

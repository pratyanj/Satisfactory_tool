# 🛠️ FICSIT Sandbox — Interactive Factory CAD & Logistics Simulator

Welcome to the **FICSIT Sandbox**! This interactive blueprint planner, logistics simulator, power CAD, and layout designer is built directly inside the Satisfactory Visual Tool platform. 

This document serves as the **official features index and architecture catalog** for the Sandbox module. It details every capability implemented across all phases, key interaction schemes, keyboard shortcuts, and file layout mappings.

---

## 📐 General Overview

The FICSIT Sandbox shifts the Satisfactory Visual Tool from a static production calculator into an interactive **Factory Operating System**. Users can plan complex factories, trace logistics saturation, manage discrete power grids with fuse logic, copy/paste relative modular designs, and auto-build manifolds dynamically.

```
                  ┌────────────────────────────────────────┐
                  │          Interactive Canvas            │
                  │  (Pan/Zoom Grid, snap-to-foundation)   │
                  └──────────────────┬─────────────────────┘
                                     │
      ┌──────────────────────────────┼──────────────────────────────┐
      ▼                              ▼                              ▼
┌───────────┐                  ┌───────────┐                  ┌───────────┐
│ Logistics │                  │   Power   │                  │  Arrays   │
│ Sim &     │◄───(Throughput)──┤ Network   │◄───(Power Draw)──┤ & Zooping │
│ Belts     │                  │ & Switches│                  │  CAD      │
└───────────┘                  └───────────┘                  └───────────┘
```

---

## 🚀 Feature Catalog by Phase

### 🧱 Phase 1: Interactive Canvas & Foundations
Established the core graphical workspace, snap-to-grid placement engine, and individual building lifecycle.
* **CAD-Style Canvas Workspace**: Pan (`Left-click + Drag` or `Middle-click + Drag`) and zoom (`Mouse Wheel` from `20%` to `200%`) around an infinite, high-performance vector grid layout.
* **FICSIT Snapping Grid**: Placed buildings automatically snap to standard **8m × 8m foundation cells** (standard Satisfactory scale) to ensure parallel layouts and structural alignment.
* **Multi-Category Machine Directory**: A categorized sidebar panel holding standard buildings in order of complexity:
  * *Extraction*: Miners (Mk.1–Mk.3), Water Extractors, Oil Extractors, Resource Well Pressurizers.
  * *Production*: Smelters, Constructors, Foundries, Assemblers, Manufacturers, Refineries, Blenders, Packagers, Particle Accelerators, Quantum Encoders, Converters.
  * *Logistics*: Conveyor Splitters, Conveyor Mergers, Smart Splitters, Programmable Splitters.
  * *Storage*: Industrial Storage Containers, Fluid Buffers.
  * *Power*: Biomass Burners, Coal Generators, Fuel Generators, Nuclear Power Plants, Power Poles, Power Switches.
* **Precise Rotational Snapping**: Rotate structures in 90-degree steps (`R` key or rotate button) prior to or after placement, updating input/output port positions automatically.
* **Machine Inspector Panel**: Select any individual machine to:
  * View current nominal input/output flows.
  * Adjust custom **Overclocking slider** (`1%` to `250%`) with power scaling based on the game's exact non-linear exponent formula ($P_{\text{new}} = P_{\text{nominal}} \times (\text{Clock Ratio})^{1.321}$).
  * Configure custom recipes with instant extraction and manufacturing rates.

---

### 🔀 Phase 2: Logistics, Belt Simulator, & Flow Inspector
Introduced visual routing, flow-rate calculations, and bottleneck diagnostic analytics.
* **Direct Belt Drawing**: Click on any machine output port (belt or pipe) and drag to an input port to form direct routing lines. Validates medium compatibility (e.g., cannot connect pipes to conveyor ports) and prevents invalid connections (input-to-input, output-to-output).
* **Multi-Tier Conveyors**: Toggle placed belts across standard game performance tiers:
  * **Mk.1**: 60 items/min
  * **Mk.2**: 120 items/min
  * **Mk.3**: 270 items/min
  * **Mk.4**: 480 items/min
  * **Mk.5**: 780 items/min
  * **Mk.6**: 1200 items/min
* **Logistics Saturation Inspector**: Clicking any conveyor belt brings up the **Belt Inspector**, showcasing:
  * Current carried items/min.
  * Conveyor flow capacity.
  * Visual saturation indicators: **OK** (under 80% load), **Warning** (80%–99% load), or **Maxed/Full** (100% capacity).
* **Live Starvation & Bottleneck Detection**: The simulation engine traces downstream rates. If a machine's recipe requires input faster than the incoming belts can deliver, it marks the machine as **Starved** (pulsing orange notification in UI) and scales down production efficiency accordingly.

---

### ⚡ Phase 3 & 3.5: Power Grid & Circuit Breaker Logic
Simulates realistic electricity lines, isolated sub-nets, generator fuel selections, and real-time diagnostic telemetry.
* **Power Cable Networks**: Hook up electrical connections between generators, power poles, power switches, and consumers.
* **Dynamic Grid Isolation (Connected Components)**: Utilizes a recursive **Breadth-First Search (BFS)** traversal algorithm to split the entire factory's wiring into discrete, isolated power networks.
* **Fuse-Tripping Simulator**: If a specific sub-grid's total electrical consumption (scaled for overclocking) exceeds the active generators' combined capacity, **the fuse trips**. Tripped sub-grids immediately halt, cutting power to consumer machines, triggering visual flashing warnings, and displaying a `fuse_tripped` state.
* **Multifuel Biomass Burners**: Expand biomass burner configurations in the Inspector by choosing from five fuel types, each with game-accurate outputs:
  * Leaves: 15 MW
  * Wood: 20 MW
  * Mycelia: 20 MW
  * Biomass: 25 MW
  * Solid Biofuel: 30 MW
* **FICSIT Power Switches**: Placed inline between electrical networks to function as mechanical circuit breakers. Toggling a switch ON/OFF isolates connected nets without needing to delete and rebuild cables, enabling modular base control.
* **Animated SVG Telemetry Charts**: Click on any power pole or generator to load a live **Power Inspector** featuring dynamic line graphs detailing:
  * Total Grid Production (MW)
  * Real-time Grid Consumption/Load (MW)
  * Tripping Threshold / Capacity Limit (MW)

---

### 🟦 Phase 4: Machine Arrays & Factory CAD Utilities
Upgrades the sandbox into a high-throughput layout engine designed for bulk planning and streamlined optimization.
* **Drag-to-Select Bounding Box**: Left-click and drag on empty canvas space to draw a semi-transparent cyan bounding box. On release, all machines within the box are added to a multi-selection group, outlined by active **pulsing cyan dashed selection rings**.
* **Shift + Click Toggle Selection**: Toggle individual machines in and out of the active selection pool without clearing the rest of your selections.
* **Select All (`Ctrl + A`)**: Instantly captures all placed machines on the canvas to speed up broad-phase operations.
* **Zoop Linear Array Stamping**: 
  * Activate Place Mode, hold `Shift`, and click to set an anchor position.
  * Drag the cursor along the horizontal or vertical axis to preview a line of cyan ghost machine templates.
  * A count badge (e.g., `×6`) shows total length. Click to instantly construct the entire linear chain!
* **Blueprint Clipboard & Copy-Paste (`Ctrl + C` / `Ctrl + V`)**:
  * Copy multi-selected layouts directly to an in-memory clipboard.
  * The copy routine maps machine types, relative coordinate offsets, rotations, assigned recipes, and custom overclock values relative to the top-left-most selected machine.
  * Press `Ctrl + V` to enter paste mode, rendering a purple layout preview that follows the cursor and stamps down with single-click precision.
* **Array Inspector Panel**: Mounts when two or more buildings are active in the selection pool:
  * Sync overclock values across all selected buildings simultaneously using a unified slider.
  * Wipe recipes from all selected machines at once.
  * Execute bulk deletions of multiple buildings alongside their connected logistics lines and electrical cables.
* **Auto-Manifold Builder Engine**:
  * Select a group of machines aligned in a row/column.
  * Toggle between **Input (Splitter Manifold)** or **Output (Merger Manifold)** configurations.
  * Choose a target Conveyor Belt tier (Mk.1–Mk.6).
  * Click **Construct Manifold** — the engine automatically detects target ports, aligns splitters/mergers exactly 2 grid steps in front of the ports, hooks up direct feeds, and daisy-chains the manifold nodes together in a perfect line, ignoring colliding layout obstacles gracefully.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Context | Action |
|---|---|---|
| `Ctrl + A` | Selection Mode | Select all placed machines on the canvas |
| `Ctrl + C` | Selection Mode | Copy active single or multi-selection layout to clipboard |
| `Ctrl + V` | Anywhere | Enter Paste mode (purple ghost preview) |
| `Shift + Left-click` | Selection Mode | Toggle individual machine in or out of the current selection |
| `Shift + Left-click` | Placement Mode | Establish anchor and begin **Zoop** linear array stamp |
| `R` | Placement/Selected | Rotate building template in 90-degree clockwise steps |
| `ESC` | Anywhere | Cancel active Zoop/Paste mode, clear selections, or go back |

---

## 🗂️ File Mapping & Code Architecture

The FICSIT Sandbox strictly splits logic between a **pure mathematical simulation engine** and a **responsive user interface** mapping to the framework standards:

```
src/
├── engine/sandbox/                # 🧠 Pure Engine Layer (Zero React/DOM)
│   ├── types.ts                   # Core grid, machine, port, and simulation types
│   ├── machineRegistry.ts         # Footprints, categories, accent colors, max connections
│   ├── snapping.ts                # Snap-to-grid offsets and collision math
│   ├── simulation.ts              # Flow solvers, BFS power grids, and load calculations
│   └── serializer.ts              # Reducers for placing, copying, manifolds, and state
│
└── components/Sandbox/            # 🎨 UI & Rendering Layer (React & CSS)
    ├── SandboxTab.tsx             # Entry tab shell; mounts Canvas and active sidebar
    ├── SandboxCanvas.tsx          # Main SVG grid canvas, drag-selection, Zoop, and lines
    ├── SandboxSidebar.tsx         # Sidebar selector with categorized machine assets
    ├── SandboxStatusBar.tsx       # Bottom HUD showing grid stats, zoom, and active modes
    ├── SandboxToolbar.tsx         # Quick tool toggles (pan, wire, belt, grid overlay)
    ├── MachineInspector.tsx       # Standard right sidebar for single-machine configuration
    ├── ArrayInspector.tsx         # Multi-select sidebar with bulk overclock & manifolds
    ├── PowerInspector.tsx         # SVG diagnostic telemetry charts for power pole nodes
    └── BeltInspector.tsx          # Belt configuration, upgrade controls, and load metrics
```

---

> **Note on Save File Integrity**: The FICSIT Sandbox serializes its complete state into local storage. All serialization systems are fully backward compatible — updates to machine footprints, recipes, or routing formulas preserve existing user grids and saved factory templates.

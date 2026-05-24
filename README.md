<div align="center">

# Factory Visual Planner & Save Game Analyzer

### A high-performance, responsive web utility for [Satisfactory](https://www.satisfactorygame.com/)

Plan, optimize, audit, and visualize your industrial complexes — from theoretical production lines to real-world save game states.

</div>

---

## 📖 Deep Architectural Documentation

This repository houses a comprehensive, industrial-grade codebase for factory visual planning. To explore our developer logs and specific coding standards, you can navigate directly to the detailed documentation files in the [.ai/](.ai) folder:

* **[System Architecture](.ai/architecture.md)**: Conceptual layouts of the Engine and Component layers.
* **[Technical Decisions Log](.ai/decisions.md)**: Architectural justifications, framework choices, and optimization strategies.
* **[Active Feature Tasks List](.ai/current_tasks.md)**: The current production goals, planned systems, and checklists.
* **[Changelog & Version History](.ai/changelog.md)**: A complete chronological history of feature rollouts and patches.
* **[AI Coding Rules](.ai/coding_rules.md)**: Mandated principles for SOLID code, DRY logic, and loose coupling.

---

## 🛠️ The Core Engines Under the Hood

The application is structured with strict **separation of concerns**, dividing UI rendering from complex mathematical models and file binary streams. The heavy lifting is handled within a high-performance, modular engine layer located in `src/engine/`.

### 1. The Recursive Production Solver (`src/engine/solver.ts`)
The Solver is a high-speed engine designed to recursively resolve complex recipe trees:
* **Dynamic Node Resolution**: Given a target item (e.g. Heavy Modular Frame) and production rate, it traces all upstream ingredients, calculates the exact fractional machine counts, and resolves alternate recipe paths.
* **Extraction Adjustments**: Automatically scales raw extraction miners (Miner Mk.1, Mk.2, Mk.3) and oil/water extractors based on tier and active overclock speeds.
* **Byproduct Aggregation**: Properly isolates and tracks industrial byproducts (such as heavy oil residue or water outputs) alongside the primary production lines.

### 2. Smart Hybrid Logistics Mapper (`src/engine/graphMapper.ts`)
Converts the output of the recursive solver into beautiful, interactive ReactFlow graph nodes and edges with load-balanced parallel belt calculations:
* **Aggregated View (High-Level Clean)**: Draws a single, clean logistics edge connection between machine clusters to prevent visual clutter. If the rate exceeds the active belt capacity, the label dynamically displays a multi-belt count indicator (e.g. `960.0/min (2x Mk.5 Belt)`).
* **Machine View / Expanded (Literal Physical Routing)**: Splits overloaded connections into `N` separate parallel connections carrying equal parts of the load, rendered with a clean `24px` Y-axis offset so paths run parallel and do not overlap.

### 3. FICSIT Diagnostics System ("AI Factory Inspector")
An automated system auditing theoretical plans and real saves to identify:
* **Logistics Bottlenecks**: Flags overloaded conveyor segments carrying more than their current tier support, recommending exact target upgrade tiers (Mk.2 to Mk.5) or physical load-splitting.
* **Overload & Splitting Safeguards**: Hides redundant upgrade buttons when the maximum belt limit is reached, guiding users to physically split the load.
* **Machine Stalls**: Identifies machine starvation, output clogged manifolds, and fractional standby energy waste.
* **Grid Stability Audits**: Sums machine consumption against generator output, calculating grid margins, battery backup reserves, and blackout risks.

### 4. Browser-Based Binary Save Parser (`src/engine/saveParser.ts`)
A super-fast parser that reads raw Satisfactory binary `.sav` files directly in the browser using binary array buffers, with zero backend dependency:
* **Decompression**: Automatically decompresses zipped save files.
* **Entity Extraction**: Reconstructs your complete factory state, mapping every conveyor segment, machine coordinates, fluid buffers, train stops, and power poles.
* **Circuit Detection (`powerCircuitDetector.ts`)**: Traverses power lines to construct your actual electrical grid map.
* **Biome Classifier (`biomeDetector.ts`)**: Resolves coordinates to active world zones (e.g. Dune Desert, Rocky Desert).

---

## 🌟 Key Features

* **Theoretical Production Planner (Flow A)**: Interactively input recipe targets, toggle miner tiers, set conveyor speed baselines, and examine dynamic ReactFlow graphs.
* **Real Save File Diagnostics (Flow B)**: Drag-and-drop your `.sav` files to instantly simulate active pipelines, find clogged manifolds, and review power stability.
* **Circular Health Score Meter**: Circular SVG gauge visually summarizing factory health (0–100) based on grid reserves, logistics speed, and uptime.
* **Interactive Cartography Map**: Coordinates mapping translations that plot your parsed real-world factory nodes, fluid lines, and electrical networks overlays on top of an interactive map.
* **Collaborative Plan Sharing**: Generates short URL hashes encoding your entire plan (item, rate, recipe choices, layout styles) for instant sharing.

---

## ⚡ Technical Stack

* **Core**: React 19 + TypeScript (typed data structures)
* **Build Suite**: Vite (fast caching and bundle splits)
* **Visualizations**: React Flow (`@xyflow/react`) + Dagre Layout Engine
* **Cartography**: Leaflet Interactive Map
* **Animations**: CSS Transition Keyframes + Motion
* **Styling**: Tailwind CSS v4 ( harmonized FICSIT orange and dark theme system)

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.0 or later)

### Installation
```bash
# Clone the repository
git clone https://github.com/pratyanj/Satisfactory_tool.git
cd Satisfactory_tool

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
```
The application will boot at `http://localhost:3000` (or `http://localhost:3001` if port 3000 is occupied).

### Production Bundle
```bash
# Build optimized production bundle
npm run build

# Preview build locally
npm run preview
```

---

## 🔒 License
Licensed under the permissive **Apache License 2.0**. See the [LICENSE](LICENSE) file for the full legal agreement.

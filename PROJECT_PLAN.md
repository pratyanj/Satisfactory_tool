# Satisfactory Factory Visual Planner - Project Status & Roadmap

## 1. Current Project Status & Achievements

The project is a functional React/Vite application that calculates and visualizes production lines for the game Satisfactory.

### Core Features Achieved:
- **Calculation Engine (`solver.ts`)**: 
  - Recursively calculates required rates, machine counts, and inputs needed for any given item and target rate.
  - Automatically adjusts extraction rates based on the selected miner level (Mk.1, Mk.2, Mk.3).
  - Summarizes data including total power consumption, raw inputs required, machines needed, all intermediate item rates, and per-building detail breakdowns.
- **Visual Graph (`graphMapper.ts` & `FactoryGraph.tsx`)**:
  - Maps the calculated production tree into nodes and edges for rendering with `reactflow`.
  - Supports two layout modes: **Aggregated View** (groups same recipes) and **Expanded View** (machine-level).
- **4-Tab Navigation System**:
  - **Network graph**: Interactive flowchart visualization with drag, zoom, grouping, and export.
  - **Tree list**: Hierarchical collapsible tree view of the production chain with machine icons and rates.
  - **Items**: Flat list of all items needed per minute (sorted by rate, descending).
  - **Buildings**: Breakdown of each building type, what it produces, total aggregation, and power footer.
- **User Interface (`App.tsx` & `InputForm.tsx`)**:
  - Clean, dark-themed UI matching Satisfactory's aesthetic.
  - A form to input target item, rate, miner type, and belt speed.
  - Generates shareable URL hashes for plans.
  - State management for toggling between 4 view tabs.

---

## 2. Implementation Status

### ✅ Phase 1: State Management & UI Shell Updates — COMPLETE
- Updated `mainTab` state in `App.tsx` to handle 4 tabs: `'network_graph' | 'tree_list' | 'items' | 'buildings'`.
- Replaced the old 2-button toggle with a full-width, dark-themed tab bar at the top of the main content area.
- Active tab has distinct background and orange underline indicator.

### ✅ Phase 2: Engine Enhancements — COMPLETE
- Added `allItemRates` to `SummaryData` — aggregates every item's units/min in the production chain.
- Added `buildingDetails` to `SummaryData` — maps each machine type to its count and produced items.
- Fixed critical `Object.prototype.constructor` collision bug by using `Object.create(null)` for all accumulator dictionaries.

### ✅ Phase 3: "Tree list" Tab — COMPLETE
- Created `TreeList.tsx` component.
- Recursively renders the `SolverNode` tree with collapsible nodes, machine icons, counts, rates, and connector lines.
- Power footer at the bottom.

### ✅ Phase 4: "Items" Tab — COMPLETE
- Created `ItemsTab.tsx` component.
- Displays sorted list of all items needed per minute with icons.
- "Needed per minute" header and power footer.

### ✅ Phase 5: "Buildings" Tab — COMPLETE
- Created `BuildingsTab.tsx` component.
- Shows each building type with count, icon, and inline produced items with icons.
- "Total:" aggregate section at the bottom.
- Power footer.

### ✅ Phase 6: Polish and Cleanup — COMPLETE
- All CSS for new components in `index.css`.
- Responsive design across all tabs.
- Shareable links work correctly.
- Defensive NaN handling in Summary.tsx.

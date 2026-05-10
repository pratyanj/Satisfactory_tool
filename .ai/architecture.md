# Project Architecture

## Overview
This is a React-based application (Satisfactory Tool) that serves as a calculator, save game analyzer, and visualizer for the game Satisfactory. It includes features for viewing recipes, planning production lines, analyzing save files, and viewing an interactive resource map.

## Technology Stack
- **Frontend Framework:** React (with TypeScript)
- **Build Tool:** Vite
- **Styling:** CSS (`index.css`), possibly some styled-components or CSS modules (to be verified).
- **Data Visualization:** Cytoscape or similar graph library (implied by `src/engine/graphMapper.ts` and `src/components/Graph`).

## Directory Structure

```
src/
├── components/      # React UI components
│   ├── Graph/       # Network graph visualization components
│   ├── Map/         # Interactive world map components
│   ├── ...          # Various other UI components (Tabs, Modals, Forms)
├── engine/          # Core logic and calculation engines
│   ├── biomeDetector.ts      # Detects biomes from coordinates
│   ├── buildingClassifier.ts # Classifies buildings from save data
│   ├── data.ts               # Core data structures and utility data
│   ├── graphMapper.ts        # Maps game data/calculations to graph structures
│   ├── powerCircuitDetector.ts # Analyzes power grids from save data
│   ├── saveParser.ts         # Parses Satisfactory save game files
│   └── solver.ts             # Calculates production rates, inputs, outputs
├── types/           # TypeScript interface and type definitions
├── App.tsx          # Main application component and routing
├── main.tsx         # Application entry point
└── index.css        # Global styles
```

## Key Modules
1. **Engine Layer:** Handles all heavy lifting: parsing save files (`saveParser`), calculating production chains (`solver`), classifying game entities (`buildingClassifier`), and mapping data for visualization (`graphMapper`).
2. **Component Layer:** React components that consume data from the engine. Includes a dashboard, item browser, map view, and network graph view.

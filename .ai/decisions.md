# Technical Decisions

This document tracks important architectural and technical decisions made during the development of the Satisfactory Tool.

## Core Stack
- **React with TypeScript:** Chosen for strong typing, component reusability, and manageable state.
- **Vite:** Used for fast development builds and optimized production bundling.

## Application Architecture
- **Separation of Concerns:** The core logic (parsing, calculating, mapping) is separated into a dedicated `src/engine/` directory. This keeps the React components in `src/components/` focused solely on UI and presentation.

## Features & Implementation
- **Interactive Map:** The world map uses an interactive image approach with specific coordinate mapping (`resource_map_location.py` to UE4 cm mapping) to display resource nodes accurately on top of a static map image.
- **Save File Parsing:** A custom parser (`saveParser.ts`) reads raw Satisfactory save files directly in the browser to extract factory data, power networks, and inventory without needing a backend server.
- **Graph Visualization:** The factory logistics and production chains are visualized using a network graph view, separating complex logistics from the machine view for clarity.

## UI/UX
- **Component Design:** Cards and elements are designed to be compact. Secondary information (like detailed input/output ratios) is often hidden by default and revealed via hover or click to keep the UI clean.

# AI Changelog

This document tracks major changes made by the AI across sessions to maintain context.

## [2026-05-23]
- **Documentation:** Analyzed the entire codebase and created `CHATGPT_CONTEXT.md` in the project root. This file provides high-fidelity specifications, file trees, design rules, core component architectures, math solver details, and immersive game-themed new feature ideas, acting as an optimal system prompt context file for ChatGPT.
- **UI & Logistics Re-alignments:** (Previous session updates preserved) Re-aligned `FactoryGraph.tsx` and `LogisticsNode.tsx` conveyor manifolds. Redesigned navigation controls to use translucent glowing neon-themed HUD buttons, and transformed the input form into an industrial console. Single top viewMode toggle added in `ItemDetail.tsx`.

## [2026-05-09]
- **Documentation:** Created the `.ai/` memory directory structure to persist context across AI sessions. Added `PROJECT_CONTEXT.md` to root.
- **Git:** Organized and committed recent project changes into granular, logical commits.

## [2026-05-08]
- **Map System:** Fixed resource node locations by implementing a conversion script to use verified Unreal Engine world coordinates (UE4 cm) instead of estimated coordinates.

## [2026-05-06]
- **Map UI:** Resolved blank map rendering issue. Implemented `MapImageLoader` to handle the large map asset and provide loading feedback.

## [2026-04-29]
- **UI Refinement:** Optimized the Machine Card UI in the graph view. Reduced width and added hover-based visibility for detailed stats.
- **Graph Visualization:** Refined the Network Graph to eliminate disconnected nodes and separated complex logistics from the primary machine view.
- **Bug Fix:** Resolved runtime crash (`detail.produces is undefined`).

## [2026-04-28]
- **Documentation:** Created comprehensive `README.md` explaining the tool, installation, and featuring screenshots of the tabs.

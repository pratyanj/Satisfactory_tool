# Graph Engine Summary

## Files
- `src/engine/graphMapper.ts`
- `src/components/Graph/`

## Purpose
The graph engine takes the parsed save data or calculator results and transforms it into a node-edge format suitable for rendering by a graph library.

## Key Flow
1. Receives a list of connected machines and their inputs/outputs.
2. Generates distinct Nodes for each machine or logical block.
3. Generates Edges representing the flow of items (belts) or fluids (pipes) between machines.
4. UI components consume this mapped data to render the interactive layout.

## Notes
- Logistics nodes (splitters, mergers) can clutter the graph. There is logic to simplify the view (Machine View) vs showing all raw connections (Aggregated/Logistics View).

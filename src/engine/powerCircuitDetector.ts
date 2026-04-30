/**
 * powerCircuitDetector.ts
 * Groups buildings into power circuits using BFS on power line adjacency.
 * Each circuit gets a unique color for map visualization.
 */

import type { SaveBuilding, SavePowerLine } from '../types/save';

export interface PowerCircuit {
  id: number;
  color: string;
  buildingInstanceNames: Set<string>;
  poleCount: number;
}

// Palette of distinct circuit colors (dark-theme friendly)
const CIRCUIT_COLORS = [
  '#f97316', '#22c55e', '#3b82f6', '#a855f7',
  '#ec4899', '#14b8a6', '#f59e0b', '#06b6d4',
  '#84cc16', '#ef4444', '#8b5cf6', '#10b981',
  '#fb923c', '#34d399', '#60a5fa', '#c084fc',
];

const POWER_POLE_KEYWORDS = [
  'PowerLine', 'PowerPole', 'Build_PowerPoleMk',
  'Build_PowerPoleWall', 'Build_PowerPoleWallDouble',
  'Build_PowerTower', 'Build_GeneratorCoal', 'Build_GeneratorFuel',
  'Build_GeneratorNuclear', 'Build_GeneratorBiomass',
  'Build_GeneratorGeoThermal', 'Build_PowerStorageMk1',
  'Build_PowerSwitch',
];

function isPowerRelevant(typePath: string): boolean {
  return POWER_POLE_KEYWORDS.some(k => typePath.includes(k));
}

/**
 * Build an adjacency map: instanceName → set of connected instanceNames
 * Connection is via shared position proximity (within ~500cm = 5m).
 */
function buildAdjacency(
  buildings: SaveBuilding[],
  powerLines: SavePowerLine[],
): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();

  // Init with power-relevant buildings only
  const powerBuildings = buildings.filter(b => isPowerRelevant(b.typePath));
  for (const b of powerBuildings) {
    adj.set(b.instanceName, new Set());
  }

  // Build a position → instanceName lookup for quick nearest-neighbour
  const posIndex = new Map<string, string>();
  const SNAP = 500; // 5 metres in cm
  for (const b of powerBuildings) {
    const key = `${Math.round(b.position.x / SNAP)}_${Math.round(b.position.y / SNAP)}_${Math.round(b.position.z / SNAP)}`;
    posIndex.set(key, b.instanceName);
  }

  // Power lines connect start→end positions; find the nearest building to each endpoint
  for (const pl of powerLines) {
    const startKey = `${Math.round(pl.startPosition.x / SNAP)}_${Math.round(pl.startPosition.y / SNAP)}_${Math.round(pl.startPosition.z / SNAP)}`;
    const endKey   = `${Math.round(pl.endPosition.x   / SNAP)}_${Math.round(pl.endPosition.y   / SNAP)}_${Math.round(pl.endPosition.z   / SNAP)}`;
    const a = posIndex.get(startKey);
    const b = posIndex.get(endKey);
    if (a && b && a !== b) {
      adj.get(a)?.add(b);
      adj.get(b)?.add(a);
    }
  }

  return adj;
}

/** BFS-based connected component detection */
export function detectCircuits(
  buildings: SaveBuilding[],
  powerLines: SavePowerLine[],
): PowerCircuit[] {
  const adj   = buildAdjacency(buildings, powerLines);
  const visited = new Set<string>();
  const circuits: PowerCircuit[] = [];
  let id = 0;

  for (const [startNode] of adj) {
    if (visited.has(startNode)) continue;

    const circuit: PowerCircuit = {
      id,
      color: CIRCUIT_COLORS[id % CIRCUIT_COLORS.length],
      buildingInstanceNames: new Set(),
      poleCount: 0,
    };

    const queue = [startNode];
    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node)) continue;
      visited.add(node);
      circuit.buildingInstanceNames.add(node);
      circuit.poleCount++;
      for (const neighbour of adj.get(node) ?? []) {
        if (!visited.has(neighbour)) queue.push(neighbour);
      }
    }

    // Only include circuits with at least 2 nodes
    if (circuit.poleCount >= 2) {
      circuits.push(circuit);
      id++;
    }
  }

  return circuits;
}

/** Get circuit color for a given building instanceName */
export function getBuildingCircuitColor(
  instanceName: string,
  circuits: PowerCircuit[],
): string | null {
  for (const circuit of circuits) {
    if (circuit.buildingInstanceNames.has(instanceName)) return circuit.color;
  }
  return null;
}

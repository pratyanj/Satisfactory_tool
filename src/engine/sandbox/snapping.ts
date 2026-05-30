/**
 * FICSIT Sandbox — Grid Snapping Utilities
 *
 * Pure math functions — no DOM, no React, fully unit-testable.
 */

import type { GridPosition, MachineFootprint, SandboxMachine, SandboxState } from './types';

// ─── Coordinate Conversion ─────────────────────────────────────────────────────

/**
 * Convert pixel coordinates (relative to canvas origin) → grid cell.
 * Accounts for current viewport offset and zoom.
 */
export function pixelToGrid(
  pixelX: number,
  pixelY: number,
  viewOffset: { x: number; y: number },
  zoom: number,
  cellSize: number
): GridPosition {
  const worldX = (pixelX - viewOffset.x) / zoom;
  const worldY = (pixelY - viewOffset.y) / zoom;
  return {
    col: Math.floor(worldX / cellSize),
    row: Math.floor(worldY / cellSize),
  };
}

/**
 * Convert a grid position → pixel coordinates of the cell's top-left corner.
 */
export function gridToPixel(
  col: number,
  row: number,
  viewOffset: { x: number; y: number },
  zoom: number,
  cellSize: number
): { x: number; y: number } {
  return {
    x: col * cellSize * zoom + viewOffset.x,
    y: row * cellSize * zoom + viewOffset.y,
  };
}

/**
 * Snap a pixel position to the nearest grid cell top-left, then convert back to pixels.
 */
export function snapPixelToGrid(
  pixelX: number,
  pixelY: number,
  viewOffset: { x: number; y: number },
  zoom: number,
  cellSize: number
): { x: number; y: number } {
  const gridPos = pixelToGrid(pixelX, pixelY, viewOffset, zoom, cellSize);
  return gridToPixel(gridPos.col, gridPos.row, viewOffset, zoom, cellSize);
}

// ─── Collision Detection ───────────────────────────────────────────────────────

/** Returns all grid cells occupied by a machine at the given position */
export function getOccupiedCells(
  position: GridPosition,
  footprint: MachineFootprint
): GridPosition[] {
  const cells: GridPosition[] = [];
  for (let dc = 0; dc < footprint.width; dc++) {
    for (let dr = 0; dr < footprint.height; dr++) {
      cells.push({ col: position.col + dc, row: position.row + dr });
    }
  }
  return cells;
}

/** Build a Set of occupied cell keys (fast lookup) */
function buildOccupiedSet(machines: SandboxMachine[], footprints: Map<string, MachineFootprint>, excludeId?: string): Set<string> {
  const set = new Set<string>();
  for (const machine of machines) {
    if (machine.instanceId === excludeId) continue;
    const fp = footprints.get(machine.machineId) ?? { width: 1, height: 1 };
    for (const cell of getOccupiedCells(machine.position, fp)) {
      set.add(`${cell.col},${cell.row}`);
    }
  }
  return set;
}

/**
 * Returns true if a machine can be placed at the given position without
 * overlapping existing machines.
 *
 * @param footprints - Map from machineId to MachineFootprint (pass from registry)
 * @param excludeId - Optionally exclude a specific machine from collision check (useful for move)
 */
export function canPlace(
  state: SandboxState,
  machineId: string,
  position: GridPosition,
  footprint: MachineFootprint,
  footprints: Map<string, MachineFootprint>,
  excludeId?: string
): boolean {
  // Prevent negative grid positions
  if (position.col < 0 || position.row < 0) return false;

  const occupied = buildOccupiedSet(state.machines, footprints, excludeId);
  const candidates = getOccupiedCells(position, footprint);

  for (const cell of candidates) {
    if (occupied.has(`${cell.col},${cell.row}`)) return false;
  }
  return true;
}

// ─── Port Position Helpers ────────────────────────────────────────────────────

/**
 * Get the pixel position of a port dot on the canvas.
 * relX/relY are fractions (0–1) relative to the machine's bounding box.
 */
export function portToPixel(
  machineCol: number,
  machineRow: number,
  footprint: MachineFootprint,
  relX: number,
  relY: number,
  viewOffset: { x: number; y: number },
  zoom: number,
  cellSize: number
): { x: number; y: number } {
  const machinePixelWidth  = footprint.width  * cellSize * zoom;
  const machinePixelHeight = footprint.height * cellSize * zoom;
  const originX = machineCol * cellSize * zoom + viewOffset.x;
  const originY = machineRow * cellSize * zoom + viewOffset.y;
  return {
    x: originX + relX * machinePixelWidth,
    y: originY + relY * machinePixelHeight,
  };
}

// ─── Viewport Helpers ─────────────────────────────────────────────────────────

/**
 * Clamp zoom within reasonable bounds.
 */
export function clampZoom(zoom: number): number {
  return Math.max(0.15, Math.min(3.0, zoom));
}

/**
 * Zoom toward a pivot point (mouse position) without changing what's under the cursor.
 */
export function zoomAroundPoint(
  currentOffset: { x: number; y: number },
  currentZoom: number,
  newZoom: number,
  pivotX: number,
  pivotY: number
): { x: number; y: number } {
  const scale = newZoom / currentZoom;
  return {
    x: pivotX + (currentOffset.x - pivotX) * scale,
    y: pivotY + (currentOffset.y - pivotY) * scale,
  };
}

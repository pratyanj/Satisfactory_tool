/**
 * FICSIT Sandbox — State Serializer
 *
 * Handles save/load of sandbox layouts to localStorage and URL share hashes.
 */

import type { SandboxState, SandboxAction, SandboxMachine, ClipboardEntry, BlueprintEntry, SandboxPowerLine } from './types';
import { getMachineFootprint, getMachinePorts, getMachineMaxConnections } from './machineRegistry';
import { canPlace } from './snapping';

const STORAGE_KEY = 'ficsit_sandbox_v1';
const BLUEPRINT_KEY = 'ficsit_blueprints_v1';

export function loadBlueprints(): BlueprintEntry[] {
  try {
    return JSON.parse(localStorage.getItem(BLUEPRINT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveBlueprint(entry: BlueprintEntry): void {
  try {
    const list = loadBlueprints();
    list.push(entry);
    localStorage.setItem(BLUEPRINT_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('[Sandbox] Failed to save blueprint', e);
  }
}

export function deleteBlueprint(id: string): void {
  try {
    const list = loadBlueprints().filter((b) => b.id !== id);
    localStorage.setItem(BLUEPRINT_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('[Sandbox] Failed to delete blueprint', e);
  }
}

// ─── ID Generator ─────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── Footprint Map (for collision checks in manifold generation) ──────────────

function buildFootprintMap(machines: SandboxMachine[]) {
  const map = new Map<string, { width: number; height: number }>();
  for (const m of machines) {
    map.set(m.machineId, getMachineFootprint(m.machineId));
  }
  return map;
}

export const DEFAULT_STATE: SandboxState = {
  machines: [],
  belts: [],
  powerLines: [],
  selectedMachineId: null,
  selectedMachineIds: [],
  selectedBeltId: null,
  selectedPowerLineId: null,
  clipboard: null,
  viewOffset: { x: 80, y: 80 },
  zoom: 1.0,
  cellSize: 64,
  showGrid: true,
};

// ─── LocalStorage ─────────────────────────────────────────────────────────────

export function saveToLocalStorage(state: SandboxState): void {
  try {
    // Strip transient UI state before persisting
    const persisted: SandboxState = {
      ...state,
      selectedMachineId: null,
      selectedMachineIds: [],
      selectedBeltId: null,
      selectedPowerLineId: null,
      clipboard: null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch (e) {
    console.warn('[Sandbox] Failed to save to localStorage', e);
  }
}

export function loadFromLocalStorage(): SandboxState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SandboxState;
    // Merge with defaults so new fields added in future versions are present
    return { ...DEFAULT_STATE, ...parsed };
  } catch (e) {
    console.warn('[Sandbox] Failed to load from localStorage', e);
    return null;
  }
}

// ─── URL Share Hash ───────────────────────────────────────────────────────────

/**
 * Serialize only the layout (machines + belts) into a base64 URL fragment.
 * Viewport state is excluded to make shared URLs start with a clean view.
 */
export function generateShareHash(state: SandboxState): string {
  const payload = {
    m: state.machines,
    b: state.belts,
    p: state.powerLines ?? [],
  };
  return encodeURIComponent(btoa(JSON.stringify(payload)));
}

export function loadFromShareHash(hash: string): Partial<SandboxState> | null {
  try {
    const decoded = JSON.parse(atob(decodeURIComponent(hash)));
    return {
      machines: decoded.m ?? [],
      belts:    decoded.b ?? [],
      powerLines: decoded.p ?? [],
    };
  } catch (e) {
    console.warn('[Sandbox] Failed to parse share hash', e);
    return null;
  }
}

// ─── Sandbox Reducer ──────────────────────────────────────────────────────────

export function sandboxReducer(state: SandboxState, action: SandboxAction): SandboxState {
  switch (action.type) {
    case 'PLACE_MACHINE':
      return {
        ...state,
        machines: [...state.machines, action.machine],
        selectedMachineId: action.machine.instanceId,
        selectedMachineIds: [],
      };

    case 'MOVE_MACHINE':
      return {
        ...state,
        machines: state.machines.map((m) =>
          m.instanceId === action.instanceId
            ? { ...m, position: action.position }
            : m
        ),
      };

    case 'ROTATE_MACHINE':
      return {
        ...state,
        machines: state.machines.map((m) => {
          if (m.instanceId !== action.instanceId) return m;
          const next = ((m.rotation + 90) % 360) as 0 | 90 | 180 | 270;
          return { ...m, rotation: next };
        }),
      };

    case 'DELETE_MACHINE':
      return {
        ...state,
        machines: state.machines.filter((m) => m.instanceId !== action.instanceId),
        belts: state.belts.filter(
          (b) =>
            b.from.machineInstanceId !== action.instanceId &&
            b.to.machineInstanceId   !== action.instanceId
        ),
        powerLines: state.powerLines.filter(
          (pl) =>
            pl.fromMachineId !== action.instanceId &&
            pl.toMachineId   !== action.instanceId
        ),
        selectedMachineId:
          state.selectedMachineId === action.instanceId ? null : state.selectedMachineId,
        selectedMachineIds: state.selectedMachineIds.filter((id) => id !== action.instanceId),
        selectedBeltId: null,
        selectedPowerLineId: null,
      };

    case 'SELECT_MACHINE':
      return {
        ...state,
        selectedMachineId: action.instanceId,
        selectedMachineIds: [],
        selectedBeltId: null,
        selectedPowerLineId: null,
      };

    case 'SELECT_BELT':
      return {
        ...state,
        selectedBeltId: action.beltId,
        selectedMachineId: null,
        selectedMachineIds: [],
        selectedPowerLineId: null,
      };

    case 'SET_BELT_TIER':
      return {
        ...state,
        belts: state.belts.map((b) =>
          b.beltId === action.beltId ? { ...b, tier: action.tier } : b
        ),
      };

    case 'SET_RECIPE':
      return {
        ...state,
        machines: state.machines.map((m) =>
          m.instanceId === action.instanceId
            ? { ...m, recipeId: action.recipeId }
            : m
        ),
      };

    case 'SET_OVERCLOCK':
      return {
        ...state,
        machines: state.machines.map((m) =>
          m.instanceId === action.instanceId
            ? { ...m, overclock: Math.max(1, Math.min(250, action.overclock)) }
            : m
        ),
      };

    case 'TOGGLE_SWITCH':
      return {
        ...state,
        machines: state.machines.map((m) =>
          m.instanceId === action.instanceId
            ? { ...m, switchOn: m.switchOn === false ? true : false }
            : m
        ),
      };

    case 'SET_FUEL':
      return {
        ...state,
        machines: state.machines.map((m) =>
          m.instanceId === action.instanceId
            ? { ...m, fuelId: action.fuelId }
            : m
        ),
      };

    case 'ADD_BELT':
      return { ...state, belts: [...state.belts, action.belt] };

    case 'DELETE_BELT':
      return {
        ...state,
        belts: state.belts.filter((b) => b.beltId !== action.beltId),
        selectedBeltId: state.selectedBeltId === action.beltId ? null : state.selectedBeltId,
      };

    case 'ADD_POWER_LINE':
      return { ...state, powerLines: [...state.powerLines, action.line] };

    case 'DELETE_POWER_LINE':
      return {
        ...state,
        powerLines: state.powerLines.filter((pl) => pl.lineId !== action.lineId),
        selectedPowerLineId: state.selectedPowerLineId === action.lineId ? null : state.selectedPowerLineId,
      };

    case 'SELECT_POWER_LINE':
      return {
        ...state,
        selectedPowerLineId: action.lineId,
        selectedMachineId: null,
        selectedMachineIds: [],
        selectedBeltId: null,
      };

    case 'SET_VIEWPORT':
      return {
        ...state,
        viewOffset: action.offset,
        zoom: action.zoom,
      };

    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };

    case 'LOAD_STATE':
      return action.state;

    case 'CLEAR_ALL':
      return { ...DEFAULT_STATE, viewOffset: state.viewOffset, zoom: state.zoom };

    // ── Phase 4: Multi-Selection & Arrays ──────────────────────────────────────

    case 'SELECT_MULTIPLE_MACHINES':
      return {
        ...state,
        selectedMachineIds: action.instanceIds,
        selectedMachineId: action.instanceIds.length === 1 ? action.instanceIds[0] : null,
        selectedBeltId: null,
        selectedPowerLineId: null,
      };

    case 'SELECT_ADD_MACHINE': {
      const alreadyIn = state.selectedMachineIds.includes(action.instanceId);
      const newIds = alreadyIn
        ? state.selectedMachineIds.filter((id) => id !== action.instanceId)
        : [...state.selectedMachineIds, action.instanceId];
      return {
        ...state,
        selectedMachineIds: newIds,
        selectedMachineId: newIds.length === 1 ? newIds[0] : null,
        selectedBeltId: null,
        selectedPowerLineId: null,
      };
    }

    case 'COPY_SELECTION': {
      // Collect the IDs to copy: prefer multi-select, fallback to single
      const ids =
        state.selectedMachineIds.length > 0
          ? state.selectedMachineIds
          : state.selectedMachineId
          ? [state.selectedMachineId]
          : [];
      if (ids.length === 0) return state;

      const selected = state.machines.filter((m) => ids.includes(m.instanceId));
      const minCol = Math.min(...selected.map((m) => m.position.col));
      const minRow = Math.min(...selected.map((m) => m.position.row));

      const clipboard: ClipboardEntry[] = selected.map((m) => ({
        machineId: m.machineId,
        relCol: m.position.col - minCol,
        relRow: m.position.row - minRow,
        rotation: m.rotation,
        recipeId: m.recipeId,
        overclock: m.overclock,
        fuelId: m.fuelId,
        switchOn: m.switchOn,
      }));

      return { ...state, clipboard };
    }

    case 'LOAD_CLIPBOARD': {
      return {
        ...state,
        clipboard: action.clipboard,
      };
    }

    case 'PLACE_MACHINE_ARRAY': {
      return {
        ...state,
        machines: [...state.machines, ...action.machines],
        selectedMachineIds: action.machines.map((m) => m.instanceId),
        selectedMachineId: null,
      };
    }

    case 'BULK_SET_OVERCLOCK': {
      const idSet = new Set(action.instanceIds);
      return {
        ...state,
        machines: state.machines.map((m) =>
          idSet.has(m.instanceId)
            ? { ...m, overclock: Math.max(1, Math.min(250, action.overclock)) }
            : m
        ),
      };
    }

    case 'BULK_DELETE': {
      const idSet = new Set(action.instanceIds);
      return {
        ...state,
        machines: state.machines.filter((m) => !idSet.has(m.instanceId)),
        belts: state.belts.filter(
          (b) =>
            !idSet.has(b.from.machineInstanceId) &&
            !idSet.has(b.to.machineInstanceId)
        ),
        powerLines: state.powerLines.filter(
          (pl) => !idSet.has(pl.fromMachineId) && !idSet.has(pl.toMachineId)
        ),
        selectedMachineIds: [],
        selectedMachineId: null,
        selectedBeltId: null,
      };
    }

    case 'GENERATE_MANIFOLD': {
      const { machineIds, portType, beltTier } = action;
      const targetMachines = state.machines.filter((m) => machineIds.includes(m.instanceId));
      if (targetMachines.length === 0) return state;

      // Sort machines by position for consistent manifold ordering
      const sorted = [...targetMachines].sort((a, b) =>
        a.position.col !== b.position.col
          ? a.position.col - b.position.col
          : a.position.row - b.position.row
      );

      const newMachines: SandboxMachine[] = [];
      const newBelts: ReturnType<typeof state.belts.slice> = [];

      // We need a footprint map that includes all existing + newly placed machines
      const allMachines = [...state.machines];
      const fpMap = buildFootprintMap(allMachines);

      const manifoldMachineId =
        portType === 'input' ? (action.splitterMachineId ?? 'conveyor_splitter') : 'conveyor_merger';
      const manifoldFp = getMachineFootprint(manifoldMachineId);
      fpMap.set(manifoldMachineId, manifoldFp);

      for (const target of sorted) {
        const targetFp = getMachineFootprint(target.machineId);
        const ports = getMachinePorts(target.machineId);
        const matchPort = ports.find((p) => p.type === portType && p.medium === 'belt');
        if (!matchPort) continue;

        // Place the manifold node one row above (input) or below (output)
        const manifoldCol = target.position.col + Math.round(matchPort.relX * (targetFp.width - 1));
        const manifoldRow =
          portType === 'input'
            ? target.position.row - manifoldFp.height
            : target.position.row + targetFp.height;

        const manifoldPos = { col: manifoldCol, row: manifoldRow };

        // Build a test state including already-queued manifold machines
        const testState = { ...state, machines: [...allMachines, ...newMachines] };
        fpMap.set(manifoldMachineId, manifoldFp);

        const placeable = canPlace(testState, manifoldMachineId, manifoldPos, manifoldFp, fpMap);
        if (!placeable) continue; // Skip blocked cells (Option A)

        const manifoldInstance: SandboxMachine = {
          instanceId: generateId(),
          machineId: manifoldMachineId,
          position: manifoldPos,
          rotation: 0,
          recipeId: null,
          overclock: 100,
        };
        newMachines.push(manifoldInstance);

        // Belt: manifold → target machine input  (or target out → manifold for output)
        const manifoldPorts = getMachinePorts(manifoldMachineId);
        const manifoldConnPort =
          portType === 'input'
            ? manifoldPorts.find((p) => p.type === 'output')
            : manifoldPorts.find((p) => p.type === 'input');

        if (manifoldConnPort) {
          newBelts.push({
            beltId: generateId(),
            from: portType === 'output'
              ? { machineInstanceId: target.instanceId, portId: matchPort.id }
              : { machineInstanceId: manifoldInstance.instanceId, portId: manifoldConnPort.id },
            to: portType === 'output'
              ? { machineInstanceId: manifoldInstance.instanceId, portId: manifoldConnPort.id }
              : { machineInstanceId: target.instanceId, portId: matchPort.id },
            tier: beltTier,
          });
        }
      }

      // Daisy-chain manifold nodes together
      for (let i = 0; i < newMachines.length - 1; i++) {
        const a = newMachines[i];
        const b = newMachines[i + 1];
        const aPorts = getMachinePorts(a.machineId);
        const bPorts = getMachinePorts(b.machineId);

        // For splitters: chain out→in. For mergers: chain out→in too (they have multiple ins).
        const aOut = aPorts.find(
          (p) => p.type === 'output' && (portType === 'output' || p.id !== 'out0')
        ) ?? aPorts.find((p) => p.type === 'output');
        const bIn = bPorts.find((p) => p.type === 'input' && p.id === 'in0');

        if (aOut && bIn) {
          newBelts.push({
            beltId: generateId(),
            from: { machineInstanceId: a.instanceId, portId: aOut.id },
            to: { machineInstanceId: b.instanceId, portId: bIn.id },
            tier: beltTier,
          });
        }
      }

      return {
        ...state,
        machines: [...state.machines, ...newMachines],
        belts: [...state.belts, ...newBelts],
      };
    }

    case 'AUTO_WIRE_ARRAY': {
      const { machineIds, poleMachineId } = action;
      const targetMachines = state.machines.filter((m) => machineIds.includes(m.instanceId));
      if (targetMachines.length === 0) return state;

      // Sort machines by position for consistent pole placing ordering
      const sorted = [...targetMachines].sort((a, b) =>
        a.position.col !== b.position.col
          ? a.position.col - b.position.col
          : a.position.row - b.position.row
      );

      const newMachines: SandboxMachine[] = [];
      const newPowerLines: SandboxPowerLine[] = [];

      const allMachines = [...state.machines];
      const fpMap = buildFootprintMap(allMachines);

      const poleFp = getMachineFootprint(poleMachineId);
      fpMap.set(poleMachineId, poleFp);

      for (const target of sorted) {
        if (getMachineMaxConnections(target.machineId) === 0) continue;

        const targetFp = getMachineFootprint(target.machineId);
        
        // Find a free cell adjacent to the target machine (prefer bottom-right or right)
        const candidatePositions = [
          { col: target.position.col + targetFp.width, row: target.position.row + targetFp.height - 1 }, // Right-bottom
          { col: target.position.col + targetFp.width, row: target.position.row },                       // Right-top
          { col: target.position.col, row: target.position.row + targetFp.height },                       // Bottom-left
          { col: target.position.col + targetFp.width - 1, row: target.position.row + targetFp.height },   // Bottom-right
          { col: target.position.col - 1, row: target.position.row },                                   // Left
        ];

        let polePos = null;
        for (const pos of candidatePositions) {
          const testState = { ...state, machines: [...allMachines, ...newMachines] };
          if (canPlace(testState, poleMachineId, pos, poleFp, fpMap)) {
            polePos = pos;
            break;
          }
        }

        if (!polePos) continue; // Skip if no adjacent space was found (Option A)

        const poleInstance: SandboxMachine = {
          instanceId: generateId(),
          machineId: poleMachineId,
          position: polePos,
          rotation: 0,
          recipeId: null,
          overclock: 100,
        };
        newMachines.push(poleInstance);

        // Add power wire from pole to target machine
        newPowerLines.push({
          lineId: generateId(),
          fromMachineId: poleInstance.instanceId,
          toMachineId: target.instanceId,
        });
      }

      // Daisy-chain consecutive poles together
      for (let i = 0; i < newMachines.length - 1; i++) {
        const p1 = newMachines[i];
        const p2 = newMachines[i + 1];
        newPowerLines.push({
          lineId: generateId(),
          fromMachineId: p1.instanceId,
          toMachineId: p2.instanceId,
        });
      }

      return {
        ...state,
        machines: [...state.machines, ...newMachines],
        powerLines: [...(state.powerLines ?? []), ...newPowerLines],
      };
    }

    default:
      return state;
  }
}

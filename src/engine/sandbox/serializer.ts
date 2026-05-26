/**
 * FICSIT Sandbox — State Serializer
 *
 * Handles save/load of sandbox layouts to localStorage and URL share hashes.
 */

import type { SandboxState, SandboxAction } from './types';

const STORAGE_KEY = 'ficsit_sandbox_v1';

export const DEFAULT_STATE: SandboxState = {
  machines: [],
  belts: [],
  selectedMachineId: null,
  selectedBeltId: null,
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
      selectedMachineId: null, // don't persist selection
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
  };
  return encodeURIComponent(btoa(JSON.stringify(payload)));
}

export function loadFromShareHash(hash: string): Partial<SandboxState> | null {
  try {
    const decoded = JSON.parse(atob(decodeURIComponent(hash)));
    return {
      machines: decoded.m ?? [],
      belts:    decoded.b ?? [],
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
        selectedMachineId:
          state.selectedMachineId === action.instanceId ? null : state.selectedMachineId,
        selectedBeltId: null,
      };

    case 'SELECT_MACHINE':
      return { ...state, selectedMachineId: action.instanceId, selectedBeltId: null };

    case 'SELECT_BELT':
      return { ...state, selectedBeltId: action.beltId, selectedMachineId: null };

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

    case 'ADD_BELT':
      return { ...state, belts: [...state.belts, action.belt] };

    case 'DELETE_BELT':
      return {
        ...state,
        belts: state.belts.filter((b) => b.beltId !== action.beltId),
        selectedBeltId: state.selectedBeltId === action.beltId ? null : state.selectedBeltId,
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

    default:
      return state;
  }
}

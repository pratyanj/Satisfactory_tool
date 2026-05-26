/**
 * FICSIT Sandbox — Main Orchestrator Component
 *
 * Manages global sandbox state via useReducer.
 * All child components receive state + dispatch — no prop drilling beyond 1 level.
 */

import React, {
  useReducer,
  useEffect,
  useMemo,
  createContext,
  useContext,
} from 'react';
import { SandboxCanvas } from './SandboxCanvas';
import { SandboxSidebar } from './SandboxSidebar';
import { MachineInspector } from './MachineInspector';
import { BeltInspector } from './BeltInspector';
import { SandboxToolbar } from './SandboxToolbar';
import { SandboxStatusBar } from './SandboxStatusBar';
import {
  sandboxReducer,
  DEFAULT_STATE,
  loadFromLocalStorage,
  saveToLocalStorage,
} from '../../engine/sandbox/serializer';
import { computeFactoryStats } from '../../engine/sandbox/simulation';
import type { SandboxState, SandboxAction, FactoryStats } from '../../engine/sandbox/types';

// ─── Context ──────────────────────────────────────────────────────────────────

interface SandboxContextValue {
  state: SandboxState;
  dispatch: React.Dispatch<SandboxAction>;
  stats: FactoryStats;
}

const SandboxContext = createContext<SandboxContextValue | null>(null);

export function useSandbox(): SandboxContextValue {
  const ctx = useContext(SandboxContext);
  if (!ctx) throw new Error('useSandbox must be used inside SandboxTab');
  return ctx;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SandboxTab() {
  const [state, dispatch] = useReducer(
    sandboxReducer,
    DEFAULT_STATE,
    () => loadFromLocalStorage() ?? DEFAULT_STATE
  );

  // Persist to localStorage whenever state changes (excluding viewport for perf)
  useEffect(() => {
    saveToLocalStorage(state);
  }, [state.machines, state.belts]);

  // Derive factory stats (memoised — only recomputes when machines/belts change)
  const stats = useMemo(() => computeFactoryStats(state), [state.machines, state.belts]);

  const contextValue = useMemo(
    () => ({ state, dispatch, stats }),
    [state, dispatch, stats]
  );

  const selectedMachine = useMemo(
    () => state.machines.find((m) => m.instanceId === state.selectedMachineId) ?? null,
    [state.machines, state.selectedMachineId]
  );

  const selectedBelt = useMemo(
    () => state.belts.find((b) => b.beltId === state.selectedBeltId) ?? null,
    [state.belts, state.selectedBeltId]
  );

  const inspectorOpen = selectedMachine !== null || selectedBelt !== null;

  return (
    <SandboxContext.Provider value={contextValue}>
      <div className="sandbox-root">
        {/* Left — Machine Browser */}
        <SandboxSidebar />

        {/* Centre — Canvas + Toolbar */}
        <div className="sandbox-center">
          <SandboxToolbar />
          <div className="sandbox-canvas-area">
            <SandboxCanvas />
          </div>
          <SandboxStatusBar stats={stats} />
        </div>

        {/* Right — Inspector (machine OR belt) */}
        <div className={`sandbox-inspector-panel ${inspectorOpen ? 'is-open' : ''}`}>
          {selectedMachine && (
            <MachineInspector machine={selectedMachine} dispatch={dispatch} stats={stats} />
          )}
          {selectedBelt && (
            <BeltInspector
              belt={selectedBelt}
              machines={state.machines}
              stats={stats}
              dispatch={dispatch}
            />
          )}
        </div>
      </div>
    </SandboxContext.Provider>
  );
}

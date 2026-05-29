/**
 * FICSIT Sandbox — Toolbar
 *
 * Tool mode switcher, grid toggle, undo/redo, and layout utilities.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSandbox } from './SandboxTab';

type ToolMode = 'select' | 'place' | 'belt' | 'power' | 'delete' | 'pan';

const TOOLS: { mode: ToolMode; label: string; title: string; icon: React.ReactNode }[] = [
  {
    mode: 'select',
    label: 'Select',
    title: 'Select / Move (S)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M5 3l14 9-7 1-4 7z" />
      </svg>
    ),
  },
  {
    mode: 'pan',
    label: 'Pan',
    title: 'Pan canvas (Space)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
        <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" />
        <path d="M10 10.5a2 2 0 0 0-2-2 2 2 0 0 0-2 2V14a6 6 0 0 0 12 0v-2.5a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
      </svg>
    ),
  },
  {
    mode: 'belt',
    label: 'Belt',
    title: 'Draw belt (B)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    ),
  },
  {
    mode: 'power',
    label: 'Power',
    title: 'Draw wire (W / P)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    mode: 'delete',
    label: 'Delete',
    title: 'Delete (Del)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4h6v2" />
      </svg>
    ),
  },
];

export function SandboxToolbar() {
  const { state, dispatch } = useSandbox();
  const [activeMode, setActiveMode] = useState<ToolMode>('select');
  const [heatmapMode, setHeatmapMode] = useState(false);
  const heatmapRef = useRef(false);

  const setTool = useCallback((mode: ToolMode) => {
    setActiveMode(mode);
    window.dispatchEvent(new CustomEvent('sandbox:tool', { detail: { mode } }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 's': setTool('select');  break;
        case 'b': setTool('belt');    break;
        case 'w':
        case 'p': setTool('power');   break;
        case ' ': e.preventDefault(); setTool('pan'); break;
        case 'delete':
        case 'backspace': setTool('delete'); break;
        case 'escape': setTool('select'); break;
        case 'g': dispatch({ type: 'TOGGLE_GRID' }); break;
        case 'h': {
          const next = !heatmapRef.current;
          heatmapRef.current = next;
          setHeatmapMode(next);
          window.dispatchEvent(new CustomEvent('sandbox:heatmap', { detail: { active: next } }));
          break;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setTool, dispatch]);

  const handleClearAll = useCallback(() => {
    if (window.confirm('Clear all machines and belts?')) {
      dispatch({ type: 'CLEAR_ALL' });
    }
  }, [dispatch]);

  const handleExportImage = useCallback(() => {
    // Use html-to-image on the SVG canvas area
    import('html-to-image').then(({ toPng }) => {
      const el = document.querySelector('.sandbox-canvas-wrapper') as HTMLElement;
      if (!el) return;
      toPng(el, { quality: 0.95, backgroundColor: '#0a0b0e' }).then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `ficsit-sandbox-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      });
    });
  }, []);

  return (
    <div className="sandbox-toolbar" role="toolbar" aria-label="Sandbox tools">
      {/* Tool mode group */}
      <div className="sandbox-toolbar-group">
        {TOOLS.map((tool) => (
          <button
            key={tool.mode}
            className={`sandbox-tool-btn ${activeMode === tool.mode ? 'is-active' : ''}`}
            onClick={() => setTool(tool.mode)}
            title={tool.title}
            aria-pressed={activeMode === tool.mode}
            id={`sandbox-tool-${tool.mode}`}
          >
            {tool.icon}
            <span>{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="sandbox-toolbar-divider" />

      {/* Grid toggle */}
      <button
        className={`sandbox-tool-btn ${state.showGrid ? 'is-active' : ''}`}
        onClick={() => dispatch({ type: 'TOGGLE_GRID' })}
        title="Toggle grid overlay (G)"
        id="sandbox-tool-grid"
        aria-pressed={state.showGrid}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
        <span>Grid</span>
      </button>

      <div className="sandbox-toolbar-divider" />

      {/* Heatmap diagnostic toggle */}
      <button
        className={`sandbox-tool-btn ${heatmapMode ? 'is-active is-active--amber' : ''}`}
        onClick={() => {
          const next = !heatmapMode;
          heatmapRef.current = next;
          setHeatmapMode(next);
          window.dispatchEvent(new CustomEvent('sandbox:heatmap', { detail: { active: next } }));
        }}
        title="Diagnostics heatmap (H)"
        id="sandbox-tool-heatmap"
        aria-pressed={heatmapMode}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
        </svg>
        <span>Heatmap</span>
      </button>

      <div className="sandbox-toolbar-divider" />

      {/* Export / clear */}
      <button
        className="sandbox-tool-btn"
        onClick={handleExportImage}
        title="Export blueprint as image"
        id="sandbox-export-image"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span>Export</span>
      </button>

      <button
        className="sandbox-tool-btn sandbox-tool-btn--danger"
        onClick={handleClearAll}
        title="Clear all machines and belts"
        id="sandbox-clear-all"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
        <span>Clear</span>
      </button>

      {/* Machine / belt / wire count pill — shows selection state */}
      <div className="sandbox-toolbar-stats">
        <span>{state.machines.length} machines</span>
        <span className="sandbox-toolbar-dot">·</span>
        <span>{state.belts.length} belts</span>
        <span className="sandbox-toolbar-dot">·</span>
        <span>{state.powerLines?.length ?? 0} wires</span>
        {state.selectedMachineId && (
          <>
            <span className="sandbox-toolbar-dot">·</span>
            <span style={{ color: '#f48721' }}>1 selected</span>
          </>
        )}
        {state.selectedBeltId && (
          <>
            <span className="sandbox-toolbar-dot">·</span>
            <span style={{ color: '#3b82f6' }}>belt selected</span>
          </>
        )}
        {state.selectedPowerLineId && (
          <>
            <span className="sandbox-toolbar-dot">·</span>
            <span style={{ color: '#f59e0b' }}>wire selected</span>
          </>
        )}
      </div>
    </div>
  );
}

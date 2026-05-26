/**
 * FICSIT Sandbox — Canvas
 *
 * Renders the infinite foundation grid, placed machines, belts, and handles
 * all mouse interactions (pan, zoom, place, select, belt-drawing).
 *
 * Uses pure SVG + HTML Canvas for rendering (no PixiJS dependency required).
 * The architecture is designed so PixiJS can replace the renderer later
 * without touching the engine or UI logic.
 */

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from 'react';
import { useSandbox } from './SandboxTab';
import {
  pixelToGrid,
  gridToPixel,
  portToPixel,
  canPlace,
  zoomAroundPoint,
  clampZoom,
} from '../../engine/sandbox/snapping';
import {
  getMachineFootprint,
  getMachinePorts,
  getMachineEntry,
} from '../../engine/sandbox/machineRegistry';
import type {
  SandboxMachine,
  SandboxBelt,
  GridPosition,
} from '../../engine/sandbox/types';
import { machines } from '../../engine/data';
import { getBeltTier } from './BeltInspector';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolMode = 'select' | 'place' | 'belt' | 'delete' | 'pan';

interface PlacingState {
  machineId: string;
  ghostPos: GridPosition | null;
  canDrop: boolean;
}

interface BeltDrawState {
  fromMachineId: string;
  fromPortId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Build a footprint map for all machines (used by canPlace) */
function buildFootprintMap() {
  const map = new Map<string, { width: number; height: number }>();
  // We'll add all known machine IDs from machineRegistry
  const machineIds = Object.keys(machines);
  for (const id of machineIds) {
    map.set(id, getMachineFootprint(id));
  }
  return map;
}

const FOOTPRINT_MAP = buildFootprintMap();

// Belt flow direction keyframe is defined in CSS (@keyframes beltFlow)

// ─── Component ────────────────────────────────────────────────────────────────

export function SandboxCanvas() {
  const { state, dispatch, stats } = useSandbox();
  const svgRef   = useRef<SVGSVGElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  // Tool mode — lifted from toolbar via a CustomEvent for simplicity
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [placing, setPlacing]   = useState<PlacingState | null>(null);
  const [beltDraw, setBeltDraw] = useState<BeltDrawState | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Listen for tool-mode changes from the Toolbar (CustomEvent approach avoids prop drilling)
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ mode: ToolMode; machineId?: string }>;
      setToolMode(ce.detail.mode);
      if (ce.detail.mode === 'place' && ce.detail.machineId) {
        setPlacing({ machineId: ce.detail.machineId, ghostPos: null, canDrop: false });
      } else {
        setPlacing(null);
      }
      setBeltDraw(null);
    };
    window.addEventListener('sandbox:tool', handler);
    return () => window.removeEventListener('sandbox:tool', handler);
  }, []);

  // ESC cancels any active tool/selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setToolMode('select');
        setPlacing(null);
        setBeltDraw(null);
        dispatch({ type: 'SELECT_MACHINE', instanceId: null });
        dispatch({ type: 'SELECT_BELT', beltId: null });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);

  const { viewOffset, zoom, cellSize, showGrid, machines: placedMachines, belts: placedBelts } = state;

  // ── Coordinate helpers ──────────────────────────────────────────────────────

  const pxToGrid = useCallback(
    (px: number, py: number) => pixelToGrid(px, py, viewOffset, zoom, cellSize),
    [viewOffset, zoom, cellSize]
  );

  const gridToPx = useCallback(
    (col: number, row: number) => gridToPixel(col, row, viewOffset, zoom, cellSize),
    [viewOffset, zoom, cellSize]
  );

  // ── Mouse handlers ──────────────────────────────────────────────────────────

  const getSVGPoint = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = getSVGPoint(e);

      // Panning
      if (isPanning && panStart.current) {
        const dx = x - panStart.current.x;
        const dy = y - panStart.current.y;
        dispatch({
          type: 'SET_VIEWPORT',
          offset: { x: panStart.current.ox + dx, y: panStart.current.oy + dy },
          zoom,
        });
        return;
      }

      // Ghost placement preview
      if (placing) {
        const gridPos = pxToGrid(x, y);
        const fp = getMachineFootprint(placing.machineId);
        const ok = canPlace(state, placing.machineId, gridPos, fp, FOOTPRINT_MAP);
        setPlacing((prev) => prev ? { ...prev, ghostPos: gridPos, canDrop: ok } : null);
      }
    },
    [isPanning, placing, pxToGrid, state, dispatch, zoom, getSVGPoint]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && toolMode === 'pan')) {
        e.preventDefault();
        setIsPanning(true);
        const { x, y } = getSVGPoint(e);
        panStart.current = { x, y, ox: viewOffset.x, oy: viewOffset.y };
        return;
      }
    },
    [toolMode, viewOffset, getSVGPoint]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStart.current = null;
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || isPanning) return;
      const { x, y } = getSVGPoint(e);

      if (toolMode === 'place' && placing?.ghostPos && placing.canDrop) {
        const machine: SandboxMachine = {
          instanceId: generateId(),
          machineId:  placing.machineId,
          position:   placing.ghostPos,
          rotation:   0,
          recipeId:   null,
          overclock:  100,
        };
        dispatch({ type: 'PLACE_MACHINE', machine });
        // Keep placing mode active so the user can stamp multiple
        return;
      }

      if (toolMode === 'select') {
        // Deselect both if clicking empty space
        dispatch({ type: 'SELECT_MACHINE', instanceId: null });
        dispatch({ type: 'SELECT_BELT', beltId: null });
      }
    },
    [toolMode, placing, isPanning, dispatch, getSVGPoint]
  );

  const handleWheelZoom = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const { x, y } = getSVGPoint(e as unknown as React.MouseEvent);
      const delta = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newZoom = clampZoom(zoom * delta);
      const newOffset = zoomAroundPoint(viewOffset, zoom, newZoom, x, y);
      dispatch({ type: 'SET_VIEWPORT', offset: newOffset, zoom: newZoom });
    },
    [zoom, viewOffset, dispatch, getSVGPoint]
  );

  // ── Machine interaction ─────────────────────────────────────────────────────

  const handleMachineClick = useCallback(
    (e: React.MouseEvent, machine: SandboxMachine) => {
      e.stopPropagation();
      if (toolMode === 'delete') {
        dispatch({ type: 'DELETE_MACHINE', instanceId: machine.instanceId });
        return;
      }
      if (toolMode === 'select') {
        dispatch({ type: 'SELECT_MACHINE', instanceId: machine.instanceId });
      }
    },
    [toolMode, dispatch]
  );

  // ── Port click for belt drawing ─────────────────────────────────────────────

  const handlePortClick = useCallback(
    (e: React.MouseEvent, machineInstanceId: string, portId: string, portType: 'input' | 'output') => {
      e.stopPropagation();
      if (toolMode !== 'belt') return;

      if (!beltDraw) {
        // Start belt from an output port
        if (portType === 'output') {
          setBeltDraw({ fromMachineId: machineInstanceId, fromPortId: portId });
        }
      } else {
        // Complete belt to an input port
        if (portType === 'input' && machineInstanceId !== beltDraw.fromMachineId) {
          const belt: SandboxBelt = {
            beltId: generateId(),
            from: { machineInstanceId: beltDraw.fromMachineId, portId: beltDraw.fromPortId },
            to:   { machineInstanceId, portId },
            tier: 'mk1',
          };
          dispatch({ type: 'ADD_BELT', belt });
          setBeltDraw(null);
        }
      }
    },
    [toolMode, beltDraw, dispatch]
  );

  // ── Render helpers ──────────────────────────────────────────────────────────

  const gridLines = useMemo(() => {
    if (!showGrid || !outerRef.current) return null;
    const rect = outerRef.current.getBoundingClientRect();
    const w = rect.width  || 1200;
    const h = rect.height || 800;

    const scaledCell = cellSize * zoom;
    const startCol = Math.floor(-viewOffset.x / scaledCell) - 1;
    const startRow = Math.floor(-viewOffset.y / scaledCell) - 1;
    const endCol   = startCol + Math.ceil(w / scaledCell) + 2;
    const endRow   = startRow + Math.ceil(h / scaledCell) + 2;

    const lines: React.ReactNode[] = [];
    for (let c = startCol; c <= endCol; c++) {
      const px = c * scaledCell + viewOffset.x;
      lines.push(
        <line key={`vc${c}`} x1={px} y1={0} x2={px} y2={h}
          stroke="#1a1d22" strokeWidth={c % 5 === 0 ? 1.5 : 0.5} />
      );
    }
    for (let r = startRow; r <= endRow; r++) {
      const py = r * scaledCell + viewOffset.y;
      lines.push(
        <line key={`hr${r}`} x1={0} y1={py} x2={w} y2={py}
          stroke="#1a1d22" strokeWidth={r % 5 === 0 ? 1.5 : 0.5} />
      );
    }
    return lines;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGrid, viewOffset, zoom, cellSize]);

  const renderMachine = (machine: SandboxMachine) => {
    const fp      = getMachineFootprint(machine.machineId);
    const entry   = getMachineEntry(machine.machineId);
    const origin  = gridToPx(machine.position.col, machine.position.row);
    const w       = fp.width  * cellSize * zoom;
    const h       = fp.height * cellSize * zoom;
    const isSelected = state.selectedMachineId === machine.instanceId;
    const accent  = entry?.accentColor ?? '#f48721';
    const machineName = machines[machine.machineId]?.name ?? machine.machineId;
    const tp      = stats.machineThroughputs[machine.instanceId];

    // Status indicator color
    const statusColor = !machine.recipeId ? '#6b7280' : tp ? accent : '#4b5563';

    return (
      <g
        key={machine.instanceId}
        transform={`translate(${origin.x}, ${origin.y})`}
        onClick={(e) => handleMachineClick(e, machine)}
        style={{ cursor: toolMode === 'delete' ? 'crosshair' : 'pointer' }}
      >
        {/* Shadow */}
        <rect x={3} y={3} width={w} height={h} rx={3} fill="rgba(0,0,0,0.4)" />

        {/* Body */}
        <rect
          x={0} y={0} width={w} height={h} rx={3}
          fill="#151820"
          stroke={isSelected ? '#f48721' : accent}
          strokeWidth={isSelected ? 2.5 : 1.5}
          opacity={0.96}
        />

        {/* Accent top bar */}
        <rect x={0} y={0} width={w} height={Math.max(4, h * 0.06)} rx={3} fill={accent} opacity={0.85} />

        {/* Status dot (top-right) */}
        <circle cx={w - 8} cy={8} r={4} fill={statusColor} />

        {/* Machine name label */}
        {w > 40 && (
          <text
            x={w / 2} y={h / 2 + 4}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={Math.max(8, Math.min(12, w * 0.14))}
            fill="#e4e3e0"
            fontFamily="'Inter', 'Segoe UI', sans-serif"
            fontWeight="600"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {machineName.replace(' ', '\n')}
          </text>
        )}

        {/* Output rate label */}
        {tp && w > 50 && (
          <text
            x={w / 2} y={h - 8}
            textAnchor="middle"
            fontSize={Math.max(7, Math.min(9, w * 0.1))}
            fill={accent}
            fontFamily="'Inter', monospace"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {tp.outputRate.toFixed(1)}/min
          </text>
        )}

        {/* Ports */}
        {renderPorts(machine, w, h)}

        {/* Selection highlight ring */}
        {isSelected && (
          <rect
            x={-2} y={-2} width={w + 4} height={h + 4} rx={5}
            fill="none"
            stroke="#f48721"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.6}
          />
        )}
      </g>
    );
  };

  const renderPorts = (machine: SandboxMachine, machineW: number, machineH: number) => {
    const ports = getMachinePorts(machine.machineId);
    const entry = getMachineEntry(machine.machineId);
    const accent = entry?.accentColor ?? '#f48721';

    return ports.map((port) => {
      const px = port.relX * machineW;
      const py = port.relY * machineH;
      const isOutput = port.type === 'output';
      const isPipe = port.medium === 'pipe';
      const isActive = beltDraw?.fromMachineId === machine.instanceId && beltDraw.fromPortId === port.id;

      return (
        <g
          key={port.id}
          onClick={(e) => handlePortClick(e, machine.instanceId, port.id, port.type)}
          style={{ cursor: toolMode === 'belt' ? 'crosshair' : 'default' }}
        >
          {/* Hit area */}
          <circle cx={px} cy={py} r={10} fill="transparent" />
          {/* Visual */}
          {isPipe ? (
            <rect
              x={px - 6} y={py - 6} width={12} height={12} rx={2}
              fill={isActive ? '#f48721' : isOutput ? accent : '#374151'}
              stroke={isOutput ? '#e4e3e0' : '#6b7280'}
              strokeWidth={1.5}
            />
          ) : (
            <circle
              cx={px} cy={py} r={6}
              fill={isActive ? '#f48721' : isOutput ? accent : '#374151'}
              stroke={isOutput ? '#e4e3e0' : '#6b7280'}
              strokeWidth={1.5}
            />
          )}
          {/* Port direction arrow */}
          {toolMode === 'belt' && (
            <text
              x={px} y={py}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={6} fill="white" fontWeight="bold"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {isOutput ? '▶' : '◀'}
            </text>
          )}
        </g>
      );
    });
  };

  const renderBelt = (belt: SandboxBelt) => {
    const fromMachine = placedMachines.find((m) => m.instanceId === belt.from.machineInstanceId);
    const toMachine   = placedMachines.find((m) => m.instanceId === belt.to.machineInstanceId);
    if (!fromMachine || !toMachine) return null;

    const fromPorts  = getMachinePorts(fromMachine.machineId);
    const toPorts    = getMachinePorts(toMachine.machineId);
    const fromPort   = fromPorts.find((p) => p.id === belt.from.portId);
    const toPort     = toPorts.find((p) => p.id === belt.to.portId);
    if (!fromPort || !toPort) return null;

    const fromFp = getMachineFootprint(fromMachine.machineId);
    const toFp   = getMachineFootprint(toMachine.machineId);

    const fp1 = portToPixel(
      fromMachine.position.col, fromMachine.position.row, fromFp,
      fromPort.relX, fromPort.relY, viewOffset, zoom, cellSize
    );
    const fp2 = portToPixel(
      toMachine.position.col, toMachine.position.row, toFp,
      toPort.relX, toPort.relY, viewOffset, zoom, cellSize
    );

    const load = stats.beltLoads[belt.beltId];
    const tierData = getBeltTier(belt.tier);
    const capacity = tierData.capacity;

    // Saturation color
    const satPct = load ? (load.actualLoad / capacity) * 100 : 0;
    const color  =
      satPct >= 100 ? '#ef4444' :
      satPct >= 80  ? '#f59e0b' :
      tierData.color;

    // Animation speed: faster belts = shorter duration (0.4s–3s)
    const flowRate = load?.actualLoad ?? (capacity * 0.5);
    const animDuration = Math.max(0.4, 3 - (flowRate / capacity) * 2.6);

    const midX = (fp1.x + fp2.x) / 2;
    const midY = (fp1.y + fp2.y) / 2;
    const dy   = fp2.y - fp1.y;

    const path = `M ${fp1.x} ${fp1.y} C ${fp1.x} ${fp1.y + dy * 0.5}, ${fp2.x} ${fp2.y - dy * 0.5}, ${fp2.x} ${fp2.y}`;

    const isSelected = state.selectedBeltId === belt.beltId;

    return (
      <g key={belt.beltId}>
        {/* Belt shadow */}
        <path d={path} stroke="rgba(0,0,0,0.4)" strokeWidth={5} fill="none" />
        {/* Belt track */}
        <path d={path} stroke="#1a1d22" strokeWidth={4} fill="none" />
        {/* Animated item flow */}
        <path
          d={path}
          stroke={color}
          strokeWidth={2.5}
          fill="none"
          strokeDasharray="10 6"
          opacity={0.92}
          style={{
            animation: `beltFlow ${animDuration}s linear infinite`,
          }}
        />
        {/* Selection highlight */}
        {isSelected && (
          <path
            d={path}
            stroke="#f48721"
            strokeWidth={5}
            fill="none"
            opacity={0.35}
          />
        )}

        {/* Delete/select belt target */}
        <path
          d={path}
          stroke="transparent"
          strokeWidth={12}
          fill="none"
          style={{ cursor: toolMode === 'delete' ? 'crosshair' : 'default' }}
          onClick={(e) => {
            e.stopPropagation();
            if (toolMode === 'delete') {
              dispatch({ type: 'DELETE_BELT', beltId: belt.beltId });
            } else if (toolMode === 'select') {
              dispatch({ type: 'SELECT_BELT', beltId: belt.beltId });
              dispatch({ type: 'SELECT_MACHINE', instanceId: null });
            }
          }}
        />

        {/* Capacity label at midpoint */}
        <text
          x={midX} y={midY - 8}
          textAnchor="middle"
          fontSize={9}
          fill={color}
          fontFamily="monospace"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          opacity={zoom > 0.6 ? 1 : 0}
        >
          {tierData.label} · {load ? load.actualLoad.toFixed(0) : '—'}/{capacity}
        </text>
      </g>
    );
  };

  const renderGhost = () => {
    if (!placing?.ghostPos) return null;
    const fp     = getMachineFootprint(placing.machineId);
    const origin = gridToPx(placing.ghostPos.col, placing.ghostPos.row);
    const w = fp.width  * cellSize * zoom;
    const h = fp.height * cellSize * zoom;
    const color = placing.canDrop ? '#22c55e' : '#ef4444';

    return (
      <rect
        x={origin.x} y={origin.y} width={w} height={h} rx={3}
        fill={color}
        fillOpacity={0.2}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="6 3"
        style={{ pointerEvents: 'none' }}
      />
    );
  };

  // Cursor style
  const cursorStyle: React.CSSProperties = {
    cursor:
      isPanning     ? 'grabbing' :
      toolMode === 'pan'    ? 'grab' :
      toolMode === 'delete' ? 'crosshair' :
      toolMode === 'belt'   ? 'cell' :
      toolMode === 'place'  ? 'copy' :
      'default',
  };

  return (
    <div
      ref={outerRef}
      className="sandbox-canvas-wrapper"
      style={cursorStyle}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        ref={svgRef}
        className="sandbox-svg"
        onMouseMove={handleMouseMove}
        onClick={handleCanvasClick}
        onWheel={handleWheelZoom}
      >
        {/* Grid */}
        <g className="sandbox-grid">{gridLines}</g>

        {/* Belts (rendered below machines) */}
        <g className="sandbox-belts">
          {placedBelts.map(renderBelt)}
        </g>

        {/* Machines */}
        <g className="sandbox-machines">
          {placedMachines.map(renderMachine)}
        </g>

        {/* Ghost placement preview */}
        <g className="sandbox-ghost">{renderGhost()}</g>

        {/* Origin marker */}
        <circle
          cx={viewOffset.x}
          cy={viewOffset.y}
          r={4}
          fill="#f48721"
          opacity={0.5}
          style={{ pointerEvents: 'none' }}
        />
      </svg>

      {/* Belt draw mode HUD */}
      {beltDraw && (
        <div className="sandbox-belt-hud">
          <span>🔗 Click an <strong>input port</strong> to complete belt</span>
          <span className="hud-esc-hint">ESC to cancel</span>
          <button onClick={() => setBeltDraw(null)}>Cancel</button>
        </div>
      )}

      {/* Zoom indicator */}
      <div className="sandbox-zoom-badge">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

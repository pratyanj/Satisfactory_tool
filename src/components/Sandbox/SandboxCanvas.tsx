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
  getMachineName,
  getMachinePowerUsage,
  getMachinePowerProduction,
  getMachineMaxConnections,
  getAllMachines,
} from '../../engine/sandbox/machineRegistry';
import type {
  SandboxMachine,
  SandboxBelt,
  SandboxPowerLine,
  GridPosition,
} from '../../engine/sandbox/types';
import { machines } from '../../engine/data';
import { getBeltTier } from './BeltInspector';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolMode = 'select' | 'place' | 'belt' | 'power' | 'delete' | 'pan';

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
  const registryMachines = getAllMachines();
  for (const entry of registryMachines) {
    map.set(entry.machineId, entry.footprint);
  }
  return map;
}

const FOOTPRINT_MAP = buildFootprintMap();

// ─── Drag-Select Helper ────────────────────────────────────────────────────────

interface DragSelectState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

// Belt flow direction keyframe is defined in CSS (@keyframes beltFlow)

// ─── Component ────────────────────────────────────────────────────────────────

export function SandboxCanvas() {
  const { state, dispatch, stats } = useSandbox();
  const svgRef   = useRef<SVGSVGElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  // Tool mode — lifted from toolbar via a CustomEvent for simplicity
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [placing, setPlacing]   = useState<PlacingState | null>(null);
  const [beltDraw, setBeltDraw] = useState<BeltDrawState | null>(null);
  const [powerDraw, setPowerDraw] = useState<{ fromInstanceId: string } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Phase 4: drag-select, Zoop array stamping, clipboard paste
  const [dragSelect, setDragSelect] = useState<DragSelectState | null>(null);
  const [isZooping, setIsZooping] = useState(false);   // Shift held during place = Zoop mode
  const [zoopGhosts, setZoopGhosts] = useState<{ col: number; row: number; canDrop: boolean }[]>([]);
  const [isPasteMode, setIsPasteMode] = useState(false);
  const [pasteGhostAnchor, setPasteGhostAnchor] = useState<{ col: number; row: number } | null>(null);
  // Track if drag just ended (avoids immediate deselect on mouse-up after drag)
  const justDragSelected = useRef(false);

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
      setPowerDraw(null);
    };
    window.addEventListener('sandbox:tool', handler);
    return () => window.removeEventListener('sandbox:tool', handler);
  }, []);

  // Listen for heatmap diagnostics toggles from the Toolbar
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ active: boolean }>;
      setHeatmapMode(ce.detail.active);
    };
    window.addEventListener('sandbox:heatmap', handler);
    return () => window.removeEventListener('sandbox:heatmap', handler);
  }, []);

  // Listen for blueprint stamp events from the BlueprintShelf
  useEffect(() => {
    const handler = () => {
      setIsPasteMode(true);
    };
    window.addEventListener('sandbox:stamp-blueprint', handler);
    return () => window.removeEventListener('sandbox:stamp-blueprint', handler);
  }, []);

  // ESC cancels any active tool/selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setToolMode('select');
        setPlacing(null);
        setBeltDraw(null);
        setPowerDraw(null);
        setDragSelect(null);
        setIsZooping(false);
        setZoopGhosts([]);
        setIsPasteMode(false);
        setPasteGhostAnchor(null);
        dispatch({ type: 'SELECT_MACHINE', instanceId: null });
        dispatch({ type: 'SELECT_MULTIPLE_MACHINES', instanceIds: [] });
        dispatch({ type: 'SELECT_BELT', beltId: null });
        dispatch({ type: 'SELECT_POWER_LINE', lineId: null });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);

  // Ctrl+C / Ctrl+V / Ctrl+A keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        dispatch({ type: 'COPY_SELECTION' });
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        if (state.clipboard && state.clipboard.length > 0) {
          setIsPasteMode(true);
        }
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        dispatch({
          type: 'SELECT_MULTIPLE_MACHINES',
          instanceIds: state.machines.map((m) => m.instanceId),
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, state.clipboard, state.machines]);

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

      // Track mouse position for wire drawing preview and paste ghost
      setMousePos({ x, y });

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

      // Drag-select box update
      if (dragSelect) {
        setDragSelect((prev) => prev ? { ...prev, currentX: x, currentY: y } : null);
        return;
      }

      // Ghost placement preview / Zoop
      if (placing) {
        const gridPos = pxToGrid(x, y);
        const fp = getMachineFootprint(placing.machineId);
        const ok = canPlace(state, placing.machineId, gridPos, fp, FOOTPRINT_MAP);
        setPlacing((prev) => prev ? { ...prev, ghostPos: gridPos, canDrop: ok } : null);

        // Zoop: if Shift held, compute a line of ghosts from first click to current
        if (isZooping && placing.ghostPos) {
          const startPos = placing.ghostPos;
          const dx = gridPos.col - startPos.col;
          const dy = gridPos.row - startPos.row;
          const isHorizontal = Math.abs(dx) >= Math.abs(dy);
          const count = isHorizontal ? Math.abs(dx) + 1 : Math.abs(dy) + 1;
          const stepCol = isHorizontal ? (dx >= 0 ? 1 : -1) : 0;
          const stepRow = !isHorizontal ? (dy >= 0 ? 1 : -1) : 0;

          const ghosts = Array.from({ length: count }, (_, i) => {
            const col = startPos.col + i * stepCol;
            const row = startPos.row + i * stepRow;
            const testState = { ...state, machines: [...state.machines] };
            const canDrop = canPlace(testState, placing.machineId, { col, row }, fp, FOOTPRINT_MAP);
            return { col, row, canDrop };
          });
          setZoopGhosts(ghosts);
        }
      }

      // Paste ghost: track anchor
      if (isPasteMode) {
        const gridPos = pxToGrid(x, y);
        setPasteGhostAnchor(gridPos);
      }
    },
    [isPanning, placing, pxToGrid, state, dispatch, zoom, getSVGPoint, dragSelect, isZooping, isPasteMode]
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
      // Start drag-select in select mode when not clicking on a machine
      if (e.button === 0 && toolMode === 'select' && !isPasteMode) {
        const { x, y } = getSVGPoint(e);
        setDragSelect({ startX: x, startY: y, currentX: x, currentY: y });
        justDragSelected.current = false;
      }
    },
    [toolMode, viewOffset, getSVGPoint, isPasteMode]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      setIsPanning(false);
      panStart.current = null;

      if (dragSelect) {
        const minX = Math.min(dragSelect.startX, dragSelect.currentX);
        const maxX = Math.max(dragSelect.startX, dragSelect.currentX);
        const minY = Math.min(dragSelect.startY, dragSelect.currentY);
        const maxY = Math.max(dragSelect.startY, dragSelect.currentY);
        const dragThreshold = 8;

        if (maxX - minX > dragThreshold || maxY - minY > dragThreshold) {
          // Find all machines whose centre falls inside the selection box
          const hits = placedMachines.filter((m) => {
            const fp = getMachineFootprint(m.machineId);
            const origin = gridToPx(m.position.col, m.position.row);
            const cx = origin.x + (fp.width * cellSize * zoom) / 2;
            const cy = origin.y + (fp.height * cellSize * zoom) / 2;
            return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
          });
          if (hits.length > 0) {
            dispatch({ type: 'SELECT_MULTIPLE_MACHINES', instanceIds: hits.map((m) => m.instanceId) });
            justDragSelected.current = true;
          }
        }
        setDragSelect(null);
      }
    },
    [dragSelect, placedMachines, gridToPx, cellSize, zoom, dispatch]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || isPanning) return;

      // Don't deselect if drag-select just finished
      if (justDragSelected.current) {
        justDragSelected.current = false;
        return;
      }

      const { x, y } = getSVGPoint(e);

      // ── Paste mode: stamp clipboard on click ───────────────────────────────
      if (isPasteMode && state.clipboard && pasteGhostAnchor) {
        const newMachines = state.clipboard.map((entry) => ({
          instanceId: generateId(),
          machineId: entry.machineId,
          position: {
            col: pasteGhostAnchor.col + entry.relCol,
            row: pasteGhostAnchor.row + entry.relRow,
          },
          rotation: entry.rotation,
          recipeId: entry.recipeId,
          overclock: entry.overclock,
          fuelId: entry.fuelId,
          switchOn: entry.switchOn,
        }));
        dispatch({ type: 'PLACE_MACHINE_ARRAY', machines: newMachines });
        setIsPasteMode(false);
        setPasteGhostAnchor(null);
        return;
      }

      // ── Zoop stamp: stamp array on click (Shift released) ─────────────────
      if (isZooping && zoopGhosts.length > 1 && placing) {
        const validGhosts = zoopGhosts.filter((g) => g.canDrop);
        if (validGhosts.length > 0) {
          const newMachines = validGhosts.map((g) => ({
            instanceId: generateId(),
            machineId: placing.machineId,
            position: { col: g.col, row: g.row },
            rotation: 0,
            recipeId: null,
            overclock: 100,
          }));
          dispatch({ type: 'PLACE_MACHINE_ARRAY', machines: newMachines });
        }
        setIsZooping(false);
        setZoopGhosts([]);
        return;
      }

      // ── Zoop: Shift held in place mode → set anchor ────────────────────────
      if (toolMode === 'place' && e.shiftKey && placing?.ghostPos) {
        setIsZooping(true);
        setZoopGhosts([{ col: placing.ghostPos.col, row: placing.ghostPos.row, canDrop: placing.canDrop }]);
        return;
      }

      // ── Normal single place ────────────────────────────────────────────────
      if (toolMode === 'place' && placing?.ghostPos && placing.canDrop && !isZooping) {
        const machine = {
          instanceId: generateId(),
          machineId:  placing.machineId,
          position:   placing.ghostPos,
          rotation:   0,
          recipeId:   null,
          overclock:  100,
        };
        dispatch({ type: 'PLACE_MACHINE', machine });
        return;
      }

      // ── Deselect on empty canvas click ────────────────────────────────────
      if (toolMode === 'select') {
        dispatch({ type: 'SELECT_MACHINE', instanceId: null });
        dispatch({ type: 'SELECT_MULTIPLE_MACHINES', instanceIds: [] });
        dispatch({ type: 'SELECT_BELT', beltId: null });
        dispatch({ type: 'SELECT_POWER_LINE', lineId: null });
      }
    },
    [
      toolMode, placing, isPanning, dispatch, getSVGPoint,
      isPasteMode, pasteGhostAnchor, state.clipboard,
      isZooping, zoopGhosts,
    ]
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
        if (e.shiftKey) {
          // Shift+click toggles machine in/out of multi-selection
          dispatch({ type: 'SELECT_ADD_MACHINE', instanceId: machine.instanceId });
        } else {
          dispatch({ type: 'SELECT_MACHINE', instanceId: machine.instanceId });
        }
        return;
      }
      if (toolMode === 'power') {
        const currentConns = (state.powerLines ?? []).filter(
          (pl) => pl.fromMachineId === machine.instanceId || pl.toMachineId === machine.instanceId
        ).length;
        const maxConns = getMachineMaxConnections(machine.machineId);

        if (!powerDraw) {
          if (maxConns > 0 && currentConns < maxConns) {
            setPowerDraw({ fromInstanceId: machine.instanceId });
          } else if (maxConns === 0) {
            alert('This machine does not support power connections.');
          } else {
            alert(`Max connection limit reached! This machine allows up to ${maxConns} connections.`);
          }
        } else {
          const alreadyConnected = (state.powerLines ?? []).some(
            (pl) =>
              (pl.fromMachineId === powerDraw.fromInstanceId && pl.toMachineId === machine.instanceId) ||
              (pl.fromMachineId === machine.instanceId && pl.toMachineId === powerDraw.fromInstanceId)
          );
          if (alreadyConnected) {
            alert('These machines are already connected.');
            return;
          }
          if (machine.instanceId === powerDraw.fromInstanceId) {
            setPowerDraw(null);
            return;
          }
          if (currentConns >= maxConns) {
            alert(`Target connection limit reached! This machine allows up to ${maxConns} connections.`);
            return;
          }
          const line = {
            lineId: generateId(),
            fromMachineId: powerDraw.fromInstanceId,
            toMachineId: machine.instanceId,
          };
          dispatch({ type: 'ADD_POWER_LINE', line });
          setPowerDraw(null);
        }
      }
    },
    [toolMode, dispatch, powerDraw, state.powerLines]
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
    const isMultiSelected = state.selectedMachineIds.includes(machine.instanceId);
    const accent  = entry?.accentColor ?? '#f48721';
    const machineName = getMachineName(machine.machineId);
    const tp      = stats.machineThroughputs[machine.instanceId];

    // Power validation
    const pStatus = stats.machinePowerGridStatus?.[machine.instanceId];
    const isUnpowered = pStatus && !pStatus.isPowered;

    const isSwitch = machine.machineId === 'power_switch';
    const switchOn = machine.switchOn !== false;
    
    // Diagnostics Heatmap calculations
    const powerProd = getMachinePowerProduction(machine.machineId);
    const isGenerator = powerProd > 0;
    const isLogistics = [
      'conveyor_splitter',
      'conveyor_merger',
      'conveyor_smart_splitter',
      'conveyor_programmable_splitter',
      'power_pole_mk1',
      'power_pole_mk2',
      'power_pole_mk3',
      'power_switch'
    ].includes(machine.machineId);

    const heatmapColor = heatmapMode ? (
      isLogistics ? '#8b5cf6' :
      isGenerator ? '#22d3ee' :
      (pStatus && !pStatus.isPowered && pStatus.reason === 'fuse_tripped') ? '#f97316' :
      (pStatus && !pStatus.isPowered) ? '#ef4444' :
      !machine.recipeId ? '#6b7280' :
      tp?.isStarved ? '#eab308' :
      '#22c55e'
    ) : null;

    const effectiveAccent = heatmapColor ?? accent;
    const effectiveStroke = isSelected || isMultiSelected ? '#f48721' : (heatmapColor ?? (isUnpowered ? '#ef4444' : accent));
    const heatmapPulseClass = heatmapMode && pStatus && !pStatus.isPowered ? 'sandbox-heatmap-pulse' : '';

    // Status indicator color (red if unpowered/tripped, gray if unassigned, accent if active)
    const statusColor = isUnpowered ? '#ef4444' : (!machine.recipeId ? '#6b7280' : accent);

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
          stroke={effectiveStroke}
          strokeWidth={isSelected ? 2.5 : 1.5}
          opacity={0.96}
          className={`${isUnpowered ? 'sandbox-machine-unpowered-pulse' : ''} ${heatmapPulseClass}`.trim()}
        />

        {/* Accent top bar */}
        <rect x={0} y={0} width={w} height={Math.max(4, h * 0.06)} rx={3} fill={isUnpowered ? '#ef4444' : effectiveAccent} opacity={0.85} />

        {/* Status dot (top-right) */}
        <circle cx={w - 8} cy={8} r={4} fill={isSwitch ? (switchOn ? '#10b981' : '#ef4444') : (heatmapColor ?? statusColor)} className={isUnpowered ? 'sandbox-unpowered-dot-flash' : ''} />

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

        {/* Output rate / switch state label */}
        {((tp && w > 50) || (isSwitch && w > 30)) && (
          <text
            x={w / 2} y={h - 8}
            textAnchor="middle"
            fontSize={Math.max(7, Math.min(9, w * 0.1))}
            fill={isSwitch ? (switchOn ? '#10b981' : '#ef4444') : (isUnpowered ? '#ef4444' : accent)}
            fontFamily="'Inter', monospace"
            fontWeight={isSwitch ? "700" : "400"}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {isSwitch
              ? (switchOn ? 'CLOSED (ON)' : 'OPEN (OFF)')
              : (isUnpowered ? 'No Power' : `${tp.outputRate.toFixed(1)}/min`)}
          </text>
        )}

        {/* Ports */}
        {renderPorts(machine, w, h)}

        {/* Power connection point (pulsing node in power mode) */}
        {toolMode === 'power' && getMachineMaxConnections(machine.machineId) > 0 && (
          <circle
            cx={w / 2} cy={h / 2} r={6}
            className={`sandbox-power-node ${powerDraw?.fromInstanceId === machine.instanceId ? 'is-drawing' : ''}`}
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth={1.5}
          />
        )}

        {/* Selection highlight ring (single) */}
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

        {/* Multi-selection glow ring (cyan) */}
        {isMultiSelected && !isSelected && (
          <rect
            x={-3} y={-3} width={w + 6} height={h + 6} rx={6}
            fill="none"
            stroke="#22d3ee"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            opacity={0.75}
            className="sandbox-multi-select-ring"
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
          stroke={fromPort.medium === 'pipe' ? '#22d3ee' : color}
          strokeWidth={2.5}
          fill="none"
          strokeDasharray="10 6"
          opacity={0.92}
          style={{
            animation: `beltFlow ${animDuration}s linear infinite`,
            animationPlayState: ((load?.actualLoad ?? 0) === 0 || satPct >= 100) ? 'paused' : 'running',
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

  const renderPowerLine = (pl: SandboxPowerLine) => {
    const fromMachine = placedMachines.find((m) => m.instanceId === pl.fromMachineId);
    const toMachine   = placedMachines.find((m) => m.instanceId === pl.toMachineId);
    if (!fromMachine || !toMachine) return null;

    const fromFp = getMachineFootprint(fromMachine.machineId);
    const toFp   = getMachineFootprint(toMachine.machineId);

    const fromPos = gridToPx(fromMachine.position.col, fromMachine.position.row);
    const toPos   = gridToPx(toMachine.position.col, toMachine.position.row);

    // Center of the machines
    const p1 = {
      x: fromPos.x + (fromFp.width * cellSize * zoom) / 2,
      y: fromPos.y + (fromFp.height * cellSize * zoom) / 2,
    };
    const p2 = {
      x: toPos.x + (toFp.width * cellSize * zoom) / 2,
      y: toPos.y + (toFp.height * cellSize * zoom) / 2,
    };

    // Sag math: quadratic bezier curve sagging down
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Sag amount proportional to distance
    const sag = Math.max(15, dist / 8) * zoom;
    const controlPoint = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2 + sag,
    };

    const path = `M ${p1.x} ${p1.y} Q ${controlPoint.x} ${controlPoint.y} ${p2.x} ${p2.y}`;

    // Get power status of endpoints
    const pStatus = stats.machinePowerGridStatus?.[pl.fromMachineId];
    const isTripped = pStatus?.reason === 'fuse_tripped';
    const isNoPower = pStatus?.reason === 'no_power';

    const color = isTripped ? '#ef4444' : (isNoPower ? '#4b5563' : '#f59e0b');
    const isSelected = state.selectedPowerLineId === pl.lineId;

    return (
      <g key={pl.lineId}>
        {/* Wire shadow */}
        <path d={path} stroke="rgba(0,0,0,0.5)" strokeWidth={3} fill="none" />
        
        {/* Main Wire line */}
        <path
          d={path}
          stroke={color}
          strokeWidth={isSelected ? 3.5 : 2}
          fill="none"
          className={!isTripped && !isNoPower ? 'sandbox-power-line-active' : ''}
          opacity={isNoPower ? 0.6 : 0.95}
        />

        {/* Selection glow */}
        {isSelected && (
          <path
            d={path}
            stroke="#f48721"
            strokeWidth={6}
            fill="none"
            opacity={0.3}
          />
        )}

        {/* Hit target for delete/select */}
        <path
          d={path}
          stroke="transparent"
          strokeWidth={12}
          fill="none"
          style={{ cursor: toolMode === 'delete' ? 'crosshair' : 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            if (toolMode === 'delete') {
              dispatch({ type: 'DELETE_POWER_LINE', lineId: pl.lineId });
            } else if (toolMode === 'select') {
              dispatch({ type: 'SELECT_POWER_LINE', lineId: pl.lineId });
              dispatch({ type: 'SELECT_MACHINE', instanceId: null });
            }
          }}
        />
      </g>
    );
  };

  const renderPowerLinePreview = () => {
    if (!powerDraw || toolMode !== 'power') return null;
    const fromMachine = placedMachines.find((m) => m.instanceId === powerDraw.fromInstanceId);
    if (!fromMachine) return null;

    const fromFp = getMachineFootprint(fromMachine.machineId);
    const fromPos = gridToPx(fromMachine.position.col, fromMachine.position.row);

    const p1 = {
      x: fromPos.x + (fromFp.width * cellSize * zoom) / 2,
      y: fromPos.y + (fromFp.height * cellSize * zoom) / 2,
    };
    const p2 = mousePos;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const sag = Math.max(15, dist / 8) * zoom;
    const controlPoint = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2 + sag,
    };

    const path = `M ${p1.x} ${p1.y} Q ${controlPoint.x} ${controlPoint.y} ${p2.x} ${p2.y}`;

    return (
      <path
        d={path}
        stroke="#f59e0b"
        strokeWidth={1.5}
        strokeDasharray="4 4"
        fill="none"
        opacity={0.7}
      />
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

  // ── Phase 4 render helpers ───────────────────────────────────────────────────────────

  const renderDragSelectBox = () => {
    if (!dragSelect) return null;
    const x = Math.min(dragSelect.startX, dragSelect.currentX);
    const y = Math.min(dragSelect.startY, dragSelect.currentY);
    const w = Math.abs(dragSelect.currentX - dragSelect.startX);
    const h = Math.abs(dragSelect.currentY - dragSelect.startY);
    if (w < 4 || h < 4) return null;
    return (
      <rect
        x={x} y={y} width={w} height={h}
        fill="rgba(34,211,238,0.06)"
        stroke="#22d3ee"
        strokeWidth={1}
        strokeDasharray="5 3"
        style={{ pointerEvents: 'none' }}
      />
    );
  };

  const renderZoopGhosts = () => {
    if (!isZooping || zoopGhosts.length === 0 || !placing) return null;
    const fp = getMachineFootprint(placing.machineId);
    return (
      <>
        {zoopGhosts.map((g, i) => {
          const origin = gridToPx(g.col, g.row);
          const w = fp.width  * cellSize * zoom;
          const h = fp.height * cellSize * zoom;
          return (
            <rect
              key={i}
              x={origin.x} y={origin.y}
              width={w} height={h}
              rx={3}
              fill={g.canDrop ? 'rgba(34,211,238,0.18)' : 'rgba(239,68,68,0.18)'}
              stroke={g.canDrop ? '#22d3ee' : '#ef4444'}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              style={{ pointerEvents: 'none' }}
            />
          );
        })}
        {(() => {
          const last = zoopGhosts[zoopGhosts.length - 1];
          const origin = gridToPx(last.col, last.row);
          const valid = zoopGhosts.filter((g) => g.canDrop).length;
          return (
            <text
              x={origin.x + fp.width * cellSize * zoom + 4}
              y={origin.y + 12}
              fill="#22d3ee"
              fontSize={11}
              fontFamily="'Inter', monospace"
              fontWeight="700"
              style={{ pointerEvents: 'none' }}
            >
              ×{valid}
            </text>
          );
        })()}
      </>
    );
  };

  const renderPasteGhosts = () => {
    if (!isPasteMode || !state.clipboard || !pasteGhostAnchor) return null;
    return (
      <>
        {state.clipboard.map((entry, i) => {
          const fp = getMachineFootprint(entry.machineId);
          const col = pasteGhostAnchor.col + entry.relCol;
          const row = pasteGhostAnchor.row + entry.relRow;
          const origin = gridToPx(col, row);
          const w = fp.width  * cellSize * zoom;
          const h = fp.height * cellSize * zoom;
          return (
            <rect
              key={i}
              x={origin.x} y={origin.y}
              width={w} height={h}
              rx={3}
              fill="rgba(168,85,247,0.15)"
              stroke="#a855f7"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              style={{ pointerEvents: 'none' }}
            />
          );
        })}
      </>
    );
  };
  const cursorStyle: React.CSSProperties = {
    cursor:
      isPanning     ? 'grabbing' :
      toolMode === 'pan'    ? 'grab' :
      toolMode === 'delete' ? 'crosshair' :
      toolMode === 'belt'   ? 'cell' :
      toolMode === 'power'  ? 'cell' :
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

        {/* Power Wires (rendered above machines) */}
        <g className="sandbox-power-lines">
          {(state.powerLines ?? []).map(renderPowerLine)}
          {renderPowerLinePreview()}
        </g>

        {/* Ghost placement preview */}
        <g className="sandbox-ghost">{renderGhost()}</g>

        {/* Phase 4: Zoop ghosts, paste ghosts, drag-select box */}
        <g className="sandbox-zoop-layer">{renderZoopGhosts()}</g>
        <g className="sandbox-paste-layer">{renderPasteGhosts()}</g>
        <g className="sandbox-dragselect">{renderDragSelectBox()}</g>

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

      {/* Zoop mode HUD */}
      {isZooping && (
        <div className="sandbox-belt-hud sandbox-zoop-hud">
          <span>⊞ Move to set array direction &amp; length, then <strong>click to stamp</strong></span>
          <span className="hud-esc-hint">ESC to cancel</span>
        </div>
      )}

      {/* Paste mode HUD */}
      {isPasteMode && (
        <div className="sandbox-belt-hud sandbox-paste-hud">
          <span>📋 Move to position, <strong>click to paste</strong></span>
          <span className="hud-esc-hint">ESC to cancel</span>
          <button onClick={() => setIsPasteMode(false)}>Cancel</button>
        </div>
      )}

      {/* Belt draw mode HUD */}
      {beltDraw && (
        <div className="sandbox-belt-hud">
          <span>🔗 Click an <strong>input port</strong> to complete belt</span>
          <span className="hud-esc-hint">ESC to cancel</span>
          <button onClick={() => setBeltDraw(null)}>Cancel</button>
        </div>
      )}

      {/* Power wire draw mode HUD */}
      {powerDraw && (
        <div className="sandbox-belt-hud sandbox-power-hud">
          <span>⚡ Click another <strong>machine or pole</strong> to connect wire</span>
          <span className="hud-esc-hint">ESC to cancel</span>
          <button onClick={() => setPowerDraw(null)}>Cancel</button>
        </div>
      )}

      {/* Zoom indicator */}
      <div className="sandbox-zoom-badge">
        {Math.round(zoom * 100)}%
      </div>

      {/* Heatmap diagnostics legend */}
      {heatmapMode && (
        <div className="sandbox-heatmap-legend">
          <span className="heatmap-legend-title">DIAGNOSTICS</span>
          {[
            { color: '#22c55e', label: 'Running' },
            { color: '#eab308', label: 'Starved' },
            { color: '#ef4444', label: 'No Power' },
            { color: '#f97316', label: 'Fuse Trip' },
            { color: '#6b7280', label: 'Idle' },
            { color: '#22d3ee', label: 'Generator' },
            { color: '#8b5cf6', label: 'Logistics' },
          ].map(item => (
            <div key={item.label} className="heatmap-legend-row">
              <span className="heatmap-legend-dot" style={{ background: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * FICSIT Sandbox — Power Line Inspector
 *
 * Appears when a power line is selected. Shows connected grid information,
 * safety margin, and let the user delete the wire. Also renders an authentic,
 * animated Satisfactory-style Power Grid Graph!
 */

import React, { useMemo } from 'react';
import type { SandboxPowerLine, SandboxState, FactoryStats } from '../../engine/sandbox/types';
import { getMachineName, getMachinePowerProduction, getMachinePowerUsage } from '../../engine/sandbox/machineRegistry';

interface PowerInspectorProps {
  line: SandboxPowerLine;
  state: SandboxState;
  stats: FactoryStats;
  dispatch: React.Dispatch<any>;
}

export function PowerInspector({ line, state, stats, dispatch }: PowerInspectorProps) {
  const fromName = getMachineName(line.fromMachineId);
  const toName   = getMachineName(line.toMachineId);

  // Traverse to find the local power grid connected to this line
  const gridInfo = useMemo(() => {
    // 1. Adjacency list
    const adj = new Map<string, string[]>();
    for (const m of state.machines) {
      adj.set(m.instanceId, []);
    }
    for (const pl of state.powerLines) {
      if (adj.has(pl.fromMachineId) && adj.has(pl.toMachineId)) {
        // Respect switches that are OFF
        const fromMach = state.machines.find(m => m.instanceId === pl.fromMachineId);
        const toMach   = state.machines.find(m => m.instanceId === pl.toMachineId);
        const fromIsSwitchOff = fromMach?.machineId === 'power_switch' && fromMach?.switchOn === false;
        const toIsSwitchOff   = toMach?.machineId === 'power_switch' && toMach?.switchOn === false;

        if (!fromIsSwitchOff && !toIsSwitchOff) {
          adj.get(pl.fromMachineId)!.push(pl.toMachineId);
          adj.get(pl.toMachineId)!.push(pl.fromMachineId);
        }
      }
    }

    // 2. BFS from line.fromMachineId
    const component = new Set<string>();
    const queue = [line.fromMachineId];
    component.add(line.fromMachineId);

    let idx = 0;
    while (idx < queue.length) {
      const current = queue[idx++];
      const neighbors = adj.get(current) ?? [];
      for (const n of neighbors) {
        if (!component.has(n)) {
          component.add(n);
          queue.push(n);
        }
      }
    }

    // 3. Sum capacity and load
    let capacity = 0;
    let load = 0;
    let maxConsumption = 0; // potential demand of all connected consumers (active or not)
    let generatorsCount = 0;
    let consumersCount = 0;

    for (const id of component) {
      const m = state.machines.find((x) => x.instanceId === id);
      if (!m) continue;

      const prod = getMachinePowerProduction(m.machineId, m.fuelId);
      if (prod > 0) {
        capacity += prod * (m.overclock / 100);
        generatorsCount++;
      }

      const nominalUsage = getMachinePowerUsage(m.machineId);
      if (nominalUsage > 0) {
        maxConsumption += nominalUsage * Math.pow(m.overclock / 100, 1.321);
        consumersCount++;
      }

      const tp = stats.machineThroughputs[id];
      if (tp) {
        load += tp.powerMW;
      }
    }

    const ratio = capacity > 0 ? load / capacity : 0;
    const margin = Math.max(0, capacity - load);
    const isTripped = capacity > 0 && load > capacity;

    return {
      capacity,
      load,
      maxConsumption,
      generatorsCount,
      consumersCount,
      ratio,
      margin,
      isTripped,
    };
  }, [line, state, stats]);

  const handleDelete = () => {
    dispatch({ type: 'DELETE_POWER_LINE', lineId: line.lineId });
  };

  const { capacity, load, maxConsumption, generatorsCount, consumersCount, ratio, margin, isTripped } = gridInfo;

  const healthColor =
    isTripped ? '#ef4444' :
    capacity === 0 ? '#9ca3af' :
    ratio > 0.85 ? '#f59e0b' :
    '#10b981';

  const healthText =
    isTripped ? '⚠️ Fuse Tripped' :
    capacity === 0 ? '🔌 Disconnected Grid' :
    ratio > 0.85 ? '⚡ High Load' :
    '✅ Healthy Grid';

  // ─── Power Grid Graph Math ─────────────────────────────────────────────────
  // Scale dynamically to fit values inside graph box
  const graphMaxVal = Math.max(10, capacity * 1.2, load * 1.2, maxConsumption * 1.2) || 10;
  const graphHeight = 100;
  const graphWidth = 240;

  const getGraphY = (val: number) => {
    const ratio = val / graphMaxVal;
    return graphHeight - ratio * (graphHeight - 15); // Leave 15px top margin
  };

  const capY = getGraphY(capacity);
  const loadY = getGraphY(isTripped ? 0 : load); // actual production drops to 0 if tripped
  const consY = getGraphY(load); // demand remains at load
  const maxConsY = getGraphY(maxConsumption);

  // Organic sine-wavy lines for active load
  const loadPath = isTripped
    ? `M 0 ${loadY} L ${graphWidth} ${loadY}`
    : `M 0 ${consY} c 30 -3, 60 3, 90 -2 c 30 -5, 60 5, 90 0 c 30 -4, 60 2, ${graphWidth} -1`;

  return (
    <div className="sandbox-inspector">
      <div className="inspector-header" style={{ borderColor: healthColor + '55' }}>
        <span className="inspector-cat">POWER WIRE</span>
        <h2 className="inspector-title">Grid connection</h2>
        <div className="inspector-health-badge" style={{ background: healthColor + '22', color: healthColor }}>
          {healthText}
        </div>
      </div>

      <div className="inspector-body">
        {/* Connection detail cards */}
        <div className="power-connection-panel">
          <div className="conn-endpoint">
            <span className="endpoint-label">FROM</span>
            <span className="endpoint-name">{fromName}</span>
          </div>
          <div className="conn-arrow">↕</div>
          <div className="conn-endpoint">
            <span className="endpoint-label">TO</span>
            <span className="endpoint-name">{toName}</span>
          </div>
        </div>

        {/* Grid Stats */}
        <div className="inspector-section">
          <h3>GRID PERFORMANCE</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Capacity</span>
              <span className="stat-val text-power">{capacity.toFixed(0)} <span className="stat-unit">MW</span></span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Actual Load</span>
              <span className="stat-val" style={{ color: isTripped ? '#ef4444' : '#3b82f6' }}>
                {load.toFixed(0)} <span className="stat-unit">MW</span>
              </span>
            </div>
          </div>
        </div>

        {/* SATISFACTORY POWER GRID GRAPH (SVG) */}
        {capacity > 0 && (
          <div className="inspector-section">
            <label className="inspector-label">POWER GRAPH DIAGNOSTIC</label>
            <div className="sandbox-power-graph-wrapper">
              <svg width="100%" height={graphHeight} viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="sandbox-power-graph-svg">
                {/* Grid Lines */}
                <line x1={0} y1={25} x2={graphWidth} y2={25} stroke="#1b1c22" strokeWidth={0.5} />
                <line x1={0} y1={50} x2={graphWidth} y2={50} stroke="#1b1c22" strokeWidth={0.5} />
                <line x1={0} y1={75} x2={graphWidth} y2={75} stroke="#1b1c22" strokeWidth={0.5} />
                
                {/* Max Consumption (Orange dashed line) */}
                <line
                  x1={0} y1={maxConsY} x2={graphWidth} y2={maxConsY}
                  stroke="#f97316" strokeWidth={1} strokeDasharray="3 3"
                  opacity={0.8}
                />
                
                {/* Capacity (Yellow solid line) */}
                <line
                  x1={0} y1={capY} x2={graphWidth} y2={capY}
                  stroke="#fbbf24" strokeWidth={2}
                  opacity={0.9}
                />
                
                {/* Consumption / Demand (Glowing Blue line) */}
                <path
                  d={loadPath}
                  stroke="#3b82f6" strokeWidth={1.5} fill="none"
                  className={!isTripped ? "sandbox-graph-blue-line" : ""}
                  opacity={0.8}
                />

                {/* Actual Production (Glowing White / Grey line) */}
                <line
                  x1={0} y1={loadY} x2={graphWidth} y2={loadY}
                  stroke={isTripped ? "#ef4444" : "#e4e3e0"} strokeWidth={1.2}
                  strokeDasharray={isTripped ? "none" : "8 4"}
                  className={!isTripped ? "sandbox-graph-production-line" : ""}
                  opacity={0.9}
                />

                {/* Live values overlays */}
                <text x={4} y={capY - 4} fontSize={8} fill="#fbbf24" fontWeight="600" opacity={0.85}>
                  CAP: {capacity.toFixed(0)} MW
                </text>
                <text x={graphWidth - 4} y={consY - 4} fontSize={8} fill="#3b82f6" fontWeight="600" textAnchor="end" opacity={0.85}>
                  CONS: {load.toFixed(0)} MW
                </text>
              </svg>
            </div>
            <div className="graph-legend">
              <span className="legend-item"><span className="legend-dot bg-yellow" /> Capacity</span>
              <span className="legend-item"><span className="legend-dot bg-blue" /> Consumption</span>
              <span className="legend-item"><span className="legend-dot bg-white" /> Production</span>
              <span className="legend-item"><span className="legend-dot bg-orange" /> Max Cons</span>
            </div>
          </div>
        )}

        {/* Load bar */}
        {capacity > 0 && (
          <div className="inspector-section">
            <div className="load-bar-header">
              <span>Grid Load</span>
              <span>{Math.round(ratio * 100)}%</span>
            </div>
            <div className="load-bar-track">
              <div
                className="load-bar-fill"
                style={{
                  width: `${Math.min(100, ratio * 100)}%`,
                  background: healthColor,
                }}
              />
            </div>
            {!isTripped && (
              <div className="load-margin-hint">
                Remaining Safety Margin: <strong>{margin.toFixed(0)} MW</strong>
              </div>
            )}
          </div>
        )}

        {/* Network Breakdown */}
        <div className="inspector-section info-panel">
          <h3>NETWORK BREAKDOWN</h3>
          <div className="info-row">
            <span>Power Generators</span>
            <strong>{generatorsCount}</strong>
          </div>
          <div className="info-row">
            <span>Active Power Consumers</span>
            <strong>{consumersCount}</strong>
          </div>
        </div>

        {isTripped && (
          <div className="tripped-alert-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <h4>FUSE TRIPPED</h4>
              <p>The grid load exceeds total production capacity. Disconnect some machines or build more generators to restore power.</p>
            </div>
          </div>
        )}
      </div>

      <div className="inspector-footer">
        <button className="inspector-delete-btn" onClick={handleDelete}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
          </svg>
          Delete Power Wire
        </button>
      </div>
    </div>
  );
}

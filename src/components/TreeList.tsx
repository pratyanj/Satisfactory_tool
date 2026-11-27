import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronsDownUp, ChevronsUpDown, Search, X } from 'lucide-react';
import { SolverNode, SummaryData } from '../engine/solver';
import { isFluidItem, items, machines } from '../engine/data';
import { getMachinePowerMW } from '../engine/worldSettings';
import { AppImage } from './AppImage';

interface TreeListProps {
  rootNode: SolverNode | null;
  summary: SummaryData | null;
}

interface ExpandSignal {
  expanded: boolean;
  version: number;
}

interface TreeStats {
  steps: number;
  totalMachines: number;
  totalPower: number;
}

type NodeRoleKey = 'target' | 'imported' | 'recycled' | 'raw' | 'process';

interface NodeRoleStyle {
  label?: string;
  accent: string;
  badgeBg: string;
  badgeBorder: string;
}

const ROLE_STYLES: Record<NodeRoleKey, NodeRoleStyle> = {
  target: {
    label: 'OUTPUT',
    accent: '#f48721',
    badgeBg: 'rgba(244, 135, 33, 0.14)',
    badgeBorder: 'rgba(244, 135, 33, 0.35)',
  },
  imported: {
    label: 'IMPORTED',
    accent: '#2dd4bf',
    badgeBg: 'rgba(45, 212, 191, 0.12)',
    badgeBorder: 'rgba(45, 212, 191, 0.35)',
  },
  recycled: {
    label: 'RECYCLED',
    accent: '#a78bfa',
    badgeBg: 'rgba(167, 139, 250, 0.12)',
    badgeBorder: 'rgba(167, 139, 250, 0.35)',
  },
  raw: {
    label: 'EXTRACT',
    accent: '#22c55e',
    badgeBg: 'rgba(34, 197, 94, 0.12)',
    badgeBorder: 'rgba(34, 197, 94, 0.35)',
  },
  process: {
    accent: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.10)',
    badgeBorder: 'rgba(56, 189, 248, 0.30)',
  },
};

function getNodeRole(node: SolverNode, depth: number): NodeRoleKey {
  if (node.machineId === 'supplied_input' || node.recipeId === 'supplied_input') return 'imported';
  if (node.machineId === 'byproduct_reused' || node.recipeId === 'byproduct_reuse') return 'recycled';
  if (node.machineId === 'raw_input' || node.inputs.length === 0) return 'raw';
  if (depth === 0) return 'target';
  return 'process';
}

function getNodeTotalPower(node: SolverNode): number {
  if (node.machines <= 0) return 0;
  const machine = machines[node.machineId];
  const powerPerMachine =
    node.powerPerMachine ??
    getMachinePowerMW(machine?.powerUsage || 0, node.clockSpeed ?? 100, node.somerslooped ?? false, 1);
  return powerPerMachine * node.machines;
}

function computeTreeStats(node: SolverNode): TreeStats {
  let steps = 1;
  let totalMachines = node.machines;
  let totalPower = getNodeTotalPower(node);
  for (const child of node.inputs) {
    const sub = computeTreeStats(child);
    steps += sub.steps;
    totalMachines += sub.totalMachines;
    totalPower += sub.totalPower;
  }
  return { steps, totalMachines, totalPower };
}

function formatRate(rate: number, itemId: string): string {
  const unit = isFluidItem(itemId) ? 'm³/min' : '/min';
  return `${rate.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`;
}

function formatMachineCount(count: number): string {
  const rounded = Math.ceil(count * 10) / 10;
  return `×${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}`;
}

function nodeSelfMatches(node: SolverNode, q: string): boolean {
  if (!q) return false;
  const itemName = (items[node.itemId]?.name || node.itemId).toLowerCase();
  const machineName = (machines[node.machineId]?.name || node.machineId).toLowerCase();
  return itemName.includes(q) || machineName.includes(q);
}

function subtreeMatches(node: SolverNode, q: string): boolean {
  if (!q) return true;
  if (nodeSelfMatches(node, q)) return true;
  return node.inputs.some((child) => subtreeMatches(child, q));
}

function TreeNodeRow({
  node,
  depth,
  treeTotalPower,
  expandSignal,
  searchQuery,
}: {
  node: SolverNode;
  depth: number;
  treeTotalPower: number;
  expandSignal: ExpandSignal;
  searchQuery: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (expandSignal.version > 0) {
      setCollapsed(!expandSignal.expanded);
    }
  }, [expandSignal]);

  const q = searchQuery.trim().toLowerCase();
  const visibleChildren = useMemo(
    () => (q ? node.inputs.filter((c) => subtreeMatches(c, q)) : node.inputs),
    [node.inputs, q]
  );

  const machine = machines[node.machineId];
  const item = items[node.itemId];
  const hasChildren = visibleChildren.length > 0;
  const role = getNodeRole(node, depth);
  const roleStyle = ROLE_STYLES[role];

  const isVirtualSource =
    node.machineId === 'supplied_input' ||
    node.machineId === 'byproduct_reused' ||
    node.machineId === 'raw_input';

  const nodeTotalPower = getNodeTotalPower(node);
  const powerSharePct = treeTotalPower > 0 ? Math.min(100, (nodeTotalPower / treeTotalPower) * 100) : 0;
  const isSelfMatch = nodeSelfMatches(node, q);
  const showChildren = hasChildren && (!collapsed || Boolean(q));

  const machineLabel =
    node.machineId === 'supplied_input'
      ? 'External Supply'
      : node.machineId === 'byproduct_reused'
      ? 'Recycled Stream'
      : node.machineId === 'raw_input'
      ? 'Foraged / Raw Source'
      : machine?.name || node.machineId;

  return (
    <div className="tree-node-wrap">
      <div
        className={`tree-node-card ${isSelfMatch ? 'tree-node-card--match' : ''}`}
        style={{ borderLeftColor: roleStyle.accent }}
      >
        {/* Collapse / terminal indicator */}
        {hasChildren ? (
          <button
            type="button"
            className="tree-toggle"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand inputs' : 'Collapse inputs'}
            title={collapsed ? 'Expand upstream inputs' : 'Collapse upstream inputs'}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: showChildren ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 0.15s ease',
              }}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        ) : (
          <div className="tree-leaf-dot" aria-hidden="true">
            <span style={{ background: roleStyle.accent }} />
          </div>
        )}

        {/* Full-size Machine → Item visual pair */}
        <div className="tree-pair-icons">
          {!isVirtualSource && machine && (
            <>
              <div className="tree-pair-tile tree-pair-tile--machine" title={machine.name}>
                <AppImage
                  idKey={node.machineId}
                  fallbackUrl={machine.imageUrl}
                  alt={machine.name}
                  className="tree-pair-img"
                />
              </div>
              <span className="tree-pair-arrow" aria-hidden="true">
                <ArrowRight size={12} strokeWidth={2.5} />
              </span>
            </>
          )}
          <div className="tree-pair-tile tree-pair-tile--item" title={item?.name || node.itemId}>
            {(item?.imageUrl || node.itemId) && (
              <AppImage
                idKey={node.itemId}
                fallbackUrl={item?.imageUrl}
                alt={item?.name || node.itemId}
                className="tree-pair-img"
              />
            )}
          </div>
        </div>

        {/* Machine + Item Telemetry */}
        <div className="tree-info">
          <div className="tree-info-top">
            <span className="tree-item-title">{item?.name || node.itemId}</span>
            <span className="tree-rate-pill">{formatRate(node.rate, node.itemId)}</span>
            {roleStyle.label && (
              <span
                className="tree-role-badge"
                style={{
                  color: roleStyle.accent,
                  background: roleStyle.badgeBg,
                  borderColor: roleStyle.badgeBorder,
                }}
              >
                {roleStyle.label}
              </span>
            )}
            {node.byproducts &&
              node.byproducts.map((bp) => (
                <span key={bp.itemId} className="tree-byproduct-chip">
                  +{bp.rate.toLocaleString(undefined, { maximumFractionDigits: 1 })}/m {items[bp.itemId]?.name || bp.itemId}
                </span>
              ))}
          </div>

          <div className="tree-info-sub">
            <span className="tree-machine-name">{machineLabel}</span>
            {node.machines > 0 && (
              <span className="tree-machine-count">{formatMachineCount(node.machines)}</span>
            )}
            {node.clockSpeed !== undefined && Math.abs(node.clockSpeed - 100) > 0.05 && (
              <span
                className="tree-mini-badge"
                style={{
                  color: node.clockSpeed < 100 ? '#4ade80' : '#fbbf24',
                  borderColor: node.clockSpeed < 100 ? 'rgba(74,222,128,0.35)' : 'rgba(251,191,36,0.35)',
                }}
              >
                {Number(node.clockSpeed.toFixed(1))}%
              </span>
            )}
            {node.somerslooped && (
              <span
                className="tree-mini-badge"
                style={{ color: '#c084fc', borderColor: 'rgba(192,132,252,0.4)' }}
              >
                🌀 2×
              </span>
            )}
            {node.purity && node.machineId.startsWith('miner') && (
              <span
                className="tree-mini-badge"
                style={{
                  color: node.purity === 'pure' ? '#4ade80' : node.purity === 'impure' ? '#f87171' : '#9ca3af',
                  borderColor:
                    node.purity === 'pure'
                      ? 'rgba(74,222,128,0.3)'
                      : node.purity === 'impure'
                      ? 'rgba(248,113,113,0.3)'
                      : '#2a2f3a',
                }}
              >
                {node.purity.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Right Telemetry Strip */}
        <div className="tree-node-metrics">
          {hasChildren && !showChildren && (
            <button
              type="button"
              className="tree-collapsed-pill"
              onClick={() => setCollapsed(false)}
            >
              +{visibleChildren.length} {visibleChildren.length === 1 ? 'input' : 'inputs'}
            </button>
          )}
          {nodeTotalPower > 0.01 && (
            <>
              <span className="tree-power-badge" title={`${powerSharePct.toFixed(1)}% of target chain power`}>
                ⚡ {Number(nodeTotalPower.toFixed(1)).toLocaleString()} MW
              </span>
              <div className="tree-power-bar-track" title={`${powerSharePct.toFixed(1)}% of chain power`}>
                <div className="tree-power-bar-fill" style={{ width: `${Math.max(4, powerSharePct)}%` }} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Children with continuous vertical guide rail */}
      {showChildren && (
        <div className="tree-children-group">
          {visibleChildren.map((child, idx) => (
            <TreeNodeRow
              key={`${child.itemId}-${child.recipeId}-${idx}`}
              node={child}
              depth={depth + 1}
              treeTotalPower={treeTotalPower}
              expandSignal={expandSignal}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** A single output target: FICSIT chamfered target header + supply chain tree. */
function TreeTarget({
  node,
  expandSignal,
  searchQuery,
}: {
  node: SolverNode;
  expandSignal: ExpandSignal;
  searchQuery: string;
}) {
  const item = items[node.itemId];
  const stats = useMemo(() => computeTreeStats(node), [node]);

  return (
    <div className="tree-target-block">
      <div className="tree-target">
        <div className="tree-target-left">
          <div className="tree-target-icon">
            {(item?.imageUrl || node.itemId) && (
              <AppImage idKey={node.itemId} fallbackUrl={item?.imageUrl} alt={item?.name || node.itemId} />
            )}
          </div>
          <div className="tree-target-meta">
            <span className="tree-target-kicker">Target Output</span>
            <span className="tree-target-label">
              <span>{item?.name || node.itemId}</span>
              <span className="tree-target-rate">{formatRate(node.rate, node.itemId)}</span>
            </span>
          </div>
        </div>

        <div className="tree-target-totals">
          <span className="tree-stat-chip">
            {Math.ceil(stats.totalMachines).toLocaleString()} Machines
          </span>
          <span className="tree-stat-chip tree-stat-chip--power">
            ⚡ {Math.ceil(stats.totalPower).toLocaleString()} MW
          </span>
        </div>
      </div>

      <div className="tree-body">
        <TreeNodeRow
          node={node}
          depth={0}
          treeTotalPower={stats.totalPower}
          expandSignal={expandSignal}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
}

export function TreeList({ rootNode, summary }: TreeListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandSignal, setExpandSignal] = useState<ExpandSignal>({ expanded: true, version: 0 });

  if (!rootNode || !summary) {
    return (
      <div className="tab-empty-state">
        <span>No production data. Configure a plan and click Calculate.</span>
      </div>
    );
  }

  // The solver wraps multiple targets under a synthetic 'planned_outputs' root.
  const allTargets =
    rootNode.itemId === 'planned_outputs'
      ? rootNode.inputs.filter((n) => n.itemId !== 'awesome_sink')
      : [rootNode];

  const sinkNode =
    rootNode.itemId === 'planned_outputs'
      ? rootNode.inputs.find((n) => n.itemId === 'awesome_sink')
      : undefined;

  const q = searchQuery.trim().toLowerCase();
  const visibleTargets = q ? allTargets.filter((t) => subtreeMatches(t, q)) : allTargets;
  const totalBuildingCount = Object.values(summary.machineCounts).reduce((acc, c) => acc + Math.ceil(c), 0);

  return (
    <div className="tab-content tree-list-tab">
      {/* Command Bar */}
      <div className="tree-toolbar">
        <div className="tree-toolbar-stats">
          <span className="text-[9px] font-mono tracking-[0.22em] text-[#f48721] uppercase font-bold mr-1">
            FICSIT // Supply Chain
          </span>
          <span className="tree-stat-chip">
            {allTargets.length} {allTargets.length === 1 ? 'Target' : 'Targets'}
          </span>
          <span className="tree-stat-chip">
            {totalBuildingCount.toLocaleString()} Machines
          </span>
          <span className="tree-stat-chip tree-stat-chip--power">
            ⚡ {Math.ceil(summary.totalPower).toLocaleString()} MW
          </span>
        </div>

        <div className="tree-toolbar-actions">
          <div className="tree-search-wrap">
            <Search size={12} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter item or machine…"
              className="tree-search-input"
              aria-label="Filter supply chain tree"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[#6b7280] hover:text-white cursor-pointer"
                aria-label="Clear filter"
              >
                <X size={11} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="tree-action-btn"
            onClick={() => setExpandSignal((s) => ({ expanded: true, version: s.version + 1 }))}
            title="Expand all branches"
          >
            <ChevronsUpDown size={11} />
            <span>Expand</span>
          </button>
          <button
            type="button"
            className="tree-action-btn"
            onClick={() => setExpandSignal((s) => ({ expanded: false, version: s.version + 1 }))}
            title="Collapse all branches"
          >
            <ChevronsDownUp size={11} />
            <span>Collapse</span>
          </button>
        </div>
      </div>

      {/* Target Trees */}
      <div className="tree-targets">
        {visibleTargets.length === 0 ? (
          <div className="w-full py-10 text-center font-mono text-xs text-[#6b7280]">
            No items or machines match "{searchQuery}".
          </div>
        ) : (
          visibleTargets.map((target, idx) => (
            <TreeTarget
              key={`${target.itemId}-${idx}`}
              node={target}
              expandSignal={expandSignal}
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>

      {/* Overflow / Excess Byproduct Sink Summary */}
      {sinkNode && sinkNode.inputs.length > 0 && (
        <div className="tree-sink-banner">
          <span className="text-[9px] font-mono tracking-[0.18em] uppercase font-bold text-[#22c55e]">
            AWESOME Sink (×{sinkNode.machines})
          </span>
          {sinkNode.inputs.map((inp, i) => (
            <span
              key={`${inp.itemId}-${i}`}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0c1410] border border-[#22c55e35] text-[#d1fae5]"
            >
              {items[inp.itemId]?.name || inp.itemId}: {formatRate(inp.rate, inp.itemId)}
            </span>
          ))}
        </div>
      )}

      {/* Power footer */}
      <div className="tab-power-footer">
        <span>⚡ Power needed for this production: <strong>{Math.ceil(summary.totalPower).toLocaleString()} MW</strong></span>
      </div>
    </div>
  );
}

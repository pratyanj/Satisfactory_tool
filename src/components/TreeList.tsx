import React, { useState } from 'react';
import { SolverNode } from '../engine/solver';
import { SummaryData } from '../engine/solver';
import { items, machines } from '../engine/data';
import { AppImage } from './AppImage';

interface TreeListProps {
  rootNode: SolverNode | null;
  summary: SummaryData | null;
}

function TreeNodeRow({ node, depth }: { node: SolverNode; depth: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const machine = machines[node.machineId];
  const item = items[node.itemId];
  const hasChildren = node.inputs.length > 0;
  const machineCount = Math.ceil(node.machines);

  return (
    <>
      <div
        className="tree-row"
        style={{ paddingLeft: `${depth * 32 + 16}px` }}
      >
        {/* Vertical connector lines */}
        {depth > 0 && (
          <div className="tree-connector" style={{ left: `${(depth - 1) * 32 + 28}px` }}>
            <div className="tree-vline" />
            <div className="tree-hline" />
          </div>
        )}

        {/* Collapse toggle */}
        {hasChildren && (
          <button
            className="tree-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
              }}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        )}

        {/* Machine icon with Tooltip */}
        <div className="tree-icon group sf-tooltip-wrapper">
          {machine?.imageUrl && (
            <AppImage
              idKey={node.machineId}
              fallbackUrl={machine.imageUrl}
              alt={machine.name}
            />
          )}
          <div className="sf-tooltip whitespace-nowrap min-w-max">
            <span className="block font-black text-[#f48721] tracking-wider uppercase mb-1 text-[10px] border-b border-[#2a2d33] pb-1">{machine?.name}</span>
            <div className="flex justify-between gap-4 font-mono mt-1">
              <span className="text-[#8E9299]">Count:</span>
              <span className="text-[#e4e3e0]">{machineCount}x</span>
            </div>
            <div className="flex justify-between gap-4 font-mono mt-1">
              <span className="text-[#8E9299]">Power:</span>
              <span className="text-yellow-500">{(machine?.powerUsage || 0) * machineCount} MW</span>
            </div>
          </div>
        </div>

        {/* Machine info */}
        <div className="tree-info flex gap-2">
          <span className="tree-machine-name">
            {machine?.name || node.machineId}
            <span className="tree-machine-count"> (x{machineCount})</span>
          </span>
          <span className="tree-item-name group sf-tooltip-wrapper cursor-help">
            {item?.name || node.itemId}
            <span className="tree-item-rate"> ({node.rate.toLocaleString(undefined, { maximumFractionDigits: 1 })} units/min)</span>
            <div className="sf-tooltip whitespace-nowrap min-w-max left-0 transform-none ml-4">
              <span className="block font-black text-[#f48721] tracking-wider uppercase mb-1 text-[10px] border-b border-[#2a2d33] pb-1">Item Details</span>
              <div className="flex justify-between gap-4 font-mono mt-1 text-[11px]">
                <span className="text-[#8E9299]">Name:</span>
                <span className="text-[#e4e3e0]">{item?.name || node.itemId}</span>
              </div>
              <div className="flex justify-between gap-4 font-mono mt-1 text-[11px]">
                <span className="text-[#8E9299]">Target Rate:</span>
                <span className="text-orange-400">{node.rate.toLocaleString()} / min</span>
              </div>
            </div>
          </span>
        </div>
      </div>

      {/* Children */}
      {hasChildren && !collapsed && (
        <div className="tree-children">
          {node.inputs.map((child, idx) => (
            <TreeNodeRow key={`${child.itemId}-${idx}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </>
  );
}

export function TreeList({ rootNode, summary }: TreeListProps) {
  if (!rootNode || !summary) {
    return (
      <div className="tab-empty-state">
        <span>No production data. Configure a plan and click Calculate.</span>
      </div>
    );
  }

  const item = items[rootNode.itemId];

  return (
    <div className="tab-content tree-list-tab">
      {/* Target header */}
      <div className="tree-target">
        <div className="tree-target-icon">
          {item?.imageUrl && (
            <AppImage
              idKey={rootNode.itemId}
              fallbackUrl={item.imageUrl}
              alt={item?.name}
            />
          )}
        </div>
        <span className="tree-target-label">
          {rootNode.rate.toLocaleString(undefined, { maximumFractionDigits: 0 })}x{' '}
          <span className="tree-target-name">{item?.name || rootNode.itemId}</span>
        </span>
      </div>

      {/* Tree */}
      <div className="tree-body">
        <TreeNodeRow node={rootNode} depth={0} />
      </div>

      {/* Power footer */}
      <div className="tab-power-footer">
        <span>⚡ Power needed for this production: <strong>{Math.ceil(summary.totalPower).toLocaleString()} MW</strong></span>
      </div>
    </div>
  );
}

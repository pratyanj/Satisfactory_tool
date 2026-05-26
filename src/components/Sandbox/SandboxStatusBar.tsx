/**
 * FICSIT Sandbox — Status Bar
 *
 * Bottom strip showing live factory simulation stats.
 */

import React from 'react';
import type { FactoryStats } from '../../engine/sandbox/types';

interface SandboxStatusBarProps {
  stats: FactoryStats;
}

export function SandboxStatusBar({ stats }: SandboxStatusBarProps) {
  const effColor =
    stats.efficiencyPct >= 80 ? '#22c55e' :
    stats.efficiencyPct >= 50 ? '#f59e0b' :
    '#ef4444';

  return (
    <div className="sandbox-status-bar">
      {/* Machines */}
      <div className="status-stat">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
        <span>{stats.totalMachines}</span>
        <span className="status-unit">machines</span>
      </div>

      <div className="status-divider">·</div>

      {/* Power */}
      <div className="status-stat">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span style={{ color: '#f59e0b' }}>{stats.totalPowerMW.toFixed(1)}</span>
        <span className="status-unit">MW</span>
      </div>

      <div className="status-divider">·</div>

      {/* Efficiency */}
      <div className="status-stat">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={effColor} strokeWidth="2.5">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <span style={{ color: effColor }}>{stats.efficiencyPct}%</span>
        <span className="status-unit">efficiency</span>
      </div>

      {stats.bottleneckCount > 0 && (
        <>
          <div className="status-divider">·</div>
          <div className="status-stat status-warning">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span style={{ color: '#ef4444' }}>{stats.bottleneckCount}</span>
            <span className="status-unit">bottlenecks</span>
          </div>
        </>
      )}

      {/* Right side — keyboard hints */}
      <div className="status-hints">
        <span>S: Select</span>
        <span>B: Belt</span>
        <span>Space: Pan</span>
        <span>Del: Delete</span>
        <span>Scroll: Zoom</span>
      </div>
    </div>
  );
}

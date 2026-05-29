/**
 * FICSIT Sandbox — Machine Browser Sidebar
 *
 * Shows all available machines grouped by category.
 * Click to enter placement mode.
 */

import React, { useState, useCallback } from 'react';
import {
  getMachinesByCategory,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type MachineCategory,
  getMachineName,
  getMachinePowerUsage,
  getMachinePowerProduction,
} from '../../engine/sandbox/machineRegistry';
import { machines } from '../../engine/data';
import { BlueprintShelf } from './BlueprintShelf';

interface SandboxSidebarProps {
  selectedMachineIds: string[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SandboxSidebar({ selectedMachineIds }: SandboxSidebarProps) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<MachineCategory>>(new Set());

  const toggleCategory = useCallback((cat: MachineCategory) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const handleMachineClick = useCallback((machineId: string) => {
    // Emit CustomEvent picked up by SandboxCanvas
    window.dispatchEvent(
      new CustomEvent('sandbox:tool', { detail: { mode: 'place', machineId } })
    );
  }, []);

  const query = search.toLowerCase().trim();

  return (
    <aside className="sandbox-sidebar">
      <div className="sandbox-sidebar-header">
        <span className="sandbox-sidebar-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          MACHINES
        </span>
      </div>

      {/* Search */}
      <div className="sandbox-search">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search machines…"
          className="sandbox-search-input"
          id="sandbox-machine-search"
          aria-label="Search machines"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="sandbox-search-clear"
            aria-label="Clear search"
          >✕</button>
        )}
      </div>

      {/* Machine list */}
      <div className="sandbox-machine-list">
        {CATEGORY_ORDER.map((cat) => {
          const entries = getMachinesByCategory(cat).filter((entry) => {
            if (!query) return true;
            const name = getMachineName(entry.machineId);
            return name.toLowerCase().includes(query) || cat.includes(query);
          });

          if (entries.length === 0) return null;

          const isCollapsed = collapsed.has(cat);

          return (
            <div key={cat} className="sandbox-category">
              <button
                className="sandbox-category-header"
                onClick={() => toggleCategory(cat)}
                aria-expanded={!isCollapsed}
              >
                <span
                  className="sandbox-category-dot"
                  style={{ background: entries[0]?.accentColor ?? '#6b7280' }}
                />
                <span>{CATEGORY_LABELS[cat]}</span>
                <span className="sandbox-category-count">{entries.length}</span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  style={{
                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    marginLeft: 'auto',
                    flexShrink: 0,
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {!isCollapsed && (
                <div className="sandbox-category-items">
                  {entries.map((entry) => {
                    const name = getMachineName(entry.machineId);
                    const isGenerator = getMachinePowerProduction(entry.machineId) > 0;
                    const powerVal = isGenerator ? getMachinePowerProduction(entry.machineId) : getMachinePowerUsage(entry.machineId);
                    const powerText = isGenerator ? `+${powerVal}MW` : `${powerVal}MW`;
                    const { footprint } = entry;

                    return (
                      <button
                        key={entry.machineId}
                        className="sandbox-machine-btn"
                        onClick={() => handleMachineClick(entry.machineId)}
                        title={`${name} · ${footprint.width}×${footprint.height} foundations · ${powerText}`}
                        id={`sandbox-machine-${entry.machineId}`}
                      >
                        <span
                          className="sandbox-machine-icon"
                          style={{ background: entry.accentColor + '22', borderColor: entry.accentColor + '55' }}
                        >
                          <MachineIcon machineId={entry.machineId} color={entry.accentColor} />
                        </span>
                        <span className="sandbox-machine-info">
                          <span className="sandbox-machine-name">{name}</span>
                          <span className="sandbox-machine-meta">
                            {footprint.width}×{footprint.height} · {powerText}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <BlueprintShelf selectedMachineIds={selectedMachineIds} />
    </aside>
  );
}

// ─── Machine Icon (SVG mini-icons per category) ───────────────────────────────

function MachineIcon({ machineId, color }: { machineId: string; color: string }) {
  const size = 18;
  const s = { stroke: color, fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  if (machineId.startsWith('power_pole') || machineId.includes('generator') || machineId.includes('nuclear') || machineId === 'biomass_burner') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <polygon {...s} points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }
  if (machineId.startsWith('miner')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path {...s} d="M12 2L2 7l10 5 10-5-10-5z" />
        <path {...s} d="M2 17l10 5 10-5" />
        <path {...s} d="M2 12l10 5 10-5" />
      </svg>
    );
  }
  if (machineId === 'smelter' || machineId === 'foundry') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path {...s} d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    );
  }
  if (machineId === 'constructor' || machineId === 'assembler' || machineId === 'manufacturer') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <rect {...s} x="2" y="6" width="20" height="12" rx="2" />
        <path {...s} d="M6 10h4M6 14h4M14 10h4M14 14h4" />
      </svg>
    );
  }
  if (machineId === 'refinery' || machineId === 'blender') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path {...s} d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
      </svg>
    );
  }
  // Splitter — one-in three-out fork
  if (machineId.includes('splitter')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path {...s} d="M12 4v6" />
        <path {...s} d="M12 10L4 20M12 10l8 10" />
        <path {...s} d="M12 10v10" />
      </svg>
    );
  }
  // Merger — three-in one-out converge
  if (machineId.includes('merger')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path {...s} d="M12 20v-6" />
        <path {...s} d="M12 14L4 4M12 14l8-10" />
        <path {...s} d="M12 14V4" />
      </svg>
    );
  }
  // Storage container
  if (machineId.includes('storage') || machineId.includes('container')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path {...s} d="M21 8v13H3V8" />
        <path {...s} d="M23 3H1v5h22V3z" />
        <path {...s} d="M10 12h4" />
      </svg>
    );
  }
  // Fluid buffer / pipe-based
  if (machineId.includes('fluid') || machineId.includes('buffer') || machineId.includes('water') || machineId.includes('oil')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path {...s} d="M12 2L2 7l10 5 10-5-10-5z" />
        <path {...s} d="M2 12l10 5 10-5" />
      </svg>
    );
  }
  // Generic fallback
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect {...s} x="3" y="3" width="18" height="18" rx="2" />
      <path {...s} d="M3 9h18M9 21V9" />
    </svg>
  );
}

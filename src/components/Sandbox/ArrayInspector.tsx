/**
 * FICSIT Sandbox — Array Inspector Panel
 *
 * Shown in the right column when 2+ machines are simultaneously selected.
 * Provides bulk operations (overclock sync, delete) and the Auto-Manifold builder.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { getMachineName, getMachineEntry } from '../../engine/sandbox/machineRegistry';
import type { SandboxMachine, SandboxAction } from '../../engine/sandbox/types';

interface ArrayInspectorProps {
  selectedIds: string[];
  machines: SandboxMachine[];
  dispatch: React.Dispatch<SandboxAction>;
}

const BELT_TIERS = [
  { id: 'mk1', label: 'Mk.1', capacity: 60,   color: '#6b7280' },
  { id: 'mk2', label: 'Mk.2', capacity: 120,  color: '#22c55e' },
  { id: 'mk3', label: 'Mk.3', capacity: 270,  color: '#3b82f6' },
  { id: 'mk4', label: 'Mk.4', capacity: 480,  color: '#a855f7' },
  { id: 'mk5', label: 'Mk.5', capacity: 780,  color: '#f59e0b' },
  { id: 'mk6', label: 'Mk.6', capacity: 1200, color: '#f97316' },
];

export function ArrayInspector({ selectedIds, machines, dispatch }: ArrayInspectorProps) {
  const selected = useMemo(
    () => machines.filter((m) => selectedIds.includes(m.instanceId)),
    [machines, selectedIds]
  );

  // Average clock speed of selection for the initial slider value
  const avgClock = useMemo(() => {
    if (selected.length === 0) return 100;
    return Math.round(selected.reduce((s, m) => s + m.overclock, 0) / selected.length);
  }, [selected]);

  const [bulkClock, setBulkClock] = useState(avgClock);
  const [manifoldType, setManifoldType] = useState<'input' | 'output'>('input');
  const [manifoldTier, setManifoldTier] = useState('mk3');

  // Compute a summary of selected machine types
  const summary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of selected) {
      const name = getMachineName(m.machineId);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => `${count}× ${name}`)
      .join(', ');
  }, [selected]);

  // Shared accent: most common machine's accent, otherwise orange
  const accent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of selected) counts.set(m.machineId, (counts.get(m.machineId) ?? 0) + 1);
    let topId = '';
    let topCount = 0;
    for (const [id, c] of counts) if (c > topCount) { topId = id; topCount = c; }
    return getMachineEntry(topId)?.accentColor ?? '#f48721';
  }, [selected]);

  const handleBulkOverclock = useCallback(() => {
    dispatch({ type: 'BULK_SET_OVERCLOCK', instanceIds: selectedIds, overclock: bulkClock });
  }, [dispatch, selectedIds, bulkClock]);

  const handleBulkDelete = useCallback(() => {
    dispatch({ type: 'BULK_DELETE', instanceIds: selectedIds });
  }, [dispatch, selectedIds]);

  const handleCopy = useCallback(() => {
    dispatch({ type: 'COPY_SELECTION' });
  }, [dispatch]);

  const handleManifold = useCallback(() => {
    dispatch({
      type: 'GENERATE_MANIFOLD',
      machineIds: selectedIds,
      portType: manifoldType,
      beltTier: manifoldTier,
    });
  }, [dispatch, selectedIds, manifoldType, manifoldTier]);

  const selectedTier = BELT_TIERS.find((t) => t.id === manifoldTier)!;

  return (
    <div className="machine-inspector array-inspector">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="inspector-header" style={{ borderColor: accent + '44' }}>
        <div className="inspector-machine-icon" style={{ background: accent + '18', borderColor: accent + '44' }}>
          <span style={{ color: accent, fontSize: 18 }}>⊞</span>
        </div>
        <div className="inspector-machine-title">
          <div className="inspector-machine-name">Array Selection</div>
          <div className="inspector-machine-sub" style={{ color: accent }}>
            {selectedIds.length} machines selected
          </div>
        </div>
        <div className="inspector-actions">
          <button
            className="inspector-icon-btn"
            onClick={handleCopy}
            title="Copy selection (Ctrl+C)"
            aria-label="Copy selection"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button
            className="inspector-icon-btn inspector-delete-btn"
            onClick={handleBulkDelete}
            title="Delete all selected"
            aria-label="Delete all selected"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Selection Summary ───────────────────────────────────────────────── */}
      <div className="inspector-section array-summary-card" style={{ borderColor: accent + '33' }}>
        <div className="array-summary-label">SELECTED</div>
        <div className="array-summary-text">{summary}</div>
      </div>

      {/* ── Bulk Overclock ──────────────────────────────────────────────────── */}
      <div className="inspector-section">
        <div className="inspector-label-row">
          <label className="inspector-label" htmlFor="bulk-overclock">SYNC CLOCK SPEED</label>
          <span className="inspector-value" style={{ color: bulkClock > 100 ? '#fbbf24' : '#22c55e' }}>
            {bulkClock}%
          </span>
        </div>
        <input
          id="bulk-overclock"
          type="range"
          min={1} max={250} step={1}
          value={bulkClock}
          onChange={(e) => setBulkClock(Number(e.target.value))}
          className="inspector-slider"
          aria-label={`Bulk overclock: ${bulkClock}%`}
          style={{ '--accent': accent } as React.CSSProperties}
        />
        <div className="inspector-slider-ticks">
          <span>1%</span><span>100%</span><span>250%</span>
        </div>
        <button
          className="array-apply-btn"
          onClick={handleBulkOverclock}
          style={{ '--accent': accent } as React.CSSProperties}
        >
          Apply to All {selectedIds.length} Machines
        </button>
      </div>

      {/* ── Auto-Manifold Builder ───────────────────────────────────────────── */}
      <div className="inspector-section array-manifold-panel">
        <div className="inspector-label">⚙ AUTO-MANIFOLD BUILDER</div>

        {/* Type selector */}
        <div className="array-manifold-type-row">
          <button
            id="manifold-input-btn"
            className={`array-manifold-type-btn ${manifoldType === 'input' ? 'is-active' : ''}`}
            onClick={() => setManifoldType('input')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            Input Splitter
          </button>
          <button
            id="manifold-output-btn"
            className={`array-manifold-type-btn ${manifoldType === 'output' ? 'is-active' : ''}`}
            onClick={() => setManifoldType('output')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
            Output Merger
          </button>
        </div>

        {/* Belt tier selector */}
        <div className="inspector-label" style={{ marginTop: 12 }}>BELT TIER</div>
        <div className="array-tier-row">
          {BELT_TIERS.map((t) => (
            <button
              key={t.id}
              id={`manifold-tier-${t.id}`}
              className={`array-tier-btn ${manifoldTier === t.id ? 'is-active' : ''}`}
              style={{ '--tier-color': t.color } as React.CSSProperties}
              onClick={() => setManifoldTier(t.id)}
              title={`${t.label} — ${t.capacity}/min`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="array-tier-capacity">
          {selectedTier.label}: {selectedTier.capacity} items/min
        </div>

        {/* Build button */}
        <button
          id="generate-manifold-btn"
          className="array-manifold-build-btn"
          onClick={handleManifold}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Construct {manifoldType === 'input' ? 'Input Splitter' : 'Output Merger'} Manifold
        </button>
        <p className="switch-help-text">
          Places {manifoldType === 'input' ? 'splitters' : 'mergers'} adjacent to each machine's&nbsp;
          {manifoldType} port and connects them with {selectedTier.label} belts.
        </p>
      </div>

      {/* ── Machine List Preview ─────────────────────────────────────────────── */}
      <div className="inspector-section">
        <div className="inspector-label">MACHINES IN SELECTION</div>
        <div className="array-machine-list">
          {selected.slice(0, 8).map((m) => {
            const entry = getMachineEntry(m.machineId);
            return (
              <div
                key={m.instanceId}
                className="array-machine-chip"
                style={{ borderColor: (entry?.accentColor ?? '#f48721') + '55' }}
              >
                <span
                  className="array-chip-dot"
                  style={{ background: entry?.accentColor ?? '#f48721' }}
                />
                <span className="array-chip-name">{getMachineName(m.machineId)}</span>
                <span className="array-chip-clock">{m.overclock}%</span>
              </div>
            );
          })}
          {selected.length > 8 && (
            <div className="array-machine-chip array-chip-more">
              +{selected.length - 8} more…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

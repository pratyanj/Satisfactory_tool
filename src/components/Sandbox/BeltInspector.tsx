/**
 * FICSIT Sandbox — Belt Inspector Panel
 *
 * Shown in the right column when a belt is selected.
 * Provides tier selection, load display, and routing info.
 */

import React, { useCallback } from 'react';
import { machines as machineData, items } from '../../engine/data';
import type { SandboxBelt, SandboxAction, BeltLoad, FactoryStats } from '../../engine/sandbox/types';
import type { SandboxMachine } from '../../engine/sandbox/types';

// ─── Belt tier data (matches Satisfactory game values) ───────────────────────

export interface BeltTier {
  id: string;
  label: string;
  capacity: number; // items/min
  color: string;
}

export const BELT_TIERS: BeltTier[] = [
  { id: 'mk1', label: 'Mk.1', capacity: 60,   color: '#78716c' },
  { id: 'mk2', label: 'Mk.2', capacity: 120,  color: '#22c55e' },
  { id: 'mk3', label: 'Mk.3', capacity: 270,  color: '#3b82f6' },
  { id: 'mk4', label: 'Mk.4', capacity: 480,  color: '#f59e0b' },
  { id: 'mk5', label: 'Mk.5', capacity: 780,  color: '#ec4899' },
  { id: 'mk6', label: 'Mk.6', capacity: 1200, color: '#a855f7' },
];

export function getBeltTier(tierId: string): BeltTier {
  return BELT_TIERS.find((t) => t.id === tierId) ?? BELT_TIERS[0];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BeltInspectorProps {
  belt: SandboxBelt;
  machines: SandboxMachine[];
  stats: FactoryStats;
  dispatch: React.Dispatch<SandboxAction>;
}

export function BeltInspector({ belt, machines, stats, dispatch }: BeltInspectorProps) {
  const tier = getBeltTier(belt.tier);
  const load = stats.beltLoads[belt.beltId];

  const fromMachine = machines.find((m) => m.instanceId === belt.from.machineInstanceId);
  const toMachine   = machines.find((m) => m.instanceId === belt.to.machineInstanceId);

  const fromName = fromMachine ? (machineData[fromMachine.machineId]?.name ?? fromMachine.machineId) : '(deleted)';
  const toName   = toMachine   ? (machineData[toMachine.machineId]?.name   ?? toMachine.machineId)   : '(deleted)';

  const handleTierChange = useCallback(
    (tierId: string) => {
      dispatch({ type: 'SET_BELT_TIER', beltId: belt.beltId, tier: tierId });
    },
    [dispatch, belt.beltId]
  );

  const handleDelete = useCallback(
    () => dispatch({ type: 'DELETE_BELT', beltId: belt.beltId }),
    [dispatch, belt.beltId]
  );

  const saturationPct = load ? Math.min(100, (load.actualLoad / tier.capacity) * 100) : 0;
  const satColor =
    saturationPct >= 100 ? '#ef4444' :
    saturationPct >= 80  ? '#f59e0b' :
    '#22c55e';

  return (
    <div className="machine-inspector belt-inspector">
      {/* Header */}
      <div className="inspector-header" style={{ borderColor: tier.color + '44' }}>
        <div className="inspector-machine-icon" style={{ background: tier.color + '18', borderColor: tier.color + '44' }}>
          <BeltTierIcon tier={tier} />
        </div>
        <div className="inspector-machine-title">
          <div className="inspector-machine-name">Conveyor Belt</div>
          <div className="inspector-machine-sub" style={{ color: tier.color }}>
            {tier.label} · {tier.capacity}/min max
          </div>
        </div>
        <div className="inspector-actions">
          <button
            className="inspector-icon-btn inspector-delete-btn"
            onClick={handleDelete}
            title="Delete belt"
            aria-label="Delete belt"
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

      {/* Tier Selector */}
      <div className="inspector-section">
        <div className="inspector-label">BELT TIER</div>
        <div className="belt-tier-grid">
          {BELT_TIERS.map((t) => (
            <button
              key={t.id}
              id={`belt-tier-${t.id}`}
              className={`belt-tier-btn ${belt.tier === t.id ? 'is-active' : ''}`}
              onClick={() => handleTierChange(t.id)}
              style={{
                borderColor: belt.tier === t.id ? t.color : undefined,
                color: belt.tier === t.id ? t.color : undefined,
                background: belt.tier === t.id ? t.color + '15' : undefined,
              }}
              title={`${t.label}: ${t.capacity}/min`}
            >
              <span className="belt-tier-label">{t.label}</span>
              <span className="belt-tier-cap">{t.capacity >= 1000 ? `${t.capacity / 1000}k` : t.capacity}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Load Bar */}
      <div className="inspector-section">
        <div className="inspector-label-row">
          <label className="inspector-label">THROUGHPUT</label>
          <span className="inspector-value" style={{ color: satColor }}>
            {saturationPct.toFixed(0)}%
          </span>
        </div>
        <div className="belt-load-track">
          <div
            className="belt-load-fill"
            style={{
              width: `${saturationPct}%`,
              background: satColor,
              boxShadow: `0 0 8px ${satColor}55`,
            }}
          />
        </div>
        <div className="belt-load-values">
          <span style={{ color: satColor }}>
            {load ? load.actualLoad.toFixed(1) : '—'} / {tier.capacity} /min
          </span>
          {load && (
            <span className="belt-load-status" style={{ color: satColor }}>
              {load.saturation === 'full' ? '⚠ SATURATED' :
               load.saturation === 'warn' ? '⚠ HIGH' : '✓ OK'}
            </span>
          )}
        </div>
      </div>

      {/* Routing info */}
      <div className="inspector-section">
        <div className="inspector-label">ROUTING</div>
        <div className="belt-routing">
          <div className="belt-route-row">
            <span className="belt-route-icon belt-route-from">▶</span>
            <div className="belt-route-info">
              <span className="belt-route-machine">{fromName}</span>
              <span className="belt-route-port">port: {belt.from.portId}</span>
            </div>
          </div>
          <div className="belt-route-arrow">↓</div>
          <div className="belt-route-row">
            <span className="belt-route-icon belt-route-to">◼</span>
            <div className="belt-route-info">
              <span className="belt-route-machine">{toName}</span>
              <span className="belt-route-port">port: {belt.to.portId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade suggestion */}
      {load?.saturation === 'full' && belt.tier !== 'mk6' && (
        <div className="inspector-section belt-upgrade-hint">
          <div className="belt-upgrade-msg">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Belt is at capacity. Upgrade to increase throughput.
          </div>
          <button
            className="belt-upgrade-btn"
            onClick={() => {
              const idx = BELT_TIERS.findIndex((t) => t.id === belt.tier);
              if (idx < BELT_TIERS.length - 1) handleTierChange(BELT_TIERS[idx + 1].id);
            }}
          >
            Upgrade to {BELT_TIERS[(BELT_TIERS.findIndex((t) => t.id === belt.tier) + 1)]?.label ?? '?'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Belt tier icon SVG ───────────────────────────────────────────────────────

function BeltTierIcon({ tier }: { tier: BeltTier }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={tier.color} strokeWidth="2">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

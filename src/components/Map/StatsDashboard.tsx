/**
 * StatsDashboard.tsx
 * Full statistics sidebar panel — matches the right-side panel from satisfactory-calculator.com.
 *
 * Sections:
 *  1. Header   — save name + clear button
 *  2. Overview — quick stat chips (buildings, belts, pipes, power lines)
 *  3. Buildings — icon grid with count per category (clickable to filter map)
 *  4. Power Grid — production vs consumption with efficiency bar
 *  5. Parse metadata
 */
import React, { useMemo, useState } from 'react';
import type { ParsedSave } from '../../types/save';
import {
  classifyBuilding,
  BuildingCategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  BUILDING_CATEGORIES,
} from '../../engine/buildingClassifier';

interface StatsDashboardProps {
  save: ParsedSave;
  onClear: () => void;
  /** Callback to highlight a category on the map */
  onCategoryFocus?: (cat: BuildingCategory | null) => void;
}

// ── Category emoji map ────────────────────────────────────────────────────────
const CAT_EMOJI: Record<BuildingCategory, string> = {
  extraction: '⛏️',
  smelting:   '🔥',
  production: '⚙️',
  power:      '⚡',
  storage:    '📦',
  logistics:  '🔀',
  special:    '🚀',
  unknown:    '❓',
};

// ── Power bar component ───────────────────────────────────────────────────────
function PowerBar({ produced, consumed }: { produced: number; consumed: number }) {
  const hasData = produced > 0 || consumed > 0;
  if (!hasData) return (
    <div className="sdb-power-empty">No generator data in save</div>
  );

  const pct = consumed > 0 ? Math.min((consumed / produced) * 100, 100) : 0;
  const surplus = produced - consumed;
  const efficient = pct < 80;
  const critical = pct > 95;

  return (
    <div className="sdb-power-body">
      <div className="sdb-power-row">
        <span className="sdb-power-label">⚡ Production</span>
        <span className="sdb-power-val sdb-power-prod">{produced.toLocaleString()} MW</span>
      </div>
      <div className="sdb-power-row">
        <span className="sdb-power-label">🔌 Consumption</span>
        <span className="sdb-power-val sdb-power-cons">{consumed.toLocaleString()} MW</span>
      </div>

      {/* Load bar */}
      <div className="sdb-power-bar-wrap">
        <div
          className={`sdb-power-bar ${critical ? 'sdb-power-bar--crit' : efficient ? 'sdb-power-bar--ok' : 'sdb-power-bar--warn'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="sdb-power-footer">
        <span className="sdb-power-load">{pct.toFixed(1)}% load</span>
        <span className={`sdb-power-surplus ${surplus >= 0 ? 'pos' : 'neg'}`}>
          {surplus >= 0 ? '+' : ''}{surplus.toLocaleString()} MW
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function StatsDashboard({ save, onClear, onCategoryFocus }: StatsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'power'>('stats');
  const [focusedCat, setFocusedCat] = useState<BuildingCategory | null>(null);

  // Count buildings per category
  const byCat = useMemo(() => {
    const counts: Partial<Record<BuildingCategory, number>> = {};
    for (const b of save.buildings) {
      const info = classifyBuilding(b.typePath);
      counts[info.category] = (counts[info.category] ?? 0) + 1;
    }
    return counts;
  }, [save.buildings]);

  const handleCatClick = (cat: BuildingCategory) => {
    const next = focusedCat === cat ? null : cat;
    setFocusedCat(next);
    onCategoryFocus?.(next);
  };

  const { totalProduction, totalConsumption, batteryCount, generatorCount } = save.powerData;

  return (
    <div className="sdb-root">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="sdb-header">
        <div className="sdb-header-left">
          <span className="sdb-header-icon">📊</span>
          <div className="sdb-header-text">
            <span className="sdb-save-name" title={save.saveName}>{save.saveName}</span>
            <span className="sdb-parse-time">Parsed {new Date(save.parsedAt).toLocaleTimeString()}</span>
          </div>
        </div>
        <button className="sdb-clear-btn" onClick={onClear} title="Load different save">✕</button>
      </div>

      {/* ── Quick stat chips ────────────────────────────────────── */}
      <div className="sdb-chips">
        <div className="sdb-chip">
          <span className="sdb-chip-val">{save.buildings.length.toLocaleString()}</span>
          <span className="sdb-chip-label">Buildings</span>
        </div>
        <div className="sdb-chip">
          <span className="sdb-chip-val">{save.conveyors.length.toLocaleString()}</span>
          <span className="sdb-chip-label">Belts</span>
        </div>
        <div className="sdb-chip">
          <span className="sdb-chip-val">{save.pipes.length.toLocaleString()}</span>
          <span className="sdb-chip-label">Pipes</span>
        </div>
        <div className="sdb-chip">
          <span className="sdb-chip-val">{generatorCount.toLocaleString()}</span>
          <span className="sdb-chip-label">Generators</span>
        </div>
      </div>

      {/* ── Tab switcher ────────────────────────────────────────── */}
      <div className="sdb-tabs">
        <button
          className={`sdb-tab ${activeTab === 'stats' ? 'sdb-tab--active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >📋 Structures</button>
        <button
          className={`sdb-tab ${activeTab === 'power' ? 'sdb-tab--active' : ''}`}
          onClick={() => setActiveTab('power')}
        >⚡ Power</button>
      </div>

      {/* ── Structures tab ──────────────────────────────────────── */}
      {activeTab === 'stats' && (
        <div className="sdb-body">
          <div className="sdb-section-title">Buildings by Category</div>
          <div className="sdb-cat-grid">
            {BUILDING_CATEGORIES.filter(c => c !== 'unknown').map(cat => {
              const count = byCat[cat] ?? 0;
              const isActive = focusedCat === cat;
              return (
                <button
                  key={cat}
                  className={`sdb-cat-btn ${isActive ? 'sdb-cat-btn--active' : ''} ${count === 0 ? 'sdb-cat-btn--empty' : ''}`}
                  onClick={() => handleCatClick(cat)}
                  title={`${CATEGORY_LABELS[cat]} — ${count} buildings`}
                  style={{ '--cat-color': CATEGORY_COLORS[cat] } as React.CSSProperties}
                >
                  <span className="sdb-cat-emoji">{CAT_EMOJI[cat]}</span>
                  <span className="sdb-cat-count">{count}</span>
                  <span className="sdb-cat-label">{CATEGORY_LABELS[cat]}</span>
                </button>
              );
            })}
          </div>

          {/* Players section */}
          <div className="sdb-section-title" style={{ marginTop: '12px' }}>Pioneers</div>
          <div className="sdb-players">
            {save.players.map((p, i) => (
              <div key={i} className="sdb-player">
                <span className="sdb-player-icon">🧑‍🚀</span>
                <div className="sdb-player-info">
                  <span className="sdb-player-name">{p.name}</span>
                  <span className="sdb-player-pos">
                    {Math.round(p.position.x / 100)}m, {Math.round(p.position.y / 100)}m, {Math.round(p.position.z / 100)}m
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Power tab ───────────────────────────────────────────── */}
      {activeTab === 'power' && (
        <div className="sdb-body">
          <div className="sdb-section-title">Power Grid</div>
          <div className="sdb-power-body">
            {totalProduction === 0 && totalConsumption === 0 ? (
              <div className="sdb-power-empty">No power data found in save</div>
            ) : (
              <>
                <div className="sdb-power-row">
                  <span className="sdb-power-label">⚡ Production</span>
                  <span className="sdb-power-val sdb-power-prod">{totalProduction.toLocaleString()} MW</span>
                </div>
                <div className="sdb-power-row">
                  <span className="sdb-power-label">🔌 Consumption</span>
                  <span className="sdb-power-val sdb-power-cons">{totalConsumption.toLocaleString()} MW</span>
                </div>

                {totalProduction > 0 && (
                  <>
                    <div className="sdb-power-bar-wrap">
                      {(() => {
                        const pct = Math.min((totalConsumption / totalProduction) * 100, 100);
                        const isCrit = pct > 95;
                        const isWarn = pct > 80;
                        return (
                          <div
                            className={`sdb-power-bar ${isCrit ? 'sdb-power-bar--crit' : isWarn ? 'sdb-power-bar--warn' : 'sdb-power-bar--ok'}`}
                            style={{ width: `${pct}%` }}
                          />
                        );
                      })()}
                    </div>
                    <div className="sdb-power-footer">
                      <span className="sdb-power-load">
                        {((totalConsumption / totalProduction) * 100).toFixed(1)}% load
                      </span>
                      <span className={`sdb-power-surplus ${totalProduction >= totalConsumption ? 'pos' : 'neg'}`}>
                        {totalProduction - totalConsumption >= 0 ? '+' : ''}
                        {(totalProduction - totalConsumption).toLocaleString()} MW
                      </span>
                    </div>
                  </>
                )}

                <div className="sdb-power-chips">
                  <div className="sdb-power-chip">
                    <span className="sdb-power-chip-val">{generatorCount}</span>
                    <span className="sdb-power-chip-label">Generators</span>
                  </div>
                  <div className="sdb-power-chip">
                    <span className="sdb-power-chip-val">{batteryCount}</span>
                    <span className="sdb-power-chip-label">Batteries</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

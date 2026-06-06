/**
 * ResourceNodeSidebar.tsx
 * Sidebar for the World Map tab — shows all resource types with per-purity
 * circular icon toggle buttons inspired by the Satisfactory Calculator map.
 *
 * Each circular button independently toggles that resource+purity combination
 * on the map. Multiple resources and purities can be active at the same time.
 */
import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type Purity = 'Impure' | 'Normal' | 'Pure';

export interface ResourceCounts {
  [resource: string]: {
    Impure: number;
    Normal: number;
    Pure: number;
  };
}

interface ResourceNodeSidebarProps {
  counts: ResourceCounts;
  activeFilters: Map<string, Set<string>>;
  onToggle: (resource: string, purity: Purity) => void;
  onClearAll: () => void;
  onSelectAll: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PURITY_COLORS: Record<Purity, string> = {
  Impure: '#dc2626',
  Normal: '#f97316',
  Pure:   '#22c55e',
};

const PURITY_LABEL: Record<Purity, string> = {
  Impure: 'I',
  Normal: 'N',
  Pure:   'P',
};

// Map resource display name → image filename key
const RESOURCE_IMAGE_KEY: Record<string, string> = {
  'Iron Ore':     'iron_ore',
  'Copper Ore':   'copper_ore',
  'Limestone':    'limestone',
  'Coal':         'coal',
  'Crude Oil':    'crude_oil',
  'Sulfur':       'sulfur',
  'Bauxite':      'bauxite',
  'Raw Quartz':   'raw_quartz',
  'Uranium':      'uranium',
  'SAM Ore':      'sam',
  'Nitrogen Gas': 'nitrogen_gas',
  'Water':        'water',
  'Caterium Ore': 'caterium_ore',
  'Geyser':       '',              // no image — handled with emoji fallback
};

const PURITIES: Purity[] = ['Impure', 'Normal', 'Pure'];

// ─── Sub-component: one circular purity toggle ────────────────────────────────
function PurityButton({
  resource,
  purity,
  count,
  active,
  onToggle,
}: {
  resource: string;
  purity: Purity;
  count: number;
  active: boolean;
  onToggle: () => void;
}) {
  const color   = PURITY_COLORS[purity];
  const imgKey  = RESOURCE_IMAGE_KEY[resource] ?? '';
  const imgSrc  = imgKey ? `/images/${imgKey}.png` : '';

  return (
    <button
      className={`rn-purity-btn ${active ? 'active' : 'inactive'}`}
      style={{ '--ring-color': color } as React.CSSProperties}
      onClick={onToggle}
      title={`${resource} — ${purity} (${count} nodes)`}
      aria-pressed={active}
      disabled={count === 0}
    >
      {/* Inner circle with image */}
      <span className="rn-btn-inner">
        {imgSrc ? (
          <img src={imgSrc} alt={resource} className="rn-btn-img" draggable={false} />
        ) : (
          <span className="rn-btn-emoji">♨️</span>
        )}
      </span>

      {/* Count badge */}
      {count > 0 && (
        <span className="rn-badge">{count}</span>
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ResourceNodeSidebar({
  counts,
  activeFilters,
  onToggle,
  onClearAll,
  onSelectAll,
}: ResourceNodeSidebarProps) {
  // Sort resources by total node count descending
  const sortedResources = Object.entries(counts).sort(([, a], [, b]) => {
    const totalA = a.Impure + a.Normal + a.Pure;
    const totalB = b.Impure + b.Normal + b.Pure;
    return totalB - totalA;
  });

  const hasAnyActive = activeFilters.size > 0;

  return (
    <aside className="rn-sidebar">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="rn-sidebar-header">
        <span className="rn-sidebar-title">
          <span className="rn-sidebar-icon"><img src='/icons/map-icon.png' alt="map" className="rn-btn-img" draggable={false} /></span>
          Resource Nodes
        </span>
        <div className="rn-sidebar-actions">
          <button
            className="rn-action-btn rn-action-all"
            onClick={onSelectAll}
            title="Select all resources (all purities)"
          >
            All
          </button>
          <button
            className={`rn-action-btn rn-action-clear ${!hasAnyActive ? 'disabled' : ''}`}
            onClick={onClearAll}
            title="Clear all selections"
            disabled={!hasAnyActive}
          >
            Clear
          </button>
        </div>
      </div>

      {/* ── Column headers ──────────────────────────────── */}
      <div className="rn-col-headers">
        <span className="rn-col-resource-label">Resource</span>
        <span className="rn-col-purity-labels">
          {PURITIES.map(p => (
            <span
              key={p}
              className="rn-col-purity-label"
              style={{ color: PURITY_COLORS[p] }}
            >
              {PURITY_LABEL[p]}
            </span>
          ))}
        </span>
      </div>

      {/* ── Resource rows ───────────────────────────────── */}
      <div className="rn-resource-list">
        {sortedResources.map(([resource, purityCounts]) => {
          const activeSet = activeFilters.get(resource);
          const total = purityCounts.Impure + purityCounts.Normal + purityCounts.Pure;

          return (
            <div key={resource} className="rn-resource-row">
              {/* Resource name + total */}
              <div className="rn-resource-name-col">
                <span className="rn-resource-name">{resource}</span>
                <span className="rn-resource-total">{total}</span>
              </div>

              {/* Three purity circles */}
              <div className="rn-purity-btns">
                {PURITIES.map(purity => (
                  <React.Fragment key={purity}>
                    <PurityButton
                      resource={resource}
                      purity={purity}
                      count={purityCounts[purity]}
                      active={activeSet?.has(purity) ?? false}
                      onToggle={() => onToggle(resource, purity)}
                    />
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Legend ──────────────────────────────────────── */}
      <div className="rn-legend">
        {PURITIES.map(p => (
          <span key={p} className="rn-legend-item">
            <span className="rn-legend-dot" style={{ background: PURITY_COLORS[p] }} />
            {p}
          </span>
        ))}
      </div>
    </aside>
  );
}

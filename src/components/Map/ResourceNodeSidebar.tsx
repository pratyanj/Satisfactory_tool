/**
 * ResourceNodeSidebar.tsx — Repurposed as World Map Sidebar
 *
 * Implements top tab panel (Map layers, Resource nodes, Resource wells)
 * and bottom tab panel (Power Slugs, Artifacts, Collectibles).
 */
import React, { useState, useEffect } from 'react';
import type { ParsedSave } from '../../types/save';
import type { ParseProgress } from '../../engine/saveParser';
import { LayerControls, LayerState } from './LayerControls';
import { collectibleImg } from './CollectibleLayer';

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
  // Save uploads
  save: ParsedSave | null;
  progress: ParseProgress | null;
  error: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSave: () => void;
  onOpenPicker: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;

  // Layer switches
  layers: LayerState;
  onLayersChange: (layers: LayerState) => void;

  // Resource nodes / wells lists
  nodeCounts: ResourceCounts;
  wellCounts: ResourceCounts;
  activeFilters: Map<string, Set<string>>;
  onToggle: (resource: string, purity: Purity, type: string) => void;
  onTogglePurityAll: (purity: Purity) => void;
  onShowPurityOnly: (purity: Purity) => void;
  onClearAll: () => void;

  // Collectibles set
  activeCollectibles: Set<string>;
  onToggleCollectible: (type: string) => void;
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
  'Geyser':       '',
};

const PURITIES: Purity[] = ['Impure', 'Normal', 'Pure'];

const COLLECTIBLE_COUNTS: Record<string, number> = {
  blue_slug: 596,
  yellow_slug: 389,
  purple_slug: 257,
  mercer_sphere: 298,
  somersloop: 106,
  hard_drive: 118,
  paleberry: 2154,
  beryl_nut: 1515,
  bacon_agaric: 1615,
};

// ─── Sub-component: Purity Circle Button ──────────────────────────────────────
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
  const label   = PURITY_LABEL[purity];

  return (
    <button
      className={`rn-purity-btn ${active ? 'active' : 'inactive'}`}
      style={{ '--ring-color': color } as React.CSSProperties}
      onClick={onToggle}
      title={`${resource} — ${purity} (${count} nodes)`}
      aria-pressed={active}
      disabled={count === 0}
    >
      <span className="rn-btn-inner">
        <span className="rn-btn-text" style={{ color: active ? '#fff' : color }}>
          {label}
        </span>
      </span>
      {count > 0 && <span className="rn-badge">{count}</span>}
    </button>
  );
}

// ─── Sub-component: Collectible Circle Button ─────────────────────────────────
function CollectibleButton({
  type,
  label,
  count,
  active,
  onToggle,
}: {
  type: string;
  label: string;
  count: number;
  active: boolean;
  onToggle: () => void;
}) {
  const emojis: Record<string, string> = {
    blue_slug: '🐌',
    yellow_slug: '🐌',
    purple_slug: '🐌',
    mercer_sphere: '🔮',
    somersloop: '🌀',
    hard_drive: '💾',
    paleberry: '🍓',
    beryl_nut: '🌰',
    bacon_agaric: '🍄',
  };
  const colors: Record<string, string> = {
    blue_slug: '#3b82f6',
    yellow_slug: '#f59e0b',
    purple_slug: '#a78bfa',
    mercer_sphere: '#f43f5e',
    somersloop: '#f48721',
    hard_drive: '#f48721',
    paleberry: '#ef4444',
    beryl_nut: '#d97706',
    bacon_agaric: '#ec4899',
  };

  const color = colors[type] || '#6b7280';
  const emoji = emojis[type] || '❓';
  const imgSrc = collectibleImg(type);

  return (
    <button
      className={`rn-purity-btn ${active ? 'active' : 'inactive'}`}
      style={{ '--ring-color': color } as React.CSSProperties}
      onClick={onToggle}
      title={`${label} (${count} locations)`}
      aria-pressed={active}
      disabled={count === 0}
    >
      <span className="rn-btn-inner">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={label}
            className="rn-btn-img"
            draggable={false}
            style={{ width: 20, height: 20, objectFit: 'contain' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span className="rn-btn-emoji" style={{ fontSize: '15px' }}>{emoji}</span>
        )}
      </span>
      {count > 0 && <span className="rn-badge">{count}</span>}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ResourceNodeSidebar({
  save,
  progress,
  error,
  onFileChange,
  onClearSave,
  onOpenPicker,
  fileInputRef,
  layers,
  onLayersChange,
  nodeCounts,
  wellCounts,
  activeFilters,
  onToggle,
  onTogglePurityAll,
  onShowPurityOnly,
  onClearAll,
  activeCollectibles,
  onToggleCollectible,
}: ResourceNodeSidebarProps) {
  // Navigation Tabs
  const [topTab, setTopTab] = useState<'layers' | 'nodes' | 'wells'>('nodes');
  const [bottomTab, setBottomTab] = useState<'slugs' | 'artifacts' | 'collectibles'>('slugs');

  useEffect(() => {
    if (!save && topTab === 'layers') {
      setTopTab('nodes');
    }
  }, [save, topTab]);

  // Sort resources by total node count descending
  const getSortedResources = (counts: ResourceCounts) => {
    return Object.entries(counts).sort(([, a], [, b]) => {
      const totalA = a.Impure + a.Normal + a.Pure;
      const totalB = b.Impure + b.Normal + b.Pure;
      return totalB - totalA;
    });
  };

  const sortedNodes = getSortedResources(nodeCounts);
  const sortedWells = getSortedResources(wellCounts);

  const pct = progress ? Math.round(progress.progress * 100) : 0;

  return (
    <aside className="rn-sidebar">
      <input
        ref={fileInputRef}
        type="file"
        accept=".sav"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
      {/* ── Top Tabs Bar ─────────────────────────────────── */}
      <div className="wmt-tab-bar">
        {save && (
          <button
            className={`wmt-tab-btn ${topTab === 'layers' ? 'active' : ''}`}
            onClick={() => setTopTab('layers')}
          >
            Map layers
          </button>
        )}
        <button
          className={`wmt-tab-btn ${topTab === 'nodes' ? 'active' : ''}`}
          onClick={() => setTopTab('nodes')}
        >
          Resource nodes
        </button>
        <button
          className={`wmt-tab-btn ${topTab === 'wells' ? 'active' : ''}`}
          onClick={() => setTopTab('wells')}
        >
          Resource wells
        </button>
      </div>

      {/* ── Top Panel View ───────────────────────────────── */}
      <div className="wmt-panel-content">
        {topTab === 'layers' && save && (
          <div className="wmt-side-top" style={{ borderBottom: 'none', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <div className="wmt-save-card">
              <div className="wmt-save-head">
                <span className="wmt-save-name" title={save.saveName}>💾 {save.saveName}</span>
                <button className="wmt-save-clear" title="Clear save" onClick={onClearSave}>✕</button>
              </div>
              <div className="wmt-save-stats">
                <span>{save.buildings.length.toLocaleString()} buildings</span>
                <span>{save.conveyors.length.toLocaleString()} belts</span>
                <span>{save.pipes.length.toLocaleString()} pipes</span>
                <span>{save.powerLines.length.toLocaleString()} power</span>
              </div>
              <div className="wmt-save-actions" style={{ marginTop: '8px' }}>
                <button onClick={onOpenPicker}>Load different</button>
              </div>
            </div>

            {progress && (
              <div className="wmt-progress" style={{ marginTop: '8px' }}>
                <div className="wmt-progress-msg">{progress.message}</div>
                <div className="wmt-progress-track">
                  <div className="wmt-progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            {error && <div className="wmt-save-error" style={{ marginTop: '8px' }}>⚠ {error}</div>}

            <div className="wmt-layers-panel" style={{ marginTop: '8px', border: 'none', boxShadow: 'none' }}>
              <LayerControls
                layers={layers}
                onChange={onLayersChange}
                buildingCount={save?.buildings?.length ?? 0}
                conveyorCount={save?.conveyors?.length ?? 0}
                pipeCount={save?.pipes?.length ?? 0}
                powerLineCount={save?.powerLines?.length ?? 0}
              />
            </div>
          </div>
        )}

        {(topTab === 'nodes' || topTab === 'wells') && (
          <div className="wmt-nodes-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* Save uploader on resource nodes tab if not loaded */}
            {topTab === 'nodes' && !save && (
              <div className="wmt-inline-loader" style={{ padding: '12px', borderBottom: '1px solid #1c1e26', flexShrink: 0 }}>
                <button className="wmt-load-btn" onClick={onOpenPicker} disabled={!!progress}>
                  📁 Load Save&nbsp;(.sav)
                </button>
                {progress && (
                  <div className="wmt-progress" style={{ marginTop: '8px' }}>
                    <div className="wmt-progress-msg">{progress.message}</div>
                    <div className="wmt-progress-track">
                      <div className="wmt-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
                {error && <div className="wmt-save-error" style={{ marginTop: '8px' }}>⚠ {error}</div>}
              </div>
            )}

            {/* Bulk Actions */}
            <div className="wmt-bulk-actions">
              <button className="wmt-bulk-btn wmt-bulk-unselect" onClick={onClearAll}>
                UNSELECT ALL LAYERS
              </button>
              <div className="wmt-bulk-row">
                <button className="wmt-bulk-btn" onClick={() => onShowPurityOnly('Impure')}>SHOW IMPURE</button>
                <button className="wmt-bulk-btn" onClick={() => onShowPurityOnly('Normal')}>SHOW NORMAL</button>
                <button className="wmt-bulk-btn" onClick={() => onShowPurityOnly('Pure')}>SHOW PURE</button>
              </div>
              <div className="wmt-bulk-row">
                <button className="wmt-bulk-btn" onClick={() => onTogglePurityAll('Impure')}>TOGGLE IMPURE</button>
                <button className="wmt-bulk-btn" onClick={() => onTogglePurityAll('Normal')}>TOGGLE NORMAL</button>
                <button className="wmt-bulk-btn" onClick={() => onTogglePurityAll('Pure')}>TOGGLE PURE</button>
              </div>
            </div>

            {/* Column Headers */}
            <div className="rn-col-headers">
              <span className="rn-col-resource-label">Resource</span>
              <span className="rn-col-purity-labels">
                {PURITIES.map(p => {
                  const resources = topTab === 'nodes' ? Object.keys(nodeCounts) : Object.keys(wellCounts).map(k => `${k} (Well)`);
                  const isAllActive = resources.length > 0 && resources.every(res => {
                    const activeSet = activeFilters.get(res);
                    return activeSet?.has(p) ?? false;
                  });

                  return (
                    <button
                      key={p}
                      className={`rn-col-purity-header-btn ${isAllActive ? 'is-active' : ''}`}
                      style={{ '--purity-color': PURITY_COLORS[p] } as React.CSSProperties}
                      onClick={() => onTogglePurityAll(p)}
                      title={`Toggle all ${p} ${topTab}`}
                    >
                      {PURITY_LABEL[p]}
                    </button>
                  );
                })}
              </span>
            </div>

            {/* List */}
            <div className="rn-resource-list">
              {(topTab === 'nodes' ? sortedNodes : sortedWells).map(([resource, purityCounts]) => {
                const mapKey = topTab === 'wells' ? `${resource} (Well)` : resource;
                const activeSet = activeFilters.get(mapKey);
                const total = purityCounts.Impure + purityCounts.Normal + purityCounts.Pure;
                const nodeType = topTab === 'wells' ? 'well' : 'node';

                const imgKey  = RESOURCE_IMAGE_KEY[resource] ?? '';
                const imgSrc  = imgKey ? `/images/${imgKey}.png` : '';

                return (
                  <div key={resource} className="rn-resource-row">
                    <div className="rn-resource-icon-col">
                      {imgSrc ? (
                        <img src={imgSrc} alt={resource} className="rn-row-img" draggable={false} />
                      ) : (
                        <span className="rn-row-emoji">♨️</span>
                      )}
                    </div>

                    <div className="rn-resource-name-col">
                      <span className="rn-resource-name">{resource}</span>
                      <span className="rn-resource-total-badge">{total}</span>
                    </div>

                    <div className="rn-purity-btns">
                      {PURITIES.map(purity => (
                        <React.Fragment key={purity}>
                          <PurityButton
                            resource={resource}
                            purity={purity}
                            count={purityCounts[purity]}
                            active={activeSet?.has(purity) ?? false}
                            onToggle={() => onToggle(resource, purity, nodeType)}
                          />
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Panel (Slugs, Artifacts, Collectibles) ─────────────────── */}
      <div className="wmt-bottom-collectibles">
        <div className="wmt-tab-bar wmt-bottom-tab-bar">
          <button
            className={`wmt-tab-btn ${bottomTab === 'slugs' ? 'active' : ''}`}
            onClick={() => setBottomTab('slugs')}
          >
            Power Slugs
          </button>
          <button
            className={`wmt-tab-btn ${bottomTab === 'artifacts' ? 'active' : ''}`}
            onClick={() => setBottomTab('artifacts')}
          >
            Artifacts
          </button>
          <button
            className={`wmt-tab-btn ${bottomTab === 'collectibles' ? 'active' : ''}`}
            onClick={() => setBottomTab('collectibles')}
          >
            Collectibles
          </button>
        </div>

        <div className="wmt-bottom-panel-content">
          {bottomTab === 'slugs' && (
            <div className="wmt-collectible-row">
              <span className="wmt-collectible-row-label">POWER SLUGS</span>
              <div className="rn-purity-btns">
                <CollectibleButton
                  type="blue_slug"
                  label="Blue Power Slug"
                  count={COLLECTIBLE_COUNTS.blue_slug}
                  active={activeCollectibles.has('blue_slug')}
                  onToggle={() => onToggleCollectible('blue_slug')}
                />
                <CollectibleButton
                  type="yellow_slug"
                  label="Yellow Power Slug"
                  count={COLLECTIBLE_COUNTS.yellow_slug}
                  active={activeCollectibles.has('yellow_slug')}
                  onToggle={() => onToggleCollectible('yellow_slug')}
                />
                <CollectibleButton
                  type="purple_slug"
                  label="Purple Power Slug"
                  count={COLLECTIBLE_COUNTS.purple_slug}
                  active={activeCollectibles.has('purple_slug')}
                  onToggle={() => onToggleCollectible('purple_slug')}
                />
              </div>
            </div>
          )}

          {bottomTab === 'artifacts' && (
            <div className="wmt-collectible-row">
              <span className="wmt-collectible-row-label">ARTIFACTS</span>
              <div className="rn-purity-btns">
                <CollectibleButton
                  type="mercer_sphere"
                  label="Mercer Sphere"
                  count={COLLECTIBLE_COUNTS.mercer_sphere}
                  active={activeCollectibles.has('mercer_sphere')}
                  onToggle={() => onToggleCollectible('mercer_sphere')}
                />
                <CollectibleButton
                  type="somersloop"
                  label="Somersloop"
                  count={COLLECTIBLE_COUNTS.somersloop}
                  active={activeCollectibles.has('somersloop')}
                  onToggle={() => onToggleCollectible('somersloop')}
                />
              </div>
            </div>
          )}

          {bottomTab === 'collectibles' && (
            <div className="wmt-collectible-stack">
              <div className="wmt-collectible-row">
                <span className="wmt-collectible-row-label">DROP-PODS</span>
                <div className="rn-purity-btns">
                  <CollectibleButton
                    type="hard_drive"
                    label="Hard Drive"
                    count={COLLECTIBLE_COUNTS.hard_drive}
                    active={activeCollectibles.has('hard_drive')}
                    onToggle={() => onToggleCollectible('hard_drive')}
                  />
                </div>
              </div>
              <div className="wmt-collectible-row" style={{ marginTop: '4px' }}>
                <span className="wmt-collectible-row-label">CONSUMABLE</span>
                <div className="rn-purity-btns">
                  <CollectibleButton
                    type="paleberry"
                    label="Paleberry"
                    count={COLLECTIBLE_COUNTS.paleberry}
                    active={activeCollectibles.has('paleberry')}
                    onToggle={() => onToggleCollectible('paleberry')}
                  />
                  <CollectibleButton
                    type="beryl_nut"
                    label="Beryl Nut"
                    count={COLLECTIBLE_COUNTS.beryl_nut}
                    active={activeCollectibles.has('beryl_nut')}
                    onToggle={() => onToggleCollectible('beryl_nut')}
                  />
                  <CollectibleButton
                    type="bacon_agaric"
                    label="Bacon Agaric"
                    count={COLLECTIBLE_COUNTS.bacon_agaric}
                    active={activeCollectibles.has('bacon_agaric')}
                    onToggle={() => onToggleCollectible('bacon_agaric')}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
